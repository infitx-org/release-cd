const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * Extracts API endpoints from an OpenAPI (Swagger) definition file and returns a markdown table.
 * @param {string} apiDefPath - Path to the API definition file (JSON or YAML).
 * @returns {string} Markdown table with columns: Path, Method, Summary.
 */
function extractEndpointsToMarkdown(apiDefPath) {
    const ext = path.extname(apiDefPath).toLowerCase();
    let apiDef;
    if (ext === '.json') {
        apiDef = JSON.parse(fs.readFileSync(apiDefPath, 'utf8'));
    } else if (ext === '.yaml' || ext === '.yml') {
        apiDef = yaml.load(fs.readFileSync(apiDefPath, 'utf8'));
    } else {
        throw new Error('Unsupported file format. Use JSON or YAML.');
    }

    const rows = [];
    const paths = apiDef.paths || {};
    for (const [apiPath, methods] of Object.entries(paths)) {
        for (const [method, details] of Object.entries(methods)) {
            rows.push([
                details.summary ? details.summary.replace(/\|/g, '\\|') : '',
                `${apiPath}`,
                method.toUpperCase()
            ]);
        }
    }

    // Sort rows by path (column index 1)
    rows.sort((a, b) => a[1].localeCompare(b[1]));

    // Calculate max width for each column
    const headers = ['Name', 'Path', 'Method'];
    const colWidths = headers.map((header, i) =>
        Math.max(
            header.length,
            ...rows.map(row => row[i].length)
        )
    );

    // Pad a value to the column width
    function pad(val, width) {
        return val + ' '.repeat(width - val.length);
    }

    // Build markdown table
    let markdown = `| ${headers.map((h, i) => pad(h, colWidths[i])).join(' | ')} |\n`;
    markdown += `|${colWidths.map(w => '-'.repeat(w + 2)).join('|')}|\n`;
    for (const row of rows) {
        markdown += `| ${row.map((v, i) => pad(v, colWidths[i])).join(' | ')} |\n`;
    }
    return markdown;
}

console.log(extractEndpointsToMarkdown('/workspace/mojaloop/connection-manager-api/src/api/swagger.yaml'));
