import config from '../config.mjs';
import { formatTime } from '../fn/formatTime.mjs';

const trigger = (env, testName) => {
    const ruleName = config.rule.environments[env]?.trigger?.[testName];
    return ruleName ? `<button type="button" data-trigger="${ruleName}">Trigger</button>` : '';
}

export const cdRevisionGet = async (request, h) => {
    const submoduleProps = {};
    const revisions = {};
    const tests = {};
    let iac;
    let ansible;
    const result = [];
    result.push('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Release CD Status</title>');
    result.push(`<style>
    * { box-sizing: border-box; }
    body {
        font-family: sans-serif;
        background: #f9f9f9;
        color: #222;
        transition: background 0.2s, color 0.2s;
        margin: 0;
        padding: 20px;
    }
    button {
        padding: 0px 4px;
        font-size: 0.9em;
        cursor: pointer;
        border: 1px solid #0066cc;
        background: #0066cc;
        color: white;
        border-radius: 4px;
        transition: background 0.2s, color 0.2s;
    }
    button:hover {
        background: #005bb5;
    }
    button:disabled {
        background: #ccc;
        border-color: #ccc;
        cursor: not-allowed;
    }
    h1 {
        margin: 0 0 20px 0;
        padding: 0;
    }
    .env-container {
        display: flex;
        flex-wrap: wrap;
        gap: 20px;
        align-items: flex-start;
    }
    .env-card {
        flex: 1 1 400px;
        min-width: 320px;
        max-width: 600px;
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 16px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .env-card h2 {
        margin: 0 0 12px 0;
        font-size: 1.4em;
        border-bottom: 2px solid #0066cc;
        padding-bottom: 8px;
    }
    .env-card ul {
        margin: 8px 0;
        padding-left: 20px;
        font-size: 0.9em;
    }
    .env-card li {
        margin: 4px 0;
        line-height: 1.4;
    }
    .env-card details {
        margin-top: 12px;
    }
    .env-card details summary {
        cursor: pointer;
        font-weight: bold;
        padding: 4px 0;
        user-select: none;
    }
    .env-card details[open] summary {
        margin-bottom: 8px;
    }
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
        font-size: 0.9em;
    }
    a {
        color: #0066cc;
        text-decoration: none;
    }
    a:hover {
        text-decoration: underline;
    }
    @media (prefers-color-scheme: dark) {
        body {
            background: #181a1b;
            color: #eee;
        }
        .env-card {
            background: #23272a;
            border: 1px solid #444;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .env-card h2 {
            border-bottom: 2px solid #8ab4f8;
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
            background: #2d3135;
            color: #e6e6e6;
        }
        a { color: #8ab4f8; }
    }
    @media (max-width: 768px) {
        .env-card {
            flex: 1 1 100%;
        }
    }
    .health-viz {
        margin-top: 12px;
        font-size: 0.85em;
    }
    .health-grid {
        display: flex;
        flex-direction: column;
        gap: 8px;
        overflow-y: auto;
        max-height: 500px;
        font-size: 0.75em;
        margin-top: 4px;
    }
    .health-app-section {
        display: grid;
        grid-template-columns: 100px auto;
        gap: 4px;
        align-items: center;
        padding: 4px;
        background: rgba(0,0,0,0.02);
        border-radius: 4px;
    }
    @media (prefers-color-scheme: dark) {
        .health-app-section {
            background: rgba(255,255,255,0.03);
        }
    }
    .health-app-name {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        padding: 2px 4px;
        font-weight: 500;
        font-size: 0.85em;
    }
    .health-state-bands {
        display: flex;
        flex-direction: column;
        gap: 1px;
    }
    .health-heatmap-row {
        display: flex;
        gap: 1px;
        align-items: center;
    }
    .health-cell {
        flex: 1;
        height: 6px;
        border-radius: 1px;
        position: relative;
        min-width: 2px;
    }
    /* Intensity levels for each state (0 = no transitions, 1-5+ increasing intensity) */
    .health-cell.Healthy-0 { background: #e8f5e9; }
    .health-cell.Healthy-1 { background: #a5d6a7; }
    .health-cell.Healthy-2 { background: #66bb6a; }
    .health-cell.Healthy-3 { background: #43a047; }
    .health-cell.Healthy-4 { background: #2e7d32; }

    .health-cell.Progressing-0 { background: #e3f2fd; }
    .health-cell.Progressing-1 { background: #90caf9; }
    .health-cell.Progressing-2 { background: #42a5f5; }
    .health-cell.Progressing-3 { background: #1e88e5; }
    .health-cell.Progressing-4 { background: #1565c0; }

    .health-cell.Degraded-0 { background: #fff8e1; }
    .health-cell.Degraded-1 { background: #ffe082; }
    .health-cell.Degraded-2 { background: #ffd54f; }
    .health-cell.Degraded-3 { background: #ffca28; }
    .health-cell.Degraded-4 { background: #ffa000; }

    .health-cell.Missing-0 { background: #fff3e0; }
    .health-cell.Missing-1 { background: #ffb74d; }
    .health-cell.Missing-2 { background: #ff9800; }
    .health-cell.Missing-3 { background: #fb8c00; }
    .health-cell.Missing-4 { background: #e65100; }

    .health-cell.Unknown-0 { background: #ffebee; }
    .health-cell.Unknown-1 { background: #e57373; }
    .health-cell.Unknown-2 { background: #f44336; }
    .health-cell.Unknown-3 { background: #e53935; }
    .health-cell.Unknown-4 { background: #c62828; }

    @media (prefers-color-scheme: dark) {
        .health-cell.Healthy-0,
        .health-cell.Progressing-0,
        .health-cell.Degraded-0,
        .health-cell.Missing-0,
        .health-cell.Unknown-0 { background: #2a2a2a; }
    }
    .health-legend {
        display: flex;
        gap: 12px;
        margin-top: 8px;
        flex-wrap: wrap;
        font-size: 0.7em;
    }
    .health-legend-item {
        display: flex;
        align-items: center;
        gap: 4px;
    }
    .health-legend-box {
        width: 12px;
        height: 12px;
        border-radius: 2px;
    }
    .health-stats {
        margin-top: 6px;
        font-size: 0.7em;
        color: #666;
    }
    @media (prefers-color-scheme: dark) {
        .health-stats {
            color: #aaa;
        }
    }
    </style>`);
    result.push(`
<script>
        async function loadHealthData(env, url) {
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error('Failed to fetch health data');
                const data = await response.json();
                renderHealthViz(env, data);
            } catch (err) {
                console.error(\`Failed to load health data for \${env}:\`, err);
                const container = document.getElementById(\`health-\${env}\`);
                if (container) {
                    container.innerHTML = '<div style="color: #ea4335;">⚠️ Failed to load health data</div>';
                }
            }
        }

        function renderHealthViz(env, data) {
            const container = document.getElementById(\`health-\${env}\`);
            if (!container) return;

            const apps = Object.entries(data);
            if (apps.length === 0) {
                container.innerHTML = '<div>No health data available</div>';
                return;
            }

            // Filter out all-healthy apps and sort alphabetically
            const filteredApps = apps.filter(([_, appData]) => !appData.isHealthy);
            filteredApps.sort((a, b) => {
                const [nameA] = a;
                const [nameB] = b;
                return nameA.localeCompare(nameB);
            });

            if (filteredApps.length === 0) {
                const totalApps = apps.length;
                const healthyApps = apps.filter(([_, d]) => d.isHealthy).length;
                container.innerHTML = \`<div style="color: #34a853; padding: 8px;">✓ All \${totalApps} apps are healthy!</div>\`;
                return;
            }

            // Map transition count to intensity level (0-4)
            const getIntensityLevel = (count) => {
                if (count === 0) return 0;
                if (count <= 3) return 1;
                if (count <= 6) return 2;
                if (count < 12) return 3;
                return 4; // 12+ transitions
            };

            let html = '<div class="health-grid">';
            for (const [appName, appData] of filteredApps) {
                const title = \`\${appName}: \${appData.currentStatus || 'Unknown'} (\${appData.totalTransitions} samples)\`;

                // Only render if there are states present
                if (appData.statesPresent.length === 0) continue;

                html += \`<div class="health-app-section">\`;
                html += \`<div class="health-app-name" title="\${title}">\${appName}</div>\`;
                html += \`<div class="health-state-bands">\`;

                // Create a row for each state that has transitions
                for (const state of appData.statesPresent) {
                    const transitions = appData.stateTransitions[state];
                    html += \`<div class="health-heatmap-row">\`;

                    for (let hourIdx = 0; hourIdx < transitions.length; hourIdx++) {
                        const count = transitions[hourIdx];
                        const intensity = getIntensityLevel(count);
                        const cellTitle = \`\${state}: \${count} transition\${count !== 1 ? 's' : ''}\`;

                        html += \`<div class="health-cell \${state}-\${intensity}" title="\${cellTitle}"></div>\`;
                    }

                    html += \`</div>\`;
                }

                html += \`</div>\`; // Close health-state-bands
                html += \`</div>\`; // Close health-app-section
            }
            html += '</div>';

            // Add legend
            html += '<div class="health-legend">';
            html += '<div style="font-weight: 500; margin-right: 8px;">States:</div>';
            html += '<div class="health-legend-item"><div class="health-legend-box" style="background: #66bb6a;"></div><span>Healthy</span></div>';
            html += '<div class="health-legend-item"><div class="health-legend-box" style="background: #42a5f5;"></div><span>Progressing</span></div>';
            html += '<div class="health-legend-item"><div class="health-legend-box" style="background: #ffd54f;"></div><span>Degraded</span></div>';
            html += '<div class="health-legend-item"><div class="health-legend-box" style="background: #ff9800;"></div><span>Missing</span></div>';
            html += '<div class="health-legend-item"><div class="health-legend-box" style="background: #f44336;"></div><span>Unknown</span></div>';
            html += '</div>';

            html += '<div class="health-legend" style="margin-top: 4px;">';
            html += '<div style="font-weight: 500; margin-right: 8px;">Transitions/hour:</div>';
            html += '<div class="health-legend-item"><div class="health-legend-box" style="background: #e8f5e9;"></div><span>0</span></div>';
            html += '<div class="health-legend-item"><div class="health-legend-box" style="background: #a5d6a7;"></div><span>1-3</span></div>';
            html += '<div class="health-legend-item"><div class="health-legend-box" style="background: #66bb6a;"></div><span>4-6</span></div>';
            html += '<div class="health-legend-item"><div class="health-legend-box" style="background: #43a047;"></div><span>7-11</span></div>';
            html += '<div class="health-legend-item"><div class="health-legend-box" style="background: #2e7d32;"></div><span>12+</span></div>';
            html += '</div>';

            // Add stats
            const totalApps = apps.length;
            const healthyApps = apps.filter(([_, d]) => d.isHealthy).length;
            const stableApps = apps.filter(([_, d]) => d.isStable).length;
            const displayedApps = filteredApps.filter(([_, d]) => d.statesPresent.length > 0).length;
            html += \`<div class="health-stats">Apps: \${displayedApps}/\${totalApps} (hiding \${healthyApps} all-healthy) | Stable: \${stableApps} | 24h heatmap →</div>\`;

            container.innerHTML = html;
        }

        const showHint = (button, message, isError = false) => {
            const hint = document.createElement('div');
            hint.textContent = message;
            hint.style.position = 'absolute';
            hint.style.background = isError ? '#b00020' : '#333';
            hint.style.color = '#fff';
            hint.style.padding = '4px 8px';
            hint.style.borderRadius = '4px';
            const rect = button.getBoundingClientRect();
            hint.style.top = window.scrollY + rect.top - 30 + 'px';
            hint.style.left = window.scrollX + rect.left + 'px';
            document.body.appendChild(hint);
            setTimeout(() => hint.remove(), 15000);
        };

        document.addEventListener('click', async (event) => {
            const button = event.target.closest('button[data-trigger]');
            if (!button) return;

            event.preventDefault();

            if (!confirm('Are you sure you want to trigger this action?')) return;

            const ruleName = button.dataset.trigger;
            const originalText = button.textContent;
            button.disabled = true;
            button.textContent = 'Triggering '+ ruleName + ' ...';

            try {
                const response = await fetch('/trigger/' + encodeURIComponent(ruleName), { method: 'POST' });
                const data = await response.json().catch(() => ({}));
                const message = data?.[0]?.value?.result?.message || (response.ok ? 'Triggered' : 'Trigger failed');
                showHint(button, message, !response.ok);
            } catch (err) {
                showHint(button, 'Error triggering: ' + (err?.message || err), true);
            } finally {
                button.disabled = false;
                button.textContent = originalText;
            }
        });
    </script>
    `);
    result.push('</head><body>');
    result.push('<h1>Release CD Status</h1>');
    result.push('<div class="env-container">');
    for (const [env, { requiredTests = [], optionalTests = [] }] of Object.entries(config.rule.environments)) {
        const revision = await request.server.app.db.collection(`revision/${env}`).findOne({}, { sort: { $natural: -1 } });
        revisions[env] = revision._id;
        tests[env] = revision.tests;

        result.push('<div class="env-card">');
        result.push(`<h2><a href="vscode://undertree.rest-fs/${env}/">${env}</a></h2>`);
        result.push('<ul>');
        result.push(`<li>ℹ️ Revision ID: <a href="/revision/${env}/${revision._id}?hide=assertions" target="_blank">${revision._id.substring(0, 7)}</a></li>`);
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
                    result.push(`<li>⛔ <a href="${name}" target="_blank">${name.replace(/^https:\/\/github.com\/|.git$/g, '')}</a>@<a href="${name.replace(/\.git/, `/commit/${props.ref}`)}" target="_blank">${props.ref.substring(0, 7)}</a></li>`);
                else
                    result.push(`<li>📁 <a href="${name}" target="_blank">${name.replace(/^https:\/\/github.com\/|.git$/g, '')}</a>@<a href="${name.replace(/\.git/, `/commit/${props.ref}`)}" target="_blank">${props.ref.substring(0, 7)}</a></li>`);
            }
            result.push('</ul>');
        }
        result.push('</details>');

        result.push('<details open><summary>Tests</summary>');
        result.push('<ul>');
        for (const testName of [...requiredTests, ...optionalTests])
            if (!(testName in (revision.tests || {})))
                result.push(`<li>⛔ <code>${testName}</code> missing ${trigger(env, testName)}</li>`);
        for (const [testName, test] of Object.entries(revision.tests || {})) {
            // if the test is not expected, skip it for the next section
            if (![...requiredTests, ...optionalTests].includes(testName)) continue;
            const status = test.totalPassedAssertions == test.totalAssertions
                ? '✅'
                : requiredTests.includes(testName)
                    ? '⛔'
                    : '⚠️';
            result.push(`<li>${status} ${test.report ? `<a href="${test.report}" target="_blank">${testName}</a>` : `${testName}`} failed <code>${((test.totalAssertions || 0) - (test.totalPassedAssertions || 0))}/${test.totalAssertions || 0}, ⌛ ${formatTime(test.duration)}</code> ${trigger(env, testName)}</li>`);
        }
        result.push('</ul>');
        result.push('</details>');
        // Collapsed section for other tests
        const otherTests = Object.entries(revision.tests || {}).filter(([testName]) => ![...requiredTests, ...optionalTests].includes(testName));
        if (otherTests.length) {
            result.push('<details><summary>Auxiliary Tests</summary>');
            result.push('<ul>');
            for (const [testName, test] of otherTests) {
                const status = test.totalPassedAssertions == test.totalAssertions
                    ? '✅'
                    : '⚠️';
                result.push(`<li>${status} ${test.report ? `<a href="${test.report}" target="_blank">${testName}</a>` : `${testName}`} failed <code>${((test.totalAssertions || 0) - (test.totalPassedAssertions || 0))}/${test.totalAssertions || 0}, ⌛ ${formatTime(test.duration)}</code></li>`);
            }
            result.push('</ul>');
            result.push('</details>');
        }

        result.push('<details open><summary>App Health (24h)</summary>');
        result.push(`<div class="health-viz" id="health-${env}">Loading...</div>`);
        result.push(`<script>loadHealthData('${env}', '${config.env[env]}/app');</script>`);
        result.push('</details>');

        result.push('</div>'); // Close env-card
    }
    result.push('</div>'); // Close env-container
    result.push('</body></html>');
    return h.response(result.join('\n')).code(200).type('text/html');
};
