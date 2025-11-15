import rc from 'rc';

export default rc('release_cd', {
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
        s3: {
            region: 'us-east-1',
            s3ForcePathStyle: true
        },
        name: 'report'
    },
    release: {
        prerelease: 'dev',
        start: '1.0.0'
    }
});
