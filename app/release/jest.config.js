module.exports = {
    setupFilesAfterEnv: ['jest-expect-message'],
    testEnvironment: 'allure-jest/node',
    testMatch: ['**/__tests__/**/*.js?(x)', '**/?(*.)+(spec|test).js?(x)', '**/*.steps.js'],
    collectCoverage: false,
    coverageDirectory: 'coverage',
    testTimeout: 60000,
    verbose: true,
    transform: {},
};
