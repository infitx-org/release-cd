const fs = require('fs');
const path = require('path');
const yaml = require('yaml');
const decision = require('./');
const isPlainObject = require('lodash/isPlainObject');

const yamlPath = path.join(__dirname, 'decision.test.yaml');

const loadTestCases = () => {
    // Load patterns and values from YAML file
    return yaml.parse(fs.readFileSync(yamlPath, 'utf8'), { customTags: ['timestamp'] });
};

function stringify(value) {
    if (value instanceof RegExp) return value.toString();
    if (value instanceof Date) return value.toString();
    if (typeof value === 'number') return String(value);
    if (typeof value === 'function') return value.toString();
    if (value instanceof Array) return `[${value.map(stringify).join(', ')}]`;
    if (value && typeof value === 'object') {
        const entries = Object.entries(value)
            .map(([k, v]) => `${k}: ${stringify(v)}`)
            .join(', ');
        return `{${entries}}`;
    }
    return JSON.stringify(value);
}

describe('decide', () => {
    const testCases = loadTestCases();
    const rules = Object.entries(testCases.rules).map(([id, value]) => ({ id, ...value }));
    testCases.tests.forEach(({ fact, expected }) => {
        test(`fact: ${stringify(fact)}`, () => {
            expect(decision(rules, fact)).toEqual(expected);
        });
    });
});
