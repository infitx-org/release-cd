import * as k8s from '@kubernetes/client-node';
import fs from 'fs';
import path from 'path';
const POLICY_REPORT_PLURAL = 'policyreports';
const CLUSTER_POLICY_REPORT_PLURAL = 'clusterpolicyreports';

// Fetch both PolicyReports and ClusterPolicyReports from the cluster
async function getAllPolicyReports() {
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();
    const k8sApi = kc.makeApiClient(k8s.CustomObjectsApi);

    const group = 'wgpolicyk8s.io';
    const version = 'v1alpha2';

    // List PolicyReports (namespaced)
    const policyReportsRes = await k8sApi.listClusterCustomObject({ group, version, plural: POLICY_REPORT_PLURAL, labelSelector: 'app.kubernetes.io/managed-by=kyverno' });
    const policyReports = policyReportsRes.items || [];

    // List ClusterPolicyReports (cluster-wide)
    const clusterPolicyReportsRes = await k8sApi.listClusterCustomObject({ group, version, plural: CLUSTER_POLICY_REPORT_PLURAL, labelSelector: 'app.kubernetes.io/managed-by=kyverno' });
    const clusterPolicyReports = clusterPolicyReportsRes.items || [];

    return [...policyReports, ...clusterPolicyReports];
}

// Write policy reports to Allure results files
function writeAllureResults(policyReports) {
    const allureDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), 'allure-results');
    if (!fs.existsSync(allureDir)) fs.mkdirSync(allureDir);
    policyReports.forEach(report => {
        if (!['Deployment', 'Job', 'StatefulSet', 'DaemonSet', 'Service', 'Ingress'].includes(report.scope.kind)) return;
        const bestPractices = (report.results || []).filter(r => r.category?.startsWith?.('Best Practices'));
        if (bestPractices.length === 0) return; // Skip reports with no best practices results
        fs.writeFileSync(path.join(allureDir, `${report.scope.uid}-result.json`), JSON.stringify({
            uuid: report.scope.uid,
            name: report.scope.name,
            titlePath: [
                'best-practices',
                report.scope.namespace || 'cluster-wide',
                report.scope.kind
            ],
            fullName: `${report.scope.namespace || 'cluster-wide'}/${report.scope.kind}/${report.scope.name}`,
            status: report.summary.fail === 0 ? 'passed' : 'failed',
            labels: [
                { name: 'package', value: 'best-practices' },
                { name: 'parentSuite', value: report.scope.namespace || 'cluster-wide' },
            ],
            stage: 'finished',
            steps: bestPractices.map(result => ({
                name: result.policy,
                status: result.result === 'pass' ? 'passed' : 'failed',
                type: 'step',
                statusDetails: result.result !== 'pass' ? {
                    message: result.message || '',
                    trace: result.rule
                } : undefined
            })).sort((a, b) => a.name.localeCompare(b.name))
        }))
    });
}

// Main
async function main() {
    writeAllureResults(await getAllPolicyReports());
}

main().catch(err => {
    console.error('Error extracting policy reports:', err);
    process.exit(1);
});