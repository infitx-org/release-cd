import Boom from '@hapi/boom';
import axios from 'axios';

import config from '../config.mjs';

const VALID_AGGREGATIONS = new Set(['avg', 'total', 'min', 'max', 'p50', 'p95', 'p99']);

const AGG_LABELS = {
    avg: 'Avg (ms)', total: 'Total (ms)', min: 'Min (ms)',
    max: 'Max (ms)', p50: 'P50 (ms)', p95: 'P95 (ms)', p99: 'P99 (ms)',
};
const AGG_FIELDS = {
    avg: 'avgDurationMs', total: 'totalDurationMs', min: 'minDurationMs',
    max: 'maxDurationMs', p50: 'p50DurationMs', p95: 'p95DurationMs', p99: 'p99DurationMs',
};

function extractAttrValue(value) {
    if (!value) return undefined;
    return value.stringValue ?? value.intValue ?? value.doubleValue ?? value.boolValue ?? undefined;
}

function buildAttrMap(attributes = []) {
    const map = {};
    for (const { key, value } of attributes) {
        map[key] = extractAttrValue(value);
    }
    return map;
}

function extractSpans(trace) {
    const spans = [];
    const parentAttrs = new Map();
    const parents = new Set();
    for (const batch of trace.batches ?? []) {
        const resourceAttrs = buildAttrMap(batch.resource?.attributes);
        for (const libSpans of batch.scopeSpans ?? batch.instrumentationLibrarySpans ?? []) {
            for (const span of libSpans.spans ?? []) {
                const spanAttrs = buildAttrMap(span.attributes);
                parentAttrs.set(span.spanId, spanAttrs);
                // consuming spans are not really included in the duration of their producer
                if (!['consume', 'receive', 'process'].includes(spanAttrs['messaging.operation.name']))
                    parents.add(span.parentSpanId);
                spans.push({
                    name: span.name,
                    spanId: span.spanId,
                    parentId: span.parentSpanId,
                    startTimeUnixNano: span.startTimeUnixNano,
                    endTimeUnixNano: span.endTimeUnixNano,
                    _resourceAttrs: resourceAttrs,
                    _spanAttrs: spanAttrs,
                });
            }
        }
    }
    return spans.map(span => !parents.has(span.spanId) && {
        ...span,
        _spanAttrs: { ...parentAttrs.get(span.parentId), ...span._spanAttrs },
    }); // keep only root spans to avoid double-counting durations in parent-child overlaps
}

function spanMatchesFilter(span, filter) {
    for (const [key, val] of Object.entries(filter)) {
        const spanVal = span._spanAttrs[key] ?? span._resourceAttrs[key];
        if (typeof val === 'object' && val !== null) {
            // Support {min, max} numeric range
            if (val.min !== undefined && Number(spanVal) < Number(val.min)) return false;
            if (val.max !== undefined && Number(spanVal) > Number(val.max)) return false;
        } else {
            if (spanVal === undefined || String(spanVal) !== String(val)) return false;
        }
    }
    return true;
}

function getGroupKey(span, groupBy) {
    return groupBy.map(attr => getAttrValue(span, attr)).join(' | ');
}

function spanDurationMs(span) {
    return (Number(span.endTimeUnixNano) - Number(span.startTimeUnixNano)) / 1e6;
}

function round2(n) {
    return Math.round(n * 100) / 100;
}

function round(n) {
    return Math.round(n);
}

function computeAggregations(durations, aggregations) {
    const sorted = [...durations].sort((a, b) => a - b);
    const count = sorted.length;
    const total = sorted.reduce((s, v) => s + v, 0);
    const result = {};
    for (const agg of aggregations) {
        switch (agg) {
            case 'avg': result.avgDurationMs = round2(total / count); break;
            case 'total': result.totalDurationMs = round2(total); break;
            case 'min': result.minDurationMs = round2(sorted[0]); break;
            case 'max': result.maxDurationMs = round2(sorted[count - 1]); break;
            case 'p50': result.p50DurationMs = round2(sorted[Math.floor(count * 0.5)]); break;
            case 'p95': result.p95DurationMs = round2(sorted[Math.floor(count * 0.95)]); break;
            case 'p99': result.p99DurationMs = round2(sorted[Math.floor(count * 0.99)]); break;
        }
    }
    return result;
}

function parseSince(since) {
    const match = since.match(/^(\d+)(s|m|h|d)$/);
    if (!match) throw Boom.badRequest(`Invalid since format: "${since}". Use e.g. 1h, 30m, 2d`);
    const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
    return parseInt(match[1]) * multipliers[match[2]];
}

function aggregateSpans(spans, groupBy, aggregations) {
    const groups = {};
    for (const span of spans) {
        const key = getGroupKey(span, groupBy);
        if (!groups[key]) {
            const attrs = {};
            for (const attr of groupBy) {
                attrs[attr] = getAttrValue(span, attr);
            }
            groups[key] = { key, attrs, durations: [] };
        }
        groups[key].durations.push(spanDurationMs(span));
    }

    const primaryField = AGG_FIELDS[aggregations[0]];
    return Object.values(groups)
        .map(g => ({
            group: g.key,
            attrs: g.attrs,
            count: g.durations.length,
            ...computeAggregations(g.durations, aggregations),
        }))
        .sort((a, b) => (b[primaryField] ?? 0) - (a[primaryField] ?? 0));
}

// split alphanumeric words and mask the ones containing digits
const maskAlphanumericWords = string => string.split(/(\W+)/).map(word => /\d/.test(word) ? '***' : word).join('');

const getAttrValue = (span, key, emptyValue = '(none)') => {
    key = key.split('|')
        .map(s => s.trim())
        .filter(Boolean);
    for (const k of key) {
        if (k === 'db.statement' && span._spanAttrs['db.system'] === 'redis') return 'db.statement=redis'; // avoid showing full Redis commands
        const val = span._spanAttrs[k] ?? span._resourceAttrs[k];
        if (val !== undefined) return `${k}=${maskAlphanumericWords(String(val))}`;
    }
    return emptyValue;
}

// Build [src, tgt, totalMs] rows for a Sankey across consecutive groupBy layers.
// Each span contributes its duration to every adjacent-layer pair it belongs to.
function buildSankeyLinks(spans, groupByKeys) {
    if (groupByKeys.length < 2) return [];
    const linkTotals = new Map();
    const srcTotals = new Map();
    const tgtTotals = new Map();
    for (const span of spans) {
        const duration = spanDurationMs(span);
        for (let i = 0; i < groupByKeys.length - 1; i++) {
            const srcAttr = groupByKeys[i];
            const tgtAttr = groupByKeys[i + 1];
            const src = getAttrValue(span, srcAttr, `(none) ${i}`);
            const tgt = getAttrValue(span, tgtAttr, `(none) ${i + 1}`);
            if (src === tgt) continue; // skip degenerate self-loops
            const key = `${src}\x00${tgt}`;
            linkTotals.set(key, (linkTotals.get(key) ?? 0) + duration);
            srcTotals.set(src, (srcTotals.get(src) ?? 0) + duration);
            tgtTotals.set(tgt, (tgtTotals.get(tgt) ?? 0) + duration);
        }
    }
    return Array.from(linkTotals.entries())
        .map(([key, total]) => {
            const sep = key.indexOf('\x00');
            return [`${key.slice(0, sep)} (${round(srcTotals.get(key.slice(0, sep)) ?? 0)}ms)`, `${key.slice(sep + 1)} (${round(tgtTotals.get(key.slice(sep + 1)) ?? 0)}ms)`, round2(total)];
        })
        .filter(l => l[2] > 0)
}

const DEFAULT_GROUP_BY = 'k8s.cluster.name,service.name,db.operation|db.statement|messaging.operation.name|http.method,db.sql.table|db.name|messaging.destination.name|http.route|http.target';
const DEFAULT_AGGREGATION = 'total,avg,p95';

export default async function traces(request, h) {
    const tempoUrl = config.tempo?.url;

    const {
        q = '{}',
        start,
        end,
        since,
        limit = 20,
        spanFilter,
        groupBy = DEFAULT_GROUP_BY,
        aggregation = DEFAULT_AGGREGATION,
        format = 'html',
    } = request.query;
    let traceIds = request.query.trace;

    const isUpload = request.method === 'post' && request.payload != null;
    const hasParams = isUpload || traceIds || since || start || end || (request.query.q && request.query.q !== '{}');

    if (!hasParams) {
        if (format === 'html') {
            return h.response(renderFormOnlyHtml({ groupBy, aggregation, q, since, limit, spanFilter })).code(200).type('text/html');
        }
        return h.response({ error: 'Provide trace, since, start/end, or upload a trace file' }).code(400);
    }

    if (!groupBy) {
        throw Boom.badRequest('groupBy is required (comma-separated attribute keys, e.g. db.sql.table,db.operation)');
    }

    const groupByKeys = groupBy.split(',').map(s => s.trim()).filter(Boolean);

    const aggregations = aggregation.split(',').map(s => s.trim()).filter(a => VALID_AGGREGATIONS.has(a));
    if (aggregations.length === 0) {
        throw Boom.badRequest(`Invalid aggregation. Valid values: ${[...VALID_AGGREGATIONS].join(', ')}`);
    }

    let parsedFilter = {};
    if (spanFilter) {
        try {
            parsedFilter = JSON.parse(spanFilter);
        } catch {
            throw Boom.badRequest('spanFilter must be valid JSON (e.g. {"db.system":"mysql"})');
        }
    }

    const allSpans = [];
    let traceCount = 0;

    if (isUpload) {
        // Process uploaded trace JSON directly — no Tempo needed
        allSpans.push(...extractSpans(request.payload));
        traceCount = 1;
    } else {
        if (!tempoUrl) {
            throw Boom.serverUnavailable('tempo.url is not configured. Provide an explicit trace ID or upload a trace file.');
        }

        // Build Tempo search params
        const searchParams = { q, limit: Number(limit) };
        if (since) {
            const seconds = parseSince(since);
            const now = Math.floor(Date.now() / 1000);
            searchParams.start = now - seconds;
            searchParams.end = now;
        } else {
            if (start) searchParams.start = Number(start);
            if (end) searchParams.end = Number(end);
        }

        // Search for matching traces
        if (!traceIds) {
            const searchResponse = await axios.get(`${tempoUrl}/api/search`, { params: searchParams });
            traceIds = (searchResponse.data.traces ?? []).map(t => t.traceID);
        } else {
            traceIds = traceIds.split(',').map(s => s.trim()).filter(Boolean);
        }

        traceCount = traceIds.length;

        // Fetch full traces with limited concurrency to avoid overloading Tempo
        const CONCURRENCY = 1;
        for (let i = 0; i < traceIds.length; i += CONCURRENCY) {
            const batch = traceIds.slice(i, i + CONCURRENCY);
            const responses = await Promise.all(
                batch.map(id => axios.get(`${tempoUrl}/api/traces/${id}`))
            );
            for (const r of responses) {
                allSpans.push(...extractSpans(r.data));
            }
        }
    }

    const totalSpans = allSpans.length;
    const matchingSpans = allSpans.filter(s => s && spanMatchesFilter(s, parsedFilter));
    const rows = aggregateSpans(matchingSpans, groupByKeys, aggregations);

    const result = {
        traces: traceCount,
        matchingSpans: matchingSpans.length,
        totalSpans: totalSpans,
        rows,
        sankeyLinks: buildSankeyLinks(matchingSpans, groupByKeys),
    };

    if (format === 'html') {
        return h.response(renderHtml(result, groupByKeys, aggregations, request.query)).code(200).type('text/html');
    }
    return h.response(result).code(200);
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function buildFormHtml(params = {}, collapsed = false) {
    const v = k => escapeHtml(String(params[k] ?? ''));
    const groupBy = v('groupBy') || escapeHtml(DEFAULT_GROUP_BY);
    const aggregation = v('aggregation') || escapeHtml(DEFAULT_AGGREGATION);
    return `
<details class="trace-form-wrap"${collapsed ? '' : ' open'}>
  <summary class="trace-form-toggle">&#9881; Query / Upload</summary>
  <form id="traceForm" class="trace-form">
    <div class="form-row">
      <label class="form-label">Trace ID(s)
        <input class="form-input" name="trace" type="text" value="${v('trace')}" placeholder="comma-separated trace IDs">
      </label>
      <span class="form-or">or</span>
      <label class="form-label">Upload trace file (.json)
        <input class="form-input" type="file" id="traceFile" accept=".json">
      </label>
    </div>
    <div class="form-row">
      <label class="form-label">Group by
        <input class="form-input form-input--wide" name="groupBy" type="text" value="${groupBy}">
      </label>
      <label class="form-label">Aggregation
        <input class="form-input" name="aggregation" type="text" value="${aggregation}">
      </label>
    </div>
    <details class="form-advanced">
      <summary>Advanced</summary>
      <div class="form-row form-row--advanced">
        <label class="form-label">TraceQL query <input class="form-input" name="q" type="text" value="${v('q')}" placeholder="{}"></label>
        <label class="form-label">Since        <input class="form-input form-input--sm" name="since" type="text" value="${v('since')}" placeholder="e.g. 1h, 30m"></label>
        <label class="form-label">Limit        <input class="form-input form-input--sm" name="limit" type="number" value="${v('limit') || '20'}" min="1"></label>
        <label class="form-label">Span filter  <input class="form-input" name="spanFilter" type="text" value="${v('spanFilter')}" placeholder='{"db.system":"mysql"}'></label>
      </div>
    </details>
    <div class="form-actions">
      <button class="form-btn" type="submit">Analyze</button>
      <span id="form-status" class="form-status"></span>
    </div>
  </form>
</details>
<script>
(function () {
  var form = document.getElementById('traceForm');
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var file = document.getElementById('traceFile').files[0];
    var params = new URLSearchParams();
    ['groupBy', 'aggregation', 'q', 'since', 'limit', 'spanFilter'].forEach(function (n) {
      var el = form.querySelector('[name="' + n + '"]');
      if (el && el.value && el.value !== '{}') params.set(n, el.value);
    });
    var status = document.getElementById('form-status');
    if (file) {
      status.textContent = 'Reading file\u2026';
      try {
        var text = await file.text();
        status.textContent = 'Uploading\u2026';
        var resp = await fetch('/traces?' + params, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: text
        });
        var html = await resp.text();
        document.open();
        document.write(html);
        document.close();
      } catch (err) {
        status.textContent = 'Error: ' + err.message;
      }
    } else {
      var trace = form.querySelector('[name="trace"]').value.trim();
      if (trace) params.set('trace', trace);
      if (!trace && !params.get('since') && !params.get('q')) {
        alert('Enter a trace ID, a "since" value, a TraceQL query, or upload a file.');
        return;
      }
      window.location.href = '/traces?' + params;
    }
  });
}());
</script>`;
}

function renderFormOnlyHtml(params) {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Trace Span Aggregation</title>
<style>
* { box-sizing: border-box; }
body { font-family: sans-serif; background: #f9f9f9; color: #222; margin: 0; padding: 20px; }
h1 { margin: 0 0 16px 0; }
${FORM_CSS}
</style>
</head>
<body>
<h1>Trace Span Aggregation</h1>
${buildFormHtml(params, false)}
</body>
</html>`;
}

const FORM_CSS = `
.trace-form-wrap { background: white; border: 1px solid #ddd; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.06); }
.trace-form-toggle { cursor: pointer; font-weight: 600; font-size: 0.95em; color: #444; user-select: none; }
.trace-form { margin-top: 12px; }
.form-row { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; margin-bottom: 10px; }
.form-row--advanced { margin-top: 8px; }
.form-label { display: flex; flex-direction: column; font-size: 0.8em; color: #555; font-weight: 600; gap: 3px; }
.form-input { font-size: 0.9rem; padding: 5px 8px; border: 1px solid #ccc; border-radius: 4px; background: #fafafa; min-width: 180px; }
.form-input--wide { min-width: 340px; }
.form-input--sm { min-width: 90px; }
.form-or { font-size: 0.85em; color: #888; align-self: center; margin: 0 4px; }
.form-advanced { margin-top: 6px; font-size: 0.85em; color: #666; }
.form-advanced summary { cursor: pointer; }
.form-actions { margin-top: 10px; display: flex; align-items: center; gap: 12px; }
.form-btn { background: #0066cc; color: white; border: none; border-radius: 4px; padding: 7px 20px; font-size: 0.9em; cursor: pointer; }
.form-btn:hover { background: #0055aa; }
.form-status { font-size: 0.85em; color: #666; }
`;

function renderHtml(result, groupByKeys, aggregations, params) {
    const headers = [
        ...groupByKeys.map(k => k.replace(/\|/g, ' / ')),
        'Count',
        ...aggregations.map(a => AGG_LABELS[a]),
    ];
    const tableRows = result.rows.map(r => [
        ...groupByKeys.map(k => r.attrs[k] ?? '(none)'),
        r.count,
        ...aggregations.map(a => r[AGG_FIELDS[a]] ?? '-'),
    ]);

    const metaParts = [
        `Traces: <strong>${result.traces}</strong>`,
        `Total spans: <strong>${result.totalSpans}</strong>`,
        `Matching leaf spans: <strong>${result.matchingSpans}</strong>`,
        `Groups: <strong>${result.rows.length}</strong>`,
    ];
    if (params.q && params.q !== '{}') metaParts.push(`Query: <code>${escapeHtml(params.q)}</code>`);
    if (params.spanFilter) metaParts.push(`Filter: <code>${escapeHtml(params.spanFilter)}</code>`);
    if (params.since) metaParts.push(`Since: <code>${escapeHtml(params.since)}</code>`);

    const tableHtml = result.rows.length === 0
        ? '<p>No matching spans found.</p>'
        : `<table>
<thead><tr>${headers.map((h, i) => `<th class="${i >= groupByKeys.length ? 'num' : ''}">${escapeHtml(String(h))}</th>`).join('')}</tr></thead>
<tbody>
${tableRows.map(row =>
            `<tr>${row.map((cell, i) =>
                `<td class="${i >= groupByKeys.length ? 'num' : ''}">${escapeHtml(String(cell))}</td>`
            ).join('')}</tr>`
        ).join('\n')}
</tbody>
</table>`;

    const hasSankey = groupByKeys.length >= 2 && result.sankeyLinks.length > 0;

    const sankeyHtml = hasSankey
        ? `<h2 class="section-title">Duration Flow (total ms)</h2>
<div id="sankey_chart" class="chart-box"></div>`
        : '';

    // Nodes appear in the DataTable in the order they first occur across the rows.
    // We pre-compute that order here (server-side) so we can assign a consistent
    // per-layer colour to every node in the client-side chart script.
    const sankeyScript = hasSankey ? buildSankeyScript(result.sankeyLinks, groupByKeys) : '';

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Trace Span Aggregation</title>
<style>
* { box-sizing: border-box; }
body { font-family: sans-serif; background: #f9f9f9; color: #222; margin: 0; padding: 20px; }
h1 { margin: 0 0 12px 0; }
.section-title { margin: 24px 0 8px; font-size: 1.05em; color: #444; font-weight: 600; }
.meta { color: #555; font-size: 0.9em; margin-bottom: 20px; display: flex; flex-wrap: wrap; gap: 12px; }
.meta span { background: white; border: 1px solid #ddd; border-radius: 4px; padding: 4px 10px; }
code { background: #f0f0f0; padding: 1px 4px; border-radius: 3px; font-size: 0.85em; }
.chart-box { width: 100%; height: 1000px; background: white; border: 1px solid #ddd; border-radius: 8px;
             box-shadow: 0 2px 4px rgba(0,0,0,0.08); overflow: hidden; margin-bottom: 4px; }
table { border-collapse: collapse; width: 100%; background: white; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.08); }
th { background: #0066cc; color: white; padding: 10px 14px; text-align: left; font-size: 0.82em; text-transform: uppercase; letter-spacing: 0.05em; white-space: pre-wrap; }
th.num { text-align: right; }
td { padding: 8px 14px; font-size: 0.9em; border-bottom: 1px solid #eee; white-space: nowrap; }
tr:last-child td { border-bottom: none; }
tr:hover td { background: #f0f7ff; }
td.num { text-align: right; font-variant-numeric: tabular-nums; }
${FORM_CSS}
</style>
</head>
<body>
<h1>Trace Span Aggregation</h1>
${buildFormHtml(params, true)}
<div class="meta">${metaParts.map(p => `<span>${p}</span>`).join('')}</div>
${sankeyHtml}
${hasSankey ? '<h2 class="section-title">Breakdown Table</h2>' : ''}
${tableHtml}
${sankeyScript}
</body>
</html>`;
}

function buildSankeyScript(sankeyLinks, groupByKeys) {
    // Compute the node appearance order (same order Google Charts will assign colours)
    // so we can map each node to a per-layer palette colour deterministically.
    const seenNodes = [];
    const seenSet = new Set();
    for (const [src, tgt] of sankeyLinks) {
        if (!seenSet.has(src)) { seenSet.add(src); seenNodes.push(src); }
        if (!seenSet.has(tgt)) { seenSet.add(tgt); seenNodes.push(tgt); }
    }
    const palette = ['#1a73e8', '#ea8600', '#0f9d58', '#a142f4', '#d93025', '#007b83'];
    const nodeColors = seenNodes.map(n => {
        const idx = groupByKeys.findIndex(k => k.split('|').some(part => n.startsWith(`${part}=`)));
        return palette[Math.max(0, idx) % palette.length];
    });

    return `
<script src="https://www.gstatic.com/charts/loader.js"></script>
<script>
(function () {
    var links = ${JSON.stringify(sankeyLinks)};
    var nodeColors = ${JSON.stringify(nodeColors)};
    google.charts.load('current', { packages: ['sankey'] });
    google.charts.setOnLoadCallback(function () {
        var dt = new google.visualization.DataTable();
        dt.addColumn('string', 'From');
        dt.addColumn('string', 'To');
        dt.addColumn('number', 'Total ms');
        dt.addRows(links);
        var options = {
            height: 1000,
            sankey: {
                node: {
                    label: { fontSize: 12, color: '#222', bold: false },
                    interactivity: true,
                    width: 20,
                    nodePadding: 10,
                    colors: nodeColors,
                },
                link: { colorMode: 'gradient', fillOpacity: 0.35 },
            },
        };
        var el = document.getElementById('sankey_chart');
        var chart = new google.visualization.Sankey(el);
        var draw = function () { chart.draw(dt, Object.assign({}, options, { width: el.clientWidth })); };
        window.addEventListener('resize', draw);
        draw();
    });
}());
</script>`;
}
