---
applyTo:
  - "library/**/*.js"
  - "library/**/*.test.js"
description: Coding standards and patterns for shared library packages
---

# Library Package Guidelines

These instructions apply to all code in the `library/` directory, which contains shared utility packages used across the monorepo.

## Module Format

- **Use CommonJS** (`require()` and `module.exports`) for broader compatibility
- Libraries should work in both Node.js and potentially browser environments
- Use `.js` extension (not `.mjs`)

## Code Style

### Exports
```javascript
// Prefer named exports
module.exports = {
  match,
  compareArrays,
  coerceTypes
};

// Or single function export
module.exports = function match(pattern, target, options) {
  // implementation
};
```

### Documentation
- Add JSDoc comments for all public functions
- Document parameters, return values, and examples
- Include `@param`, `@returns`, `@example` tags

```javascript
/**
 * Matches a pattern against a target object.
 * @param {Object} pattern - The pattern to match
 * @param {Object} target - The target to match against
 * @param {Object} options - Optional matching configuration
 * @param {boolean} options.coerceTypes - Enable type coercion
 * @returns {boolean} True if pattern matches target
 * @example
 * match({ a: 1 }, { a: 1, b: 2 }); // true
 */
function match(pattern, target, options = {}) {
  // implementation
}
```

## Testing

- Colocate test files with source: `match.js` → `match.test.js`
- Use Jest for all tests
- Follow Arrange-Act-Assert pattern
- Test edge cases and error conditions

## Error Handling

- Throw standard Error objects with descriptive messages
- Validate inputs and fail fast
- Don't use framework-specific errors (@hapi/boom is only for apps)

```javascript
if (typeof pattern !== 'object') {
  throw new Error('Pattern must be an object');
}
```

## Dependencies

- Minimize external dependencies
- Only depend on other workspace packages using `workspace:*`
- Document all dependencies and their purpose

## Performance

- Avoid unnecessary object/array copies
- Use early returns to minimize nested logic
- Consider memory usage for large data structures

## Package Structure

```
library/package-name/
├── index.js           # Main entry point
├── lib/              # Internal modules (if needed)
├── test/             # Test files
├── package.json
└── README.md
```

## Current Libraries

- **@infitx/match**: Pattern matching utility
- **@infitx/decision**: Rule engine (depends on @infitx/match)
- **@infitx/rest-fs**: REST filesystem plugin

When modifying libraries, ensure changes don't break dependent packages.
