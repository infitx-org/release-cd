---
applyTo:
  - "**/*.test.js"
description: Testing standards for Jest unit tests across the monorepo
---

# Testing Guidelines

These instructions apply to all Jest test files (`*.test.js`) in the monorepo.

## Test Structure

### Use Describe Blocks for Organization
```javascript
describe('ComponentName', () => {
  describe('methodName', () => {
    it('should behave correctly when condition', () => {
      // test implementation
    });
  });
});
```

### Arrange-Act-Assert Pattern
Always structure tests with clear phases:

```javascript
it('should match partial objects', () => {
  // Arrange: Set up test data
  const pattern = { a: 1 };
  const target = { a: 1, b: 2 };
  
  // Act: Execute the code under test
  const result = match(pattern, target);
  
  // Assert: Verify the result
  expect(result).toBe(true);
});
```

## Descriptive Test Names

Use clear, behavior-focused test names:

✅ Good:
```javascript
it('should return true when pattern partially matches target')
it('should throw error when pattern is not an object')
it('should coerce string to number when coerceTypes is true')
```

❌ Bad:
```javascript
it('works')
it('test match function')
it('should pass')
```

## Mocking

### Mock External Dependencies
```javascript
// Mock entire module
jest.mock('@kubernetes/client-node');

// Mock specific functions
jest.mock('../config.mjs', () => ({
  getConfig: jest.fn(() => ({ port: 3000 }))
}));

// Restore mocks after tests
afterEach(() => {
  jest.clearAllMocks();
});
```

### Mock Implementation Examples
```javascript
// Mock with return value
const mockFetch = jest.fn().mockResolvedValue({ 
  json: () => ({ data: 'value' }) 
});

// Mock with different responses
const mockApi = jest.fn()
  .mockResolvedValueOnce({ success: true })
  .mockRejectedValueOnce(new Error('Failed'));

// Verify mock was called
expect(mockFetch).toHaveBeenCalledWith('https://api.example.com');
expect(mockFetch).toHaveBeenCalledTimes(1);
```

## Jest Configuration

### Available Jest Commands
```bash
# Libraries
npm run ci-unit           # CI mode with coverage
npm run watch             # Watch mode for TDD

# Applications
npm test                  # Run tests with reporting
```

### Coverage Expectations
- Libraries: Aim for >80% coverage
- Applications: Focus on business logic coverage
- Always test edge cases and error conditions

## Common Testing Patterns

### Testing Async Functions
```javascript
it('should handle async operations', async () => {
  // Use async/await in tests
  const result = await asyncFunction();
  expect(result).toBeDefined();
});

it('should handle errors in async functions', async () => {
  // Test error cases
  await expect(asyncFunction()).rejects.toThrow('Error message');
});
```

### Testing Error Conditions
```javascript
it('should throw error for invalid input', () => {
  expect(() => {
    functionUnderTest(null);
  }).toThrow('Invalid input');
});
```

### Testing HTTP Endpoints (Applications)
```javascript
import request from 'supertest';
import app from '../src/index.mjs';

it('should return 200 for health check', async () => {
  const response = await request(app).get('/health');
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ status: 'ok' });
});
```

## Test Data

### Use Factories for Complex Objects
```javascript
function createTestUser(overrides = {}) {
  return {
    id: '123',
    name: 'Test User',
    email: 'test@example.com',
    ...overrides
  };
}

it('should handle user data', () => {
  const user = createTestUser({ name: 'Custom Name' });
  // test with user
});
```

### Keep Test Data Minimal
Only include data relevant to the test:

```javascript
// ✅ Good: Only relevant fields
const pattern = { type: 'transfer' };

// ❌ Bad: Unnecessary details
const pattern = {
  type: 'transfer',
  id: '123',
  timestamp: '2024-01-01',
  metadata: { ... } // Not needed for this test
};
```

## Test Isolation

### Clean Up After Tests
```javascript
beforeEach(() => {
  // Set up test state
});

afterEach(() => {
  // Clean up
  jest.clearAllMocks();
  // Reset any test state
});
```

### Avoid Test Interdependence
- Each test should be independent
- Don't rely on execution order
- Don't share mutable state between tests

## What Not to Test

- Don't test external libraries' functionality
- Don't test implementation details (test behavior)
- Don't duplicate tests (one test per behavior)
- Don't test private functions directly (test through public API)

## Performance

- Use `--runInBand` for tests that conflict
- Mock slow operations (network, file system, database)
- Keep test execution fast (<5 seconds per suite ideally)

## CI Integration

Tests run in CI with:
- Coverage reporting
- JUnit XML output for test results
- Allure reporting (applications)

Ensure tests pass locally before pushing:
```bash
cd library/package-name
npm run ci-unit
```
