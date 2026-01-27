import { Boom } from '@hapi/boom';
import { Octokit } from "@octokit/rest";
import mongoUriBuilder from 'mongo-uri-builder';
import { MongoClient } from 'mongodb';
import assert from 'node:assert';
import semver from 'semver';

import config from '../config.mjs';
import { formatTime } from '../fn/formatTime.mjs';
import copyReportToS3 from '../s3.mjs';
import notifySlack from '../slack.mjs';
import trigger from '../trigger.mjs';

export default async function initCd(server) {
    const octokit = new Octokit({
        auth: config.github.token
    });
    const client = new MongoClient(mongoUriBuilder(config.mongodb));
    await client.connect();
    server.app.db = client.db(config.mongodb.database);

    const requiredTestsPassed = (requiredTests, { tests }) => requiredTests.every(
        test => tests?.[test]?.totalAssertions > 0 && tests[test].totalAssertions === tests[test].totalPassedAssertions
    );
    const optionalTestsPresent = (optionalTests, { tests }) => optionalTests.every(
        test => tests?.[test]?.totalAssertions > 0
    );

    const releaseNotesFormat = (submodules, tests, version, iac, ansible) => `# Release notes

## Upgrade instructions

For each environment do the following:
1. Use the ArgoCD dashboard to verify for any unexpected pre-existing issues and handle them.
1. Edit the file \`custom-config/cluster-config.yaml\` and set:
   \`\`\`yaml
   ansible_collection_tag: ${ansible || ''}
   iac_terraform_modules_tag: ${iac || ''}
   \`\`\`
1. Commit the changes with a subject: \`refresh: iac ${iac || ''}\`, push and verify that the pipeline has passed.
1. Edit the file \`submodules.yaml\` and make sure the submodules listed below are updated to use the \`ref: ${version}\`.
1. Commit changes with subject: \`deploy: ${version}\`, push and verify that the pipeline has passed.
1. Use the ArgoCD dashboard to verify for any new issues and handle them.

> [!WARNING]
> Due to Terraform peculiarities some jobs may fail and a retry could fix that.

## Submodules

${Object.entries(submodules).filter(isNotIac).map(([name, { ref }]) => `* ${name.replace(/^https:\/\/github.com\/|.git$/g, '')} ${name.replace(/^https:\/\/github.com\/|.git$/g, '')}@${ref}`).join('\n')}

submodules.yaml

\`\`\`yaml
${Object.entries(submodules).filter(isNotIac).map(([name, { path }]) => `${path}:
  url: ${name}
  ref: ${version}`).join('\n')}
\`\`\`

## Tests

| Env  | Test | Pass | Fail | Duration |
| :--- | :--- | ---: | ---: | ---:     |
${Object.entries(tests).map(([env, tests]) => Object.entries(tests).map(([name, { totalPassedAssertions, totalAssertions, s3Url, duration }]) => `| ${env} | ${s3Url ? `[${name}](${s3Url})` : name} | ${totalPassedAssertions} | ${totalAssertions - totalPassedAssertions} | ${formatTime(duration)} |`)).flat().join('\n')}

`;

    const isNotIac = ([name]) => !['ansible_collection_tag', 'iac_terraform_modules_tag'].includes(name);
    const releaseExists = async (owner, repo, tag) => {
        try {
            const release = await octokit.repos.getReleaseByTag({
                owner,
                repo,
                tag
            });
            return release?.data?.url;
        } catch {
            return false;
        }
    };

    const deepEqual = (a, b) => {
        try {
            assert.deepStrictEqual(a, b);
            return true;
        } catch {
            return false;
        }
    };
    const cdSemverBump = async (request, revisions) => {
        const current = await request.server.app.db.collection('release').findOne({ _id: 'version' }) || { version: config.release.start };
        if (deepEqual(revisions, current?.revisions))
            return [false, `Revisions ${JSON.stringify(revisions)} match current version ${current.version}`];

        const newVersion = semver.inc(current?.version || config.release.start, 'prerelease', config.release.prerelease);

        if (!newVersion) throw new Boom('Cannot determine new version', { statusCode: 500 });

        console.log(`Bumping version to ${newVersion}`);
        return [newVersion];
    }

    const cdReleaseCreate = async (owner, repo, commit, tag, releaseName, body) => {
        console.log(`Creating release for ${owner}/${repo} with tag ${tag}`);
        try {
            if (await releaseExists(owner, repo, tag)) {
                console.error(`Release with tag ${tag} already exists.`);
                return;
            }

            const response = await octokit.repos.createRelease({
                owner,
                repo,
                tag_name: tag,
                target_commitish: commit,
                name: releaseName,
                body
            });

            if (repo === 'profile-cd') notifySlack(`🎉 Release created: ${response.data.html_url}`)
            console.log(`Release created: ${response.data.html_url}`);
        } catch (error) {
            console.error(`Error creating release: ${error.message}`);
        }
    };

    const cdRuleExecute = async (request, h) => {
        const submoduleProps = {};
        const revisions = {};
        const actions = {};
        const tests = {};
        let iac;
        let ansible;
        const response = {};
        for (const [env, { requiredTests = [], optionalTests = [] }] of Object.entries(config.rule.environments)) {
            const revision = await request.server.app.db.collection(`revision/${env}`).findOne({}, { sort: { $natural: -1 } });
            const envResponse = {};
            if (!revision || !requiredTestsPassed(requiredTests, revision))
                envResponse.requiredTests = `Required tests have not passed for environment ${env}`

            if (optionalTests && !optionalTestsPresent(optionalTests, revision))
                envResponse.optionalTests = `Optional tests are not all present for environment ${env}`

            if (!revision.submodules || !Object.keys(revision.submodules).length)
                envResponse.submodules = `No submodules info found for environment ${env}`

            if (revision.version)
                envResponse.version = `Release ${version} already created for environment ${env}`

            revisions[env] = revision._id;
            actions[env] = revision.actions || {};
            tests[env] = revision.tests || {};
            iac ||= revision.iac_terraform_modules_tag
            if (iac !== revision.iac_terraform_modules_tag)
                envResponse.iac = `IAC Terraform modules tag mismatch for environment ${env}, expected ${iac}, found ${revision.iac_terraform_modules_tag}`
            ansible ||= revision.ansible_collection_tag;
            if (ansible !== revision.ansible_collection_tag)
                envResponse.ansible = `Ansible collection tag mismatch for environment ${env}, expected ${ansible}, found ${revision.ansible_collection_tag}`

            const foundMismatch = Object.entries(revision.submodules || {}).find(([name, props]) => { // Check if submodule refs do not match
                if (!submoduleProps[name]) {
                    submoduleProps[name] = props;
                    return;
                } else if (submoduleProps[name].ref === props.ref) return;
                return true;
            })
            if (foundMismatch) envResponse.submodules = `Submodule refs do not match for environment ${env}, revision ${revision._id}, submodule ${foundMismatch[0]}`
            if (Object.keys(envResponse).length > 0) response[env] = envResponse;
        }
        const triggered = await trigger(request, { tests, revisions, actions });
        if (Object.keys(response).length > 0) {
            response.triggered = triggered;
            return h.response(response).code(202);
        }

        console.log('Submodule refs match', submoduleProps);
        const [version, versionResponse] = await cdSemverBump(request, revisions);
        if (!version) return h.response(versionResponse).code(202);
        for (const [envName, envTests] of Object.entries(tests)) {
            for (const [testName, test] of Object.entries(envTests)) {
                if (test?.report) test.s3Url = await copyReportToS3(`${version}/${envName}/${testName}`, test.report, config.report);
            }
        }
        const releaseNotes = releaseNotesFormat(submoduleProps, tests, `v${version}`, iac, ansible);
        await request.server.app.db.collection('release').updateOne({ _id: 'version' }, { $set: { version, revisions } }, { upsert: true });

        await Promise.all(Object.keys(submoduleProps).filter(url => url.startsWith('https://github.com/')).map(async (url) => {
            const [owner, repo] = url.replace(/\.git$/, '').split('/').slice(-2);
            await cdReleaseCreate(owner, repo, submoduleProps[url].ref, `v${version}`, `CD pre-release ${version}`, releaseNotes);
        }));

        await Promise.all(Object.keys(config.rule.environments).map(env => {
            return revisions[env] && request.server.app.db.collection(`release/${env}`).updateOne(
                { _id: revisions[env] },
                { $set: { release: version } },
                { upsert: true }
            );
        }));
        return {
            version,
            revisions,
            releaseNotes,
            tests,
            triggered
        };
    };

    const cdCollectionGet = async (request, h) => {
        const { env, collection, id: _id } = request.params;
        const hide = request.query.hide ? request.query.hide.split(',') : [];
        const result = await request.server.app.db.collection(`${collection}/${env}`).findOne({ _id });
        return result
            ? h.response(JSON.stringify(result, (key, value) => hide.includes(key) ? '*****' : value, 2)).code(200).type('application/json')
            : h.response({ statusCode: 404, error: 'Not Found', message: 'Release not found' }).code(404);
    };

    const cdCollectionMerge = async (request, h) => {
        const { env, collection, id: _id } = request.params;
        if (!['revision', 'release'].includes(collection))
            return h.response({
                statusCode: 400,
                error: 'Bad Request',
                message: 'Invalid collection'
            }).code(400);
        await request.server.app.db.collection(`${collection}/${env}`).updateMany(
            { _id },
            {
                $currentDate: { lastModified: true },
                $set: request.payload
            },
            { upsert: true }
        );
        if (collection === 'revision') {
            const release = await request.server.app.db.collection(`release/${env}`).findOne({ _id });
            if (release) return h.response(release).code(200);
            return await cdRuleExecute(request, h);
        }
        return cdCollectionGet(request, h);
    };

    server.route({
        // options: config.server.post, # todo: implement auth in /workspace/mojaloop/ml-testing-toolkit-client-lib, ml-core-test-harness and ml-e2e-test-runner
        method: 'POST',
        path: '/{collection}/{env}/{id}',
        handler: cdCollectionMerge
    });

    server.route({
        options: config.server.get,
        method: 'GET',
        path: '/{collection}/{env}/{id}',
        handler: cdCollectionGet
    });

    server.route({
        options: config.server.get,
        method: 'GET',
        path: '/release',
        async handler(request, h) {
            return h.response(await request.server.app.db.collection('release').findOne({ _id: 'version' })).code(200);
        }
    });
}