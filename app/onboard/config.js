import rc from 'rc';

export default rc('onboard', {
    retryIntervalSeconds: 300,
    refreshIntervalSeconds: 3600,
    keycloak: {
        realmName: 'master',
        grantType: 'password',
        clientId: 'admin-cli'
    },
    k8s: {
        loadFromCluster: true
    },
    http: {
        port: 3000
    },
    secrets: {},
    dfsps: [],
    mcm: {
        realm: 'hub-operators'
    },
    rbac: {
        url: 'http://bof-security-role-perm-operator-svc.ory.svc.cluster.local/assignment/user-role'
    }
});
