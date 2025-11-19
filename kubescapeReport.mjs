import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Read and parse the Kubescape results
function readKubescapeResults() {
    const resultsPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'kubescape.json');
    if (!fs.existsSync(resultsPath)) {
        throw new Error('kubescape.json not found');
    }
    return JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
}

// Generate Allure test result for a failed control
function generateAllureResult(result, index, resources) {
    const resource = resources[result.resourceID];
    const object = resource?.relatedObjects?.[0] || resource?.relatedObjects || resource;
    if (!object?.metadata?.uid) {
        return {
            uuid: `missing-uid-${index}`,
            name: result.resourceId,
            titlePath: [
                'kubescape',
                'unknown-namespace',
                resource.kind
            ],
            fullName: `unknown-namespace/${result.resourceId}`,
            status: 'broken',
            labels: [
                { name: 'package', value: 'kubescape' },
                { name: 'parentSuite', value: 'unknown-namespace' },
            ],
            stage: 'finished',
            steps: [],
            statusDetails: {
                message: 'Resource metadata UID is missing',
                trace: JSON.stringify(result, null, 2)
            }
        }
    }
    return {
        uuid: object.metadata.uid,
        name: resource.name,
        titlePath: [
            'kubescape',
            resource.namespace || 'cluster-wide',
            resource.kind
        ],
        fullName: `${resource.namespace || 'cluster-wide'}/${resource.kind}/${resource.name}`,
        status: result.controls.some(control => control.status.status !== 'passed') ? 'failed' : 'passed',
        labels: [
            { name: 'package', value: 'kubescape' },
            { name: 'parentSuite', value: resource.namespace || 'cluster-wide' },
        ],
        stage: 'finished',
        steps: result.controls.map(control => ({
            name: control.name,
            status: control.status.status === 'passed' ? 'passed' : 'failed',
            type: 'step',
            statusDetails: control.status.status !== 'passed' ? {
                message: `https://hub.armosec.io/docs/${control.controlID}`.toLowerCase(),
                trace: JSON.stringify(control.rules, null, 2)
            } : undefined
        })).sort((a, b) => a.name.localeCompare(b.name))
    }
}

function resourceMap(resources) {
    return resources.reduce((map, resource) => {
        map[resource.resourceID] = resource.object;
        return map;
    }, {});
}

// Write Kubescape results to Allure results files
function writeAllureResults(report) {
    const allureDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'allure-results');
    if (!fs.existsSync(allureDir)) {
        fs.mkdirSync(allureDir, { recursive: true });
    }

    const resources = resourceMap(report.resources);

    report.results.forEach((result, index) => {
        const allureResult = generateAllureResult(result, index, resources);
        if (!allureResult) return;

        const filename = `${allureResult.uuid}-result.json`;
        const filepath = path.join(allureDir, filename);

        fs.writeFileSync(filepath, JSON.stringify(allureResult, null, 2));
    });
}

// Main function
async function main() {
    try {
        console.log('Reading Kubescape results...');

        writeAllureResults(readKubescapeResults());

        console.log('Kubescape report generation completed successfully.');
    } catch (error) {
        console.error('Error generating Kubescape report:', error);
        process.exit(1);
    }
}

main().catch(err => {
    console.error('Error extracting Kubescape results:', err);
    process.exit(1);
});
