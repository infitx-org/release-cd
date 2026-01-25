import rc from 'rc';

export default rc('dev', {
    server: {
        port: 8080,
        host: '0.0.0.0',
        fs: {
            auth: 'report'
        },
        post: {
            auth: 'service'
        },
        get: {
            auth: false
        }
    },
    service: {
        ping: 'http://moja-ml-participant-connection-test-svc.mojaloop.svc.cluster.local/ping'
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
    mcm: {
        realm: 'hub-operators',
        db: {
            client: 'mysql2',
            asyncStackTraces: true,
            connection: {
                host: 'mcm-db-svc.stateful-resources.svc.cluster.local',
                port: 3306,
                user: 'devdat1asql1',
                database: 'mcm',
                ssl: {
                    rejectUnauthorized: false,
                }
            }
        }
    },
    mojaloop: {
        db: {
            client: 'mysql2',
            asyncStackTraces: true,
            connection: {
                host: 'central-ledger-db-svc.stateful-resources.svc.cluster.local',
                port: 3306,
                user: 'central_ledger',
                database: 'central_ledger',
                ssl: {
                    rejectUnauthorized: false,
                }
            }
        }
    },
    keycloak: {
        realm: 'master'
    },
    release: {
        url: '',
        prerelease: 'dev',
        start: '1.0.0'
    }
});
