module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/__tests__/**/*.js?(x)', '**/?(*.)+(spec|test).js?(x)', '**/*.steps.js'],
    collectCoverage: false,
    coverageDirectory: 'coverage',
    testTimeout: 15000,
    verbose: true,
};
