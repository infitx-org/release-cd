import { formatTime } from '../lib/formatTime.mjs';
import config from './config.mjs';

export const cdRevisionGet = async (request, h) => {
    const submoduleProps = {};
    const revisions = {};
    const tests = {};
    let iac;
    let ansible;
    const result = [];
    result.push('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Release CD Status</title>');
    result.push(`<style>
    body {
        font-family: sans-serif;
        background: #f9f9f9;
        color: #222;
        transition: background 0.2s, color 0.2s;
    }
    h2 { margin-top: 2em; }
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
    }
    @media (prefers-color-scheme: dark) {
        body {
        background: #181a1b;
        color: #eee;
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
        background: #23272a;
        color: #e6e6e6;
        }
        a { color: #8ab4f8; }
    }
    </style>`);
    result.push('</head><body>');
    result.push('<h1>Release CD Status</h1>');
    for (const [env, { requiredTests = [], optionalTests = [] }] of Object.entries(config.rule.environments)) {
        const revision = await request.app.db.collection(`revision/${env}`).findOne({}, { sort: { $natural: -1 } });
        revisions[env] = revision._id;
        tests[env] = revision.tests;

        result.push(`<h2>${env}</h2>`);
        result.push('<ul>');
        result.push(`<li>ℹ️ Revision ID: <code>${revision._id}</code></li>`);
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
                    result.push(`<li>⛔ <a href="${name}" target="_blank">${name}</a>@<a href="${name.replace(/\.git/, `/commit/${props.ref}`)}" target="_blank">${props.ref}</a></li>`);
                else
                    result.push(`<li>📁 <a href="${name}" target="_blank">${name}</a>@<a href="${name.replace(/\.git/, `/commit/${props.ref}`)}" target="_blank">${props.ref}</a></li>`);
            }
            result.push('</ul>');
        }
        result.push('</details>');

        result.push('<details open><summary>Tests</summary>');
        result.push('<ul>');
        for (const testName of [...requiredTests, ...optionalTests])
            if (!(testName in (revision.tests || {})))
                result.push(`<li>⛔ <code>${testName}</code> missing</li>`);
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
    }
    result.push('</body></html>');
    return h.response(result.join('\n')).code(200).type('text/html');
};
