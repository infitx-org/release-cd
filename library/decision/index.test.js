const path = require('path');
const decision = require('./');

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
    const { decide, tests } = decision(path.join(__dirname, 'decision.test.yaml'));
    tests.forEach(({ fact, expected }) => {
        test(`fact: ${stringify(fact)}`, () => {
            expect(decide(fact)).toEqual(expected);
        });
    });
});
