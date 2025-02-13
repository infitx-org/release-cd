import Hapi from '@hapi/hapi';
import { Boom } from '@hapi/boom';
import { MongoClient } from 'mongodb';
import rc from 'rc';
import { Octokit } from "@octokit/rest";
import semver from 'semver';
import assert from 'node:assert';
import mongoUriBuilder from 'mongo-uri-builder';

const config = rc('release_cd', {
    server: {
        port: 8080,
        host: 'localhost'
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
        requiredTests: ['gp'],
        environments: ['region-dev', 'mw-dev', 'zm-dev']
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
            console.error(new Date(), `=> ${request.method.toUpperCase()} ${request.path} ${event.error?.output?.statusCode} ${event.error ? event.error.message : 'unknown'}`);
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
            request.log(['info'], `<= ${request.method.toUpperCase()} ${request.path} ${response.statusCode}`);
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

    const requiredTestsPassed = ({ tests }) => config.rule.requiredTests.every(
        test => tests?.[test].totalAssertions > 0 && tests[test].totalAssertions === tests[test].totalPassedAssertions
    );

    const releaseNotesFormat = (refs, tests) => `# Release notes

## Submodules

${Object.entries(refs).map(([name, ref]) => `* ${name.replace(/^https:\/\/github.com\/|.git$/g, '')} ${name.replace(/^https:\/\/github.com\/|.git$/g, '')}@${ref}`).join('\n')}

## Tests

| Env  | Test | Pass | Fail |
| :--- | :--- | ---: | ---: |
${Object.entries(tests).map(([env, tests]) => Object.entries(tests).map(([name, { pass, fail }]) => `| ${env} | ${name} | ${pass} | ${fail} |`)).flat().join('\n')}

`;

    const cdRuleExecute = async (h) => {
        const refs = {};
        const revisions = {};
        const tests = {};
        for (const env of config.rule.environments) {
            const revision = await db.collection(`revision/${env}`).findOne({}, { sort: { $natural: -1 } });
            if (!revision || !requiredTestsPassed(revision))
                return h.response(`Required tests have not passed for environment ${env}`).code(202);

            if (!revision.submodules || !Object.keys(revision.submodules).length)
                return h.response(`No submodules info found for environment ${env}`).code(202);

            if (revision.version)
                return h.response(`Release ${version} already created for environment ${env}`).code(202);

            revisions[env] = revision._id;
            tests[env] = revision.tests;

            const foundMismatch = Object.entries(revision.submodules).find(([name, { ref }]) => { // Check if submodule refs do not match
                if (!refs[name]) {
                    refs[name] = ref;
                    return;
                } else if (refs[name] === ref) return;
                return true;
            })
            if (foundMismatch) return h.response(`Submodule refs do not match for environment ${env}, revision ${revision._id}, submodule ${foundMismatch[0]}`).code(202);
        }

        console.log('Submodule refs match', refs);
        const [version, versionResponse] = await cdSemverBump(revisions);
        if (!version) return h.response(versionResponse).code(202);
        const releaseNotes = releaseNotesFormat(refs, tests);
        await Promise.all(Object.keys(refs).filter(url => url.startsWith('https://github.com/')).map(async (url) => {
            const [owner, repo] = url.replace(/\.git$/, '').split('/').slice(-2);
            await cdReleaseCreate(owner, repo, refs[url], `v${version}`, `CD pre-release ${version}`, releaseNotes);
        }));

        await Promise.all(config.rule.environments.map(env => {
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
        const current = await db.collection('release').findOne({ _id: 'version' }) || { version: '1.0.0' };
        if (deepEqual(revisions, current?.revisions))
            return [false, `Revisions ${JSON.stringify(revisions)} match current version ${current.version}`];

        const newVersion = current?.version ? semver.inc(current.version, 'prerelease', config.release.prerelease) : config.release.start;

        if (!newVersion) throw new Boom('Cannot determine new version', { statusCode: 500 });

        console.log(`Bumping version to ${newVersion}`);
        await db.collection('release').updateOne({ _id: 'version' }, { $set: { version: newVersion, revisions } }, { upsert: true });
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
