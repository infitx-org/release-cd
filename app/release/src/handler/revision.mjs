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
    </style>`);
    result.push(`
<script>
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
            const status = test.totalPassedAssertions == test.totalAssertions
                ? '✅'
                : requiredTests.includes(testName)
                    ? '⛔'
                    : '⚠️';
            result.push(`<li>${status} ${test.report ? `<a href="${test.report}" target="_blank">${testName}</a>` : `${testName}`} failed <code>${((test.totalAssertions || 0) - (test.totalPassedAssertions || 0))}/${test.totalAssertions || 0}, ⌛ ${formatTime(test.duration)}</code></li>`);
        }
        result.push('</ul>');
        result.push('</details>');
        result.push('</div>'); // Close env-card
    }
    result.push('</div>'); // Close env-container
    result.push('</body></html>');
    return h.response(result.join('\n')).code(200).type('text/html');
};
