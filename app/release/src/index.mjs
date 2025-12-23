#! /usr/bin/env node
import { Boom } from '@hapi/boom';
import Hapi from '@hapi/hapi';
import { Octokit } from "@octokit/rest";
import mongoUriBuilder from 'mongo-uri-builder';
import { MongoClient } from 'mongodb';
import assert from 'node:assert';
import semver from 'semver';

import config from './config.mjs';
import keyRotate from './handler/keyRotate.mjs';
import triggerCronJob from './handler/triggerJob.mjs';
import copyReportToS3 from './s3.mjs';
import notifySlack from './slack.mjs';
import trigger from './trigger.mjs';

const octokit = new Octokit({
    auth: config.github.token
});

const init = async () => {
    const server = Hapi.server({
        port: config.server.port,
        host: config.server.host
    });

    const client = new MongoClient(mongoUriBuilder(config.mongodb));
    await client.connect();
    server.app.db = client.db(config.mongodb.database);

    server.events.on({ name: 'request', channels: 'app' }, (request, event, tags) => {
        if (tags.error) {
            console.error(new Date(), `=> ${request.method.toUpperCase()} ${request.path} ${event.error?.output?.statusCode}`, event.error ?? 'unknown');
        } else {
            console.log(new Date(), event.data);
        }
    });

    server.ext('onRequest', (request, h) => {
        if (request.path === '/health') return h.continue;
        request.log(['info'], `=> ${request.method.toUpperCase()} ${request.path}`);
        return h.continue;
    });

    server.ext('onPreResponse', (request, h) => {
        if (request.path === '/health') return h.continue;
        const response = request.response;
        if (response.isBoom) {
            request.log(['error'], response);
        } else {
            request.log(['info'], `<= ${request.method.toUpperCase()} ${request.path} ${response.statusCode} ${JSON.stringify(response.source)}`);
        }
        return h.continue;
    });

    const cdCollectionGet = async (request, h) => {
        const { env, collection, id: _id } = request.params;
        const result = await request.app.db.collection(`${collection}/${env}`).findOne({ _id });
        return result
            ? h.response(result).code(200)
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
        await request.app.db.collection(`${collection}/${env}`).updateMany(
            { _id },
            {
                $currentDate: { lastModified: true },
                $set: request.payload
            },
            { upsert: true }
        );
        if (collection === 'revision') {
            const release = await request.app.db.collection(`release/${env}`).findOne({ _id });
            if (release) return h.response(release).code(200);
            return await cdRuleExecute(request, h);
        }
        return cdCollectionGet(request, h);
    };

    const requiredTestsPassed = (requiredTests, { tests }) => requiredTests.every(
        test => tests?.[test]?.totalAssertions > 0 && tests[test].totalAssertions === tests[test].totalPassedAssertions
    );
    const optionalTestsPresent = (optionalTests, { tests }) => optionalTests.every(
        test => tests?.[test]?.totalAssertions > 0
    );

    const isNotIac = ([name]) => !['ansible_collection_tag', 'iac_terraform_modules_tag'].includes(name);
    const formatTime = (ms) => {
        if (ms == null || isNaN(ms)) return '00:00:00';
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / (1000 * 60)) % 60);
        const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
        const pad = (n) => n.toString().padStart(2, '0');
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    };
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
${Object.entries(submodules).filter(isNotIac).map(([name, { path, ref }]) => `${path}:
  url: ${name}
  ref: ${version}`).join('\n')}
\`\`\`

## Tests

| Env  | Test | Pass | Fail | Duration |
| :--- | :--- | ---: | ---: | ---:     |
${Object.entries(tests).map(([env, tests]) => Object.entries(tests).map(([name, { totalPassedAssertions, totalAssertions, s3Url, duration }]) => `| ${env} | ${s3Url ? `[${name}](${s3Url})` : name} | ${totalPassedAssertions} | ${totalAssertions - totalPassedAssertions} | ${formatTime(duration)} |`)).flat().join('\n')}

`;

    const cdRuleExecute = async (request, h) => {
        const submoduleProps = {};
        const revisions = {};
        const tests = {};
        let iac;
        let ansible;
        const response = {};
        for (const [env, { requiredTests = [], optionalTests = [] }] of Object.entries(config.rule.environments)) {
            const revision = await request.app.db.collection(`revision/${env}`).findOne({}, { sort: { $natural: -1 } });
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
            tests[env] = revision.tests;
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
        const triggered = trigger({ tests, revisions });
        if (Object.keys(response).length > 0) {
            response.triggered = triggered;
            return h.response(response).code(202);
        }

        console.log('Submodule refs match', submoduleProps);
        const [version, versionResponse] = await cdSemverBump(request, revisions);
        if (!version) return h.response(versionResponse).code(202);
        for (const [envName, envTests] of Object.entries(tests)) {
            for (const [testName, test] of Object.entries(envTests)) {
                if (test?.report) test.s3Url = await copyReportToS3(`${version}/${envName}/${testName}`, test.report);
            }
        }
        const releaseNotes = releaseNotesFormat(submoduleProps, tests, `v${version}`, iac, ansible);
        await request.app.db.collection('release').updateOne({ _id: 'version' }, { $set: { version, revisions } }, { upsert: true });

        await Promise.all(Object.keys(submoduleProps).filter(url => url.startsWith('https://github.com/')).map(async (url) => {
            const [owner, repo] = url.replace(/\.git$/, '').split('/').slice(-2);
            await cdReleaseCreate(owner, repo, submoduleProps[url].ref, `v${version}`, `CD pre-release ${version}`, releaseNotes);
        }));

        await Promise.all(Object.keys(config.rule.environments).map(env => {
            return revisions[env] && request.app.db.collection(`release/${env}`).updateOne(
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

    const releaseExists = async (owner, repo, tag) => {
        try {
            const release = await octokit.repos.getReleaseByTag({
                owner,
                repo,
                tag
            });
            return release?.data?.url;
        } catch (error) {
            return false;
        }
    };

    const deepEqual = (a, b) => {
        try {
            assert.deepStrictEqual(a, b);
            return true;
        } catch (error) {
            return false;
        }
    };

    const cdSemverBump = async (request, revisions) => {
        const current = await request.app.db.collection('release').findOne({ _id: 'version' }) || { version: config.release.start };
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

    const cdRevisionGet = async (request, h) => {
        const submoduleProps = {};
        const revisions = {};
        const tests = {};
        let iac;
        let ansible;
        const result = [];
        result.push('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Release CD Status</title>');
        result.push(`<style>
    body {
        font-family: sans-serif;
        background: #f9f9f9;
        color: #222;
        transition: background 0.2s, color 0.2s;
    }
    h2 { margin-top: 2em; }
    table {
        border-collapse: collapse;
        width: 100%;
        margin-bottom: 2em;
    }
    th, td {
        border: 1px solid #ccc;
        padding: 6px 10px;
    }
    th { background: #eee; }
    tr:nth-child(even) { background: #f3f3f3; }
    code {
        background: #eee;
        padding: 2px 4px;
        border-radius: 3px;
    }
    @media (prefers-color-scheme: dark) {
        body {
        background: #181a1b;
        color: #eee;
        }
        th, td {
        border: 1px solid #444;
        }
        th {
        background: #23272a;
        }
        tr:nth-child(even) {
        background: #222426;
        }
        code {
        background: #23272a;
        color: #e6e6e6;
        }
        a { color: #8ab4f8; }
    }
    </style>`);
        result.push('</head><body>');
        result.push('<h1>Release CD Status</h1>');
        for (const [env, { requiredTests = [], optionalTests = [] }] of Object.entries(config.rule.environments)) {
            const revision = await request.app.db.collection(`revision/${env}`).findOne({}, { sort: { $natural: -1 } });
            revisions[env] = revision._id;
            tests[env] = revision.tests;

            result.push(`<h2>${env}</h2>`);
            result.push('<ul>');
            result.push(`<li>ℹ️ Revision ID: <code>${revision._id}</code></li>`);
            if (revision.version)
                result.push(`<li>✅ Release: ${revision.version} already created</li>`);
            iac ||= revision.iac_terraform_modules_tag
            if (iac !== revision.iac_terraform_modules_tag)
                result.push(`<li>⛔ iac_terraform_modules_tag mismatch: expected <code>${iac}</code>, found <code>${revision.iac_terraform_modules_tag}</code></li>`);
            else
                result.push(`<li>✅ iac_terraform_modules_tag: <code>${revision.iac_terraform_modules_tag}</code></li>`);
            ansible ||= revision.ansible_collection_tag;
            if (ansible !== revision.ansible_collection_tag)
                result.push(`<li>⛔ ansible_collection_tag mismatch: expected <code>${ansible}</code>, found <code>${revision.ansible_collection_tag}</code></li>`);
            else
                result.push(`<li>✅ ansible_collection_tag: <code>${revision.ansible_collection_tag}</code></li>`);
            result.push('</ul>');

            const mismatchList = Object.entries(revision.submodules || {}).filter(([name, props]) => {
                if (!submoduleProps[name]) {
                    submoduleProps[name] = props;
                    return;
                } else if (submoduleProps[name].ref === props.ref) return;
                return true;
            }).map(([name]) => name);

            result.push('<details open><summary>Submodules</summary>');
            if (!revision.submodules || !Object.keys(revision.submodules).length)
                result.push('<div>⛔ No submodules info found</div>');
            else {
                result.push('<ul>');
                for (const [name, props] of Object.entries(revision.submodules || {})) {
                    if (mismatchList.includes(name))
                        result.push(`<li>⛔ <a href="${name}" target="_blank">${name}</a>@<a href="${name.replace(/\.git/, `/commit/${props.ref}`)}" target="_blank">${props.ref}</a></li>`);
                    else
                        result.push(`<li>📁 <a href="${name}" target="_blank">${name}</a>@<a href="${name.replace(/\.git/, `/commit/${props.ref}`)}" target="_blank">${props.ref}</a></li>`);
                }
                result.push('</ul>');
            }
            result.push('</details>');

            result.push('<details open><summary>Tests</summary>');
            result.push('<ul>');
            for (const testName of [...requiredTests, ...optionalTests])
                if (!(testName in (revision.tests || {})))
                    result.push(`<li>⛔ <code>${testName}</code> missing</li>`);
            for (const [testName, test] of Object.entries(revision.tests || {})) {
                const status = test.totalPassedAssertions == test.totalAssertions
                    ? '✅'
                    : requiredTests.includes(testName)
                        ? '⛔'
                        : '⚠️';
                result.push(`<li>${status} ${test.report ? `<a href="${test.report}" target="_blank">${testName}</a>` : `${testName}`} failed <code>${((test.totalAssertions || 0) - (test.totalPassedAssertions || 0))}/${test.totalAssertions || 0}, ⌛ ${formatTime(test.duration)}</code></li>`);
            }
            result.push('</ul>');
            result.push('</details>');
        }
        result.push('</body></html>');
        return h.response(result.join('\n')).code(200).type('text/html');
    };

    server.route({
        method: 'POST',
        path: '/{collection}/{env}/{id}',
        handler: cdCollectionMerge
    });

    server.route({
        method: 'GET',
        path: '/{collection}/{env}/{id}',
        handler: cdCollectionGet
    });

    server.route({
        method: 'GET',
        path: '/release',
        async handler(request, h) {
            return h.response(await request.app.db.collection('release').findOne({ _id: 'version' })).code(200);
        }
    });

    server.route({
        method: 'GET',
        path: '/keyRotate/{key}',
        handler: keyRotate
    });

    server.route({
        method: 'GET',
        path: '/triggerCronJob/{namespace}/{job}',
        handler: triggerCronJob
    });

    server.route({
        method: 'GET',
        path: '/health',
        handler: (request, h) => {
            return h.response({ status: 'ok' }).code(200);
        }
    });

    server.route({
        method: 'GET',
        path: '/',
        handler: cdRevisionGet
    });

    await server.start();
    console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {
    console.log(err);
    process.exit(1);
});

init();
