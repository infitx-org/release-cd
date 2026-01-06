import rc from 'rc';

export default rc('dev', {
    server: {
        port: 8080,
        host: '0.0.0.0',
        post: {
            auth: 'service'
        },
        get: {
            auth: false
        }
    },
    mongodb: {
        host: 'host.docker.internal',
        database: 'release-cd',
        port: 27017
    },
    github: {
        token: ''
    },
    prometheus: {
        url: 'http://prom-kube-prometheus-stack-prometheus.monitoring.svc.cluster.local:9090'
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
    env: {
        //'region-dev': 'https://release-cd.region-dev.example.com',
        //'mw-dev': 'https://release-cd.mw-dev.example.com',
        //'zm-dev': 'https://release-cd.zm-dev.example.com',
        //'pm-dev': 'https://release-cd.pm-dev.example.com'
    },
    report: {
        s3: {
            region: 'us-east-1',
            s3ForcePathStyle: true
        },
        id: '',
        bucket: {},
        name: 'report'
    },
    release: {
        url: '',
        prerelease: 'dev',
        start: '1.0.0'
    }
});
