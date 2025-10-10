import Hapi from '@hapi/hapi';
import { Boom } from '@hapi/boom';
import { MongoClient } from 'mongodb';
import rc from 'rc';
import { Octokit } from "@octokit/rest";
import semver from 'semver';
import assert from 'node:assert';
import mongoUriBuilder from 'mongo-uri-builder';
import { IncomingWebhook } from '@slack/webhook';
import AWS from 'aws-sdk';

const config = rc('release_cd', {
    server: {
        port: 8080,
        host: '0.0.0.0'
    },
    mongodb: {
        host: 'host.docker.internal',
        database: 'release-cd',
        port: 27017
    },
    github: {
        token: 'your-github-token'
    },
    rule: {
        environments: {
            // 'region-dev': {
            //     requiredTests: ['gp_tests']
            // },
            // 'mw-dev': {
            //     requiredTests: ['gp_tests']
            // },
            // 'zm-dev': {
            //     requiredTests: ['gp_tests']
            // },
            // 'pm-dev': {
            //     requiredTests: ['sdkFxSendE2EMin']
            // }
        }
    },
    slack: {
        url: ''
    },
    report: {
        s3Endpoint: '',
        s3Bucket: '',
        s3AccessKeyId: '',
        s3SecretAccessKey: '',
        reportEndpoint: '',
        awsRegion: 'us-east-1'
    },
    release: {
        prerelease: 'dev',
        start: '1.0.0'
    }
});

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
    const db = client.db(config.mongodb.database);

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
        const result = await db.collection(`${collection}/${env}`).findOne({ _id });
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
        await db.collection(`${collection}/${env}`).updateMany(
            { _id },
            {
                $currentDate: { lastModified: true },
                $set: request.payload
            },
            { upsert: true }
        );
        if (collection === 'revision') {
            const release = await db.collection(`release/${env}`).findOne({ _id });
            if (release) return h.response(release).code(200);
            return await cdRuleExecute(h);
        }
        return cdCollectionGet(request, h);
    };

    const requiredTestsPassed = (requiredTests, { tests }) => requiredTests.every(
        test => tests?.[test]?.totalAssertions > 0 && tests[test].totalAssertions === tests[test].totalPassedAssertions
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

${Object.entries(submodules).filter(isNotIac).map(([name, {ref}]) => `* ${name.replace(/^https:\/\/github.com\/|.git$/g, '')} ${name.replace(/^https:\/\/github.com\/|.git$/g, '')}@${ref}`).join('\n')}

submodules.yaml

\`\`\`yaml
${Object.entries(submodules).filter(isNotIac).map(([name, {path, ref}]) => `${path}:
  url: ${name}
  ref: ${version}`).join('\n')}
\`\`\`

## Tests

| Env  | Test | Pass | Fail | Duration |
| :--- | :--- | ---: | ---: | ---:     |
${Object.entries(tests).map(([env, tests]) => Object.entries(tests).map(([name, { totalPassedAssertions, totalAssertions, s3Url, duration }]) => `| ${env} | ${s3Url ? `[${name}](${s3Url})` : name} | ${totalPassedAssertions} | ${totalAssertions - totalPassedAssertions} | ${formatTime(duration)} |`)).flat().join('\n')}

`;

    const copyReportToS3 = async (testName, reportURL) => {
        if (!reportURL) return;
        if ((!config.report?.s3Endpoint && !config.report?.awsRegion) || !config.report?.s3Bucket || !config.report?.s3AccessKeyId || !config.report?.s3SecretAccessKey || !config.report?.reportEndpoint) {
            console.warn('S3 configuration is incomplete, skipping report upload');
            return;
        }

        const s3 = new AWS.S3({
            endpoint: config.report.s3Endpoint,
            region: config.report.awsRegion,
            s3ForcePathStyle: true,
            credentials: new AWS.Credentials({
                accessKeyId: config.report.s3AccessKeyId,
                secretAccessKey: config.report.s3SecretAccessKey
            })
        });

        let report;
        try {
            report = await fetch(reportURL);
        } catch (error) {
            console.error(`Error fetching report from ${reportURL}: ${error.message}`);
            throw error;
        }

        const params = {
            Bucket: config.report.s3Bucket,
            Key: testName,
            Body: Buffer.from(await report.arrayBuffer()),
            ContentType: report.headers.get('content-type'),
            ACL: 'public-read'
        };

        await s3.putObject(params).promise();
        return config.report.reportEndpoint.replace('{key}', testName);
    };

    const cdRuleExecute = async (h) => {
        const submoduleProps = {};
        const revisions = {};
        const tests = {};
        let iac;
        let ansible;
        for (const [env, {requiredTests}] of Object.entries(config.rule.environments)) {
            const revision = await db.collection(`revision/${env}`).findOne({}, { sort: { $natural: -1 } });
            if (!revision || !requiredTestsPassed(requiredTests, revision))
                return h.response(`Required tests have not passed for environment ${env}`).code(202);

            if (!revision.submodules || !Object.keys(revision.submodules).length)
                return h.response(`No submodules info found for environment ${env}`).code(202);

            if (revision.version)
                return h.response(`Release ${version} already created for environment ${env}`).code(202);

            revisions[env] = revision._id;
            tests[env] = revision.tests;
            iac ||= revision.iac_terraform_modules_tag
            if (iac !== revision.iac_terraform_modules_tag)
                return h.response(`IAC Terraform modules tag mismatch for environment ${env}, expected ${iac}, found ${revision.iac_terraform_modules_tag}`).code(202);
            ansible ||= revision.ansible_collection_tag;
            if (ansible !== revision.ansible_collection_tag)
                return h.response(`Ansible collection tag mismatch for environment ${env}, expected ${ansible}, found ${revision.ansible_collection_tag}`).code(202);

            const foundMismatch = Object.entries(revision.submodules).find(([name, props]) => { // Check if submodule refs do not match
                if (!submoduleProps[name]) {
                    submoduleProps[name] = props;
                    return;
                } else if (submoduleProps[name].ref === props.ref) return;
                return true;
            })
            if (foundMismatch) return h.response(`Submodule refs do not match for environment ${env}, revision ${revision._id}, submodule ${foundMismatch[0]}`).code(202);
        }

        console.log('Submodule refs match', submoduleProps);
        const [version, versionResponse] = await cdSemverBump(revisions);
        if (!version) return h.response(versionResponse).code(202);
        for (const [envName, envTests] of Object.entries(tests)) {
            for (const [testName, test] of Object.entries(envTests)) {
                if (test?.report) test.s3Url = await copyReportToS3(`${version}/${envName}/${testName}`, test.report);
            }
        }
        const releaseNotes = releaseNotesFormat(submoduleProps, tests, `v${version}`, iac, ansible);
        await db.collection('release').updateOne({ _id: 'version' }, { $set: { version, revisions } }, { upsert: true });

        await Promise.all(Object.keys(submoduleProps).filter(url => url.startsWith('https://github.com/')).map(async (url) => {
            const [owner, repo] = url.replace(/\.git$/, '').split('/').slice(-2);
            await cdReleaseCreate(owner, repo, submoduleProps[url].ref, `v${version}`, `CD pre-release ${version}`, releaseNotes);
        }));

        await Promise.all(Object.keys(config.rule.environments).map(env => {
            return revisions[env] && db.collection(`release/${env}`).updateOne(
                { _id: revisions[env] },
                { $set: { release: version } },
                { upsert: true }
            );
        }));
        return {
            version,
            revisions,
            releaseNotes,
            tests
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

    const cdSemverBump = async (revisions) => {
        const current = await db.collection('release').findOne({ _id: 'version' }) || { version: config.release.start };
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

            if (config.slack.url && repo === 'profile-cd') {
                try {
                    const webhook = new IncomingWebhook(config.slack.url);
                    await webhook.send({
                        text: `🎉 Release created: ${response.data.html_url}`
                    });
                } catch (error) {
                    console.error(`Error sending Slack notification: ${error.message}`);
                }
            }
            console.log(`Release created: ${response.data.html_url}`);
        } catch (error) {
            console.error(`Error creating release: ${error.message}`);
        }
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
            return h.response(await db.collection('release').findOne({ _id: 'version' })).code(200);
        }
    });

    server.route({
        method: 'GET',
        path: '/health',
        handler: (request, h) => {
            return h.response({ status: 'ok' }).code(200);
        }
    });

    await server.start();
    console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {
    console.log(err);
    process.exit(1);
});

init();
