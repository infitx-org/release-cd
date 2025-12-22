const { expect } = require('@jest/globals');

describe('Jest diff output demonstration', () => {

    test('string difference', () => {
        expect('hello world').toBe('hello Word'); // Shows diff for strings
    });

    test('string difference', () => {
        expect('hello world\nline 1\nline 2').toBe('hello Word\n line x\nline 2'); // Shows diff for strings
    });
});