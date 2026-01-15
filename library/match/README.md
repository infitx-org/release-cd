# Match Function

A flexible matching utility that compares values with advanced semantic rules,
supporting nested structures, arrays, type coercion, and various matching strategies.

## Installation

```javascript
const match = require('./match');
```

## Basic Usage

```javascript
const match = require('./match');

// Exact match
match({ a: 1 }, { a: 1 }); // true
match({ a: 1 }, { a: 2 }); // false

// Partial object match
match({ a: 1, b: 2 }, { a: 1 }); // true
```

## Matching Against Nested Structures

The match function recursively compares nested objects:

```javascript
// Nested object matching
match(
  { user: { name: 'Alice', age: 30 } },
  { user: { name: 'Alice' } }
); // true - partial match on nested object

match(
  { user: { name: 'Alice', age: 30 } },
  { user: { name: 'Bob' } }
); // false - name doesn't match

// Deep nesting
match(
  { a: { b: { c: { d: 'value' } } } },
  { a: { b: { c: { d: 'value' } } } }
); // true

match(
  { a: { b: { c: { d: 'value', e: 'extra' } } } },
  { a: { b: { c: { d: 'value' } } } }
); // true - extra properties are ignored
```

## Array Matching (Any-Of Semantics)

Arrays implement "any of" semantics - at least one element must match. The
behavior varies depending on whether arrays appear in the value, the condition,
or both.

### Array in Condition (Rule)

When the condition is an array, the value must match **at least one** element
in the array:

```javascript
// Scalar value against array condition
match('hello', ['hello', 'world']); // true - matches first element
match('world', ['hello', 'world']); // true - matches second element
match('goodbye', ['hello', 'world']); // false - matches none

// With numbers
match(5, [1, 5, 10]); // true
match(7, [1, 5, 10]); // false

// With booleans
match(true, [true, false]); // true
match(false, [true]); // false

// In nested structures - scalar value against array condition
match(
  { status: 'active' },
  { status: ['active', 'pending', 'processing'] }
); // true - status matches one of the allowed values

match(
  { status: 'inactive' },
  { status: ['active', 'pending'] }
); // false - status doesn't match any allowed value
```

### Array in Value

When the value is an array, **at least one element** must match the condition:

```javascript
// Array value against scalar condition
match(['apple', 'banana'], 'apple'); // true - first element matches
match(['apple', 'banana'], 'banana'); // true - second element matches
match(['apple', 'banana'], 'orange'); // false - no element matches

// With numbers
match([1, 2, 3], 2); // true
match([1, 2, 3], 5); // false

// In nested structures - array value against scalar condition
match(
  { tags: ['javascript', 'node', 'async'] },
  { tags: 'javascript' }
); // true - at least one tag matches

match(
  { tags: ['python', 'django'] },
  { tags: 'javascript' }
); // false - no tag matches

// Array value against function condition
match(
  { scores: [85, 90, 78] },
  { scores: (score) => score >= 80 }
); // true - at least one score is >= 80

match(
  { scores: [65, 70, 75] },
  { scores: (score) => score >= 80 }
); // false - no score is >= 80
```

### Array in Both Value and Condition

When both are arrays, a match occurs if **any value element matches any
condition element**:

```javascript
// Both arrays - cartesian "any of any" matching
match(['red', 'blue'], ['blue', 'green']); // true - 'blue' appears in both
match(['red', 'yellow'], ['blue', 'green']); // false - no common elements

match([1, 2, 3], [3, 4, 5]); // true - '3' is in both
match([1, 2], [3, 4]); // false - no overlap

// In nested structures
match(
  { tags: ['javascript', 'node'] },
  { tags: ['node', 'async', 'backend'] }
); // true - 'node' is in both arrays

match(
  { tags: ['python', 'django'] },
  { tags: ['javascript', 'react'] }
); // false - no common tags

// Complex: array value against array of conditions (including objects)
match(
  { priority: [1, 2, 3] },
  { priority: [{ min: 2, max: 5 }, 10] }
); // true - elements 2 and 3 match the range { min: 2, max: 5 }

match(
  { priority: [1] },
  { priority: [{ min: 2, max: 5 }, 10] }
); // false - 1 doesn't match range or 10
```

### Array Value Against Object Condition

When an array value is matched against an object condition (like a range or
complex object), each element is tested against the condition:

```javascript
// Array value against range condition
match(
  [1, 5, 10],
  { min: 3, max: 7 }
); // true - element '5' falls within the range

match(
  [1, 2],
  { min: 3, max: 7 }
); // false - no element falls within the range

// In nested structures
match(
  { scores: [45, 67, 89, 92] },
  { scores: { min: 80 } }
); // true - elements 89 and 92 are >= 80

match(
  { scores: [45, 67, 75] },
  { scores: { min: 80 } }
); // false - no score is >= 80

// Array value against regex condition
match(
  { emails: ['admin@test.com', 'invalid', 'user@test.com'] },
  { emails: /@test\.com$/ }
); // true - at least one email matches the pattern

match(
  { emails: ['invalid1', 'invalid2'] },
  { emails: /@test\.com$/ }
); // false - no email matches
```

### Combining Arrays with Null

Arrays can include `null` to make conditions optional:

```javascript
// Array with null - matches if property is missing OR matches other values
match(
  { status: 'active' },
  { status: [null, 'active'] }
); // true - matches 'active'

match(
  { name: 'Alice' },
  { status: [null, 'active'] }
); // true - 'status' is missing, matches null

match(
  { status: false },
  { status: [null, 'active'] }
); // false - false is neither null nor 'active'

match(
  { status: undefined },
  { status: [null, 'active'] }
); // true - undefined treated as null

// Nested with arrays and null
match(
  { user: { role: 'admin' } },
  { user: { role: [null, 'admin', 'moderator'] } }
); // true - role matches 'admin'

match(
  { user: { name: 'Alice' } },
  { user: { role: [null, 'admin'], name: 'Alice' } }
); // true - role is missing (matches null), name matches
```

### Array Behavior Summary

| Value Type | Condition Type             | Behavior                                      |
| ---------- | -------------------------- | --------------------------------------------- |
| Scalar     | Array                      | Value must match at least one array element   |
| Array      | Scalar                     | At least one value must match the scalar      |
| Array      | Array                      | At least one value must match one condition   |
| Array      | Object (range/complex)     | At least one value must match the condition   |
| Array      | Function                   | At least one value must satisfy the function  |

## Matching Against Non-Existing Properties

The match function has special handling for `null` values to match against
non-existing properties:

```javascript
// null matches undefined/missing properties
match({ b: 0 }, { a: null }); // true - 'a' is missing

match({ a: null }, { a: null }); // true - both null

match({ a: undefined }, { a: null }); // true - undefined treated as null

match({ a: false }, { a: null }); // false - false is not null

match({ a: 0 }, { a: null }); // false - 0 is not null

match({ a: '' }, { a: null }); // false - empty string is not null

// Nested non-existing properties
match(
  { a: {} },
  { a: { b: null } }
); // true - 'b' doesn't exist in nested object

match(
  { a: { b: false } },
  { a: { b: null } }
); // false - 'b' exists and is false

// Array with null for optional properties
match(
  { status: 'active' },
  { status: [null, 'active'] }
); // true - matches 'active'

match(
  { name: 'Alice' },
  { status: [null, 'active'] }
); // true - 'status' is missing, matches null

match(
  { status: false },
  { status: [null, 'active'] }
); // false - false doesn't match null or 'active'
```

## Type Coercion

The function coerces values to match the type of the rule:

```javascript
// Boolean coercion
match('hello', true); // true - truthy string
match('', false); // true - falsy empty string
match(0, false); // true - falsy zero
match(1, true); // true - truthy number

// String coercion
match(123, '123'); // true
match(true, 'true'); // true

// Number coercion
match('42', 42); // true
match('3.14', 3.14); // true
```

## Range Matching

Use `min` and `max` for numeric and date range matching:

```javascript
// Numeric ranges
match(5, { min: 1, max: 10 }); // true
match(15, { min: 1, max: 10 }); // false
match(1, { min: 1 }); // true - only minimum
match(10, { max: 10 }); // true - only maximum

// Date ranges
const now = new Date('2025-06-15');
const start = new Date('2025-01-01');
const end = new Date('2025-12-31');

match(now, { min: start, max: end }); // true
match(new Date('2026-01-01'), { min: start, max: end }); // false

// Nested range matching
match(
  { user: { age: 25 } },
  { user: { age: { min: 18, max: 65 } } }
); // true
```

## Function Predicates

Use functions for custom matching logic:

```javascript
// Function as rule
match(10, (value) => value > 5); // true
match(3, (value) => value > 5); // false

// Complex predicate
match(
  'hello@example.com',
  (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
); // true - valid email

// Function in nested structure
match(
  { user: { age: 25 } },
  { user: { age: (age) => age >= 18 } }
); // true
```

## Negation with `not`

Use the `not` property in an object condition to negate any match:

```javascript
// Basic negation
match(3, { not: 5 }); // true - 3 is not 5
match(5, { not: 5 }); // false - 5 is 5

// Negate string match
match('goodbye', { not: 'hello' }); // true
match('hello', { not: 'hello' }); // false

// Negate boolean
match(false, { not: true }); // true
match(true, { not: true }); // false
match(0, { not: true }); // true - 0 is falsy, not true
match(1, { not: true }); // false - 1 coerces to true

// Negate null
match(0, { not: null }); // true - 0 is not null
match(null, { not: null }); // false
match(undefined, { not: null }); // false - undefined treated as null

// In nested structures
match(
  { status: 'inactive' },
  { status: { not: 'active' } }
); // true

match(
  { status: 'active' },
  { status: { not: 'active' } }
); // false
```

### Negating Complex Conditions

The `not` property works with all match types including arrays, ranges,
functions, and regex:

```javascript
// Negate regex
match('goodbye', { not: /hello/ }); // true
match('hello world', { not: /hello/ }); // false

match(
  { email: 'user@domain.org' },
  { email: { not: /@example\.com$/ } }
); // true - doesn't end with @example.com

// Negate array (none of)
match(5, { not: [1, 2, 3] }); // true - 5 is not in the list
match(2, { not: [1, 2, 3] }); // false - 2 is in the list

match(
  { role: 'guest' },
  { role: { not: ['admin', 'moderator'] } }
); // true - guest is neither admin nor moderator

match(
  { role: 'admin' },
  { role: { not: ['admin', 'moderator'] } }
); // false - admin is in the list

// Negate range
match(3, { not: { min: 5, max: 10 } }); // true - 3 is outside the range
match(7, { not: { min: 5, max: 10 } }); // false - 7 is in the range
match(15, { not: { min: 5, max: 10 } }); // true - 15 is outside the range

match(
  { age: 15 },
  { age: { not: { min: 18, max: 65 } } }
); // true - age is below minimum

match(
  { age: 25 },
  { age: { not: { min: 18, max: 65 } } }
); // false - age is in range

// Negate function predicate
match(3, { not: (v) => v > 5 }); // true - 3 is not > 5
match(10, { not: (v) => v > 5 }); // false - 10 is > 5

match(
  { price: 25 },
  { price: { not: (p) => p >= 100 } }
); // true - price is not >= 100

// Negate object match
match(
  { user: { role: 'guest' } },
  { user: { not: { role: 'admin' } } }
); // true - role is not admin

match(
  { user: { role: 'admin' } },
  { user: { not: { role: 'admin' } } }
); // false - role is admin

// Complex negation in nested structures
match(
  {
    user: {
      email: 'user@custom.com',
      role: 'user'
    }
  },
  {
    user: {
      email: { not: /@example\.com$/ },
      role: { not: ['admin', 'moderator'] }
    }
  }
); // true - email doesn't end with @example.com and role is not admin/moderator
```

### Combining `not` with Other Conditions

You can combine `not` with other conditions in complex matching scenarios:

```javascript
// Exclude certain values while checking other properties
match(
  { status: 'pending', priority: 2 },
  {
    status: { not: ['cancelled', 'completed'] },
    priority: { min: 1, max: 3 }
  }
); // true - status is not cancelled/completed and priority is in range

// Array values with negation
match(
  { tags: ['javascript', 'backend'] },
  { tags: { not: 'frontend' } }
); // true - none of the tags are 'frontend'

match(
  { tags: ['javascript', 'frontend'] },
  { tags: { not: 'frontend' } }
); // false - 'frontend' is in the tags
```

## Regular Expression Matching

```javascript
// Regex patterns
match('hello world', /hello/); // true
match('goodbye world', /hello/); // false

// Case-insensitive matching
match('Hello World', /hello/i); // true

// Nested regex
match(
  { email: 'user@example.com' },
  { email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }
); // true
```

## Complex Examples

Combining multiple matching strategies:

```javascript
// Complex nested structure with arrays and nulls
match(
  {
    user: {
      name: 'Alice',
      email: 'alice@example.com',
      roles: ['admin', 'user']
    },
    status: 'active'
  },
  {
    user: {
      email: /@example\.com$/,
      roles: 'admin'
    },
    status: ['active', 'pending'],
    lastLogin: null // optional field
  }
); // true

// Multiple conditions
match(
  { price: 50, category: 'electronics', inStock: true },
  {
    price: { min: 0, max: 100 },
    category: ['electronics', 'computers'],
    inStock: true,
    discount: null // discount is optional
  }
); // true
```

## API

### `match(factValue, ruleValue)`

Compares a fact value against a rule value with flexible matching semantics.

**Parameters:**

- `factValue` (any): The actual value to test
- `ruleValue` (any): The pattern/rule to match against

**Returns:**

- `boolean`: `true` if the fact matches the rule, `false` otherwise

**Matching Rules:**

- **Exact equality**: Returns `true` if values are strictly equal
- **Null handling**: `null` in rule matches `null` or `undefined` in fact
- **Arrays**: "Any of" semantics - at least one element must match
- **Objects**: Recursively matches properties (partial matching allowed)
- **Type coercion**: Values are coerced to match rule type
- **Ranges**: Objects with `min`/`max` properties enable range matching
- **Negation**: Objects with `not` property negate any match condition
- **Functions**: Rule functions are called with fact value as predicate
- **RegExp**: Tests string values against regex patterns

## License

See the main project license.
