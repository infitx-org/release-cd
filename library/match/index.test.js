const fs = require('fs');
const path = require('path');
const yaml = require('yaml');
const match = require('./');
const yamlPath = path.join(__dirname, 'match.test.yaml');
const isPlainObject = require('lodash/isPlainObject');

const loadTestCases = () => {
    // Load patterns and values from YAML file
    const cases = yaml.parse(fs.readFileSync(yamlPath, 'utf8'), { customTags: ['timestamp'] });
    return cases
        .filter(({ rule }) => rule)
        .map(({ rule, like, unlike }) => {
            // Convert any string in rule that looks like /pattern/ to RegExp also convert arrow functions
            const convertRegex = (obj, call) => {
                if (typeof obj === 'string') {
                    const regexMatch = obj.match(/^\/(.+)\/([gimsuy]*)$/);
                    if (regexMatch) {
                        return new RegExp(regexMatch[1], regexMatch[2]);
                    }
                    // Convert arrow functions from string, e.g. "(x) => x > 5"
                    const fnMatch = obj.match(/^\s*\(?[\w\s,]*\)?\s*=>/);
                    if (fnMatch) {
                        // eslint-disable-next-line no-new-func
                        return call ? eval(obj)() : eval(obj);
                    }
                    return obj;
                } else if (Array.isArray(obj)) {
                    return obj.map(item => convertRegex(item, call));
                } else if (isPlainObject(obj)) {
                    return Object.fromEntries(
                        Object.entries(obj).map(([k, v]) => [k, convertRegex(v, call)])
                    );
                }
                return obj;
            };

            return {
                rule: convertRegex(rule),
                like: convertRegex(like, true),
                unlike: convertRegex(unlike, true),
            };
        });
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

describe('match', () => {
    const testCases = loadTestCases();
    testCases.forEach(({ rule, like, unlike }, idx) => {
        like !== undefined &&
            test(`YAML case #${idx + 1}:   like(${stringify(like)},${stringify(rule)})`, () => {
                expect(match(like, rule)).toBe(true);
            });

        unlike !== undefined &&
            test(`YAML case #${idx + 1}: unlike(${stringify(unlike)},${stringify(rule)})`, () => {
                expect(match(unlike, rule)).toBe(false);
            });
    });
});

