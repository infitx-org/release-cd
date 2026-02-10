module.exports = {
    testEnvironment: 'allure-jest/node',
    testMatch: ['**/*.test.js'],
    collectCoverageFrom: [
        'index.js',
        'debug-proxy.js'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    reporters: [
        'default',
        ['jest-junit', {
            outputDirectory: 'coverage',
            outputName: 'junit.xml'
        }]
    ],
    testTimeout: 30000,
    verbose: true
};
