# Decision Library

A lightweight rule engine for evaluating facts against configurable rules and
generating decisions. The library uses pattern matching to determine which rules
apply to a given fact and returns corresponding decisions.

## Features

- **Pattern Matching**: Uses `@infitx/match` for flexible fact matching
- **Priority-based Evaluation**: Rules can have explicit or implicit priorities
- **Multiple Decision Support**: Can return first match or all matching rules
- **YAML Configuration**: Define rules in human-readable YAML format
- **Type Safety**: Built-in support for various data types including dates and timestamps

## Installation

```javascript
const decision = require('./');
```

## Basic Usage

```javascript
const decision = require('./');
const { decide, rules } = decision('./config.yaml');

const fact = { type: 'transfer', amount: 500 };
const result = decide(fact);
console.log(result);
```

## Examples

### Example 1: Single Decision with Implicit Priority

Rules are evaluated in the order they appear in the configuration. When rules
are defined as an object, the key becomes the rule name and serves as the
implicit priority (alphabetically sorted).

- - YAML Configuration

  ```yaml
  rules:
    transfer-approval:
      when: { type: transfer, amount: { max: 1000 } }
      then: { expect: { approved: true, reason: approved } }

    transfer-rejection:
      when: { type: transfer, amount: { min: 1001 } }
      then: { expect: { approved: false, reason: limit } }
  ```

- Decision Table

  | Rule                 | Condition                            | Decision                                       |
  |--------------------- |------------------------------------- |----------------------------------------------- |
  |transfer-approval     | type=transfer AND amount ≤ 1000      | expect: approved=true, reason=approved         |
  |transfer-rejection    | type=transfer AND amount ≥ 1001      | expect: approved=false, reason=limit           |

- Code Example

  ```javascript
  const decision = require('./');
  const { decide } = decision('./transfer-config.yaml');

  // Test case 1: Approved transfer
  const fact1 = { type: 'transfer', amount: 500 };
  console.log(decide(fact1));
  // Output: [{
  //    rule: 'transfer-approval',
  //    decision: 'expect',
  //    approved: true,
  //    reason: 'approved'
  //  }]

  // Test case 2: Rejected transfer
  const fact2 = { type: 'transfer', amount: 1500 };
  console.log(decide(fact2));
  // Output: [{
  //    rule: 'transfer-rejection',
  //    decision: 'expect',
  //    approved: false,
  //    reason: 'limit'
  //  }]
  ```

### Example 2: Single Decision with Explicit Priority

When you need specific evaluation order, pass an array of rules with
the required order.

- YAML Configuration

  ```yaml
  rules:
    - rule: high-value-check
      when: { type: transaction, amount: { min: 10000 } }
      then: { require: { manualReview: true, approvers: 2 } }

    - rule: standard-check
      when: { type: transaction, amount: { max: 9999 } }
      then: { allow: { automated: true, approvers: 0 } }
  ```

- Decision Table

  | Rule              | Condition                            | Decision                                      |
  |-------------------|--------------------------------------|-----------------------------------------------|
  | high-value-check  | type=transaction AND amount ≥ 10000  | require: manualReview=true, approvers=2       |
  | standard-check    | type=transaction AND amount ≤ 9999   | allow: automated=true, approvers=0            |

- Code Example

  ```javascript
  const decision = require('./');
  const { decide, rules } = decision('./priority-config.yaml');

  console.log('Rules in evaluation order:', rules.map(r => ({ rule: r.rule })));
  // Output: [
  //   { rule: 'high-value-check' },
  //   { rule: 'standard-check }
  // ]

  const fact1 = { type: 'transaction', amount: 15000 };
  console.log(decide(fact1));
  // Output: [{
  //    rule: 'high-value-check',
  //    decision: 'require',
  //    manualReview: true,
  //    approvers: 2
  // }]

  const fact2 = { type: 'transaction', amount: 500 };
  console.log(decide(fact2));
  // Output: [{
  //    rule: 'standard-check',
  //    decision: 'allow',
  //    automated: true,
  //    approvers: 0
  // }]
  ```

### Example 3: Multiple Decisions

A single fact can trigger multiple decisions from one rule. This is useful for
scenarios where you need to take multiple actions based on a single condition.

- YAML Configuration

  ```yaml
  rules:
    withdrawal-high-amount:
      when: { type: withdrawal, amount: { min: 501 } }
      then:
        expect: { approved: false, reason: large }
        notification: { type: alert, recipient: manager }
        audit: { level: warning, message: "Large withdrawal attempted" }

    withdrawal-normal:
      when: { type: withdrawal, amount: { max: 500 } }
      then:
        expect: { approved: true, reason: small }
        audit: { level: info, message: "Withdrawal approved" }
  ```

- Decision Table

  | Rule                   | Condition                        | Decisions                                                                                                                           |
  |------------------------|----------------------------------|-------------------------------------------------------------------------------------------------------------------------------------|
  | withdrawal-high-amount | type=withdrawal AND amount ≥ 501 | 1. expect: approved=false, reason=large<br>2. notification: type=alert, recipient=manager<br>3. audit: level=warning, message=...  |
  | withdrawal-normal      | type=withdrawal AND amount ≤ 500 | 1. expect: approved=true, reason=small<br>2. audit: level=info, message=...                                                        |

- Code Example

  ```javascript
  const decision = require('./');
  const { decide } = decision('./withdrawal-config.yaml');

  // Large withdrawal - triggers multiple decisions
  const fact1 = { type: 'withdrawal', amount: 700 };
  console.log(decide(fact1));
  // Output: [
  //   {
  //        rule: 'withdrawal-high-amount',
  //        decision: 'expect',
  //        approved: false,
  //        reason: 'large'
  //   }, {
  //        rule: 'withdrawal-high-amount',
  //        decision: 'notification',
  //        type: 'alert',
  //        recipient: 'manager'
  //   }, {
  //        rule: 'withdrawal-high-amount',
  //        decision: 'audit',
  //        level: 'warning',
  //        message: 'Large withdrawal attempted'
  //   }
  // ]

  // Normal withdrawal
  const fact2 = { type: 'withdrawal', amount: 300 };
  console.log(decide(fact2));
  // Output: [
  //   {
  //        rule: 'withdrawal-normal',
  //        decision: 'expect',
  //        approved: true,
  //        reason: 'small'
  //   }, {
  //        rule: 'withdrawal-normal',
  //        decision: 'audit',
  //        level: 'info',
  //        message: 'Withdrawal approved'
  //   }
  // ]
  ```

### Example 4: All Matching Rules

By default, `decide()` returns only the first matching rule. Use the `all`
parameter to get all matching rules.

- YAML Configuration

  ```yaml
  rules:
    fraud-check:
      when: { type: transaction, amount: { min: 5000 } }
      then: { verify: { fraudCheck: true } }

    compliance-check:
      when: { type: transaction, amount: { min: 3000 } }
      then: { verify: { amlCheck: true } }

    standard-process:
      when: { type: transaction }
      then: { process: { standard: true } }
  ```

- Decision Table

  | Rule              | Condition                            | Decision                            |
  |-------------------|--------------------------------------|-------------------------------------|
  | fraud-check       | type=transaction AND amount ≥ 5000   | verify: fraudCheck=true             |
  | compliance-check  | type=transaction AND amount ≥ 3000   | verify: amlCheck=true               |
  | standard-process  | type=transaction                     | process: standard=true              |

- Code Example

  ```javascript
  const decision = require('./');
  const { decide } = decision('./all-rules-config.yaml');

  const fact = { type: 'transaction', amount: 6000 };

  // Get only first matching rule (default)
  console.log(decide(fact));
  // Output: [{ rule: 'fraud-check', decision: 'verify', fraudCheck: true }]

  // Get all matching rules
  console.log(decide(fact, true));
  // Output: [
  //   { rule: 'fraud-check', decision: 'verify', fraudCheck: true },
  //   { rule: 'compliance-check', decision: 'verify', amlCheck: true },
  //   { rule: 'standard-process', decision: 'process', standard: true }
  // ]
  ```

## YAML Configuration Format

### Basic Structure

```yaml
rules:
  rule-name:
    when: <condition>
    then: <decision>
    priority: <number or string>  # Optional, defaults to rule name if omitted
```

Or as an array:

```yaml
rules:
  - rule: rule-name
    when: <condition>
    then: <decision>
```

### Components

- `rules`

Can be either:

- **Object**: Keys are rule names, values are rule definitions. Rules are sorted
  alphabetically by name (implicit priority) or by `priority` field if present.
- **Array**: Rules definitions with explicit order.
  When an array is used, the processing order is the order of items in the array.

- `when` (Condition)

A pattern matching object that defines when a rule applies. Supports:

- **Exact match**: `{ type: transfer }`
- **Range match**: `{ amount: { min: 100, max: 1000 } }`
- **Minimum**: `{ amount: { min: 1000 } }`
- **Maximum**: `{ amount: { max: 1000 } }`
- **Complex patterns**: Nested objects, arrays, and any pattern supported by `@infitx/match`

- `then` (Decision)

Defines the outcomes when a rule matches. Structure:

```yaml
then:
  <decision-type>: <decision-value>
  <another-decision>: <another-value>
```

Each decision becomes an object in the result array:

```javascript
{ rule: 'rule-name', decision: 'decision-type', ...decision-value }
```

- `priority` (Optional)

- **Numeric**: Lower numbers evaluated first
- **String**: Lexicographic ordering
- **Implicit**: If omitted, rule name is used as priority

### Complete Example

```yaml
# Object format with implicit priority
rules:
  high-priority-rule:
    when: { urgent: true }
    then: { action: { escalate: true } }

  low-priority-rule:
    when: { urgent: false }
    then: { action: { queue: true } }

---

# Array format with explicit priority
rules:
  - rule: critical
    when: { severity: critical }
    then:
      alert: { immediate: true }
      notify: { team: on call }
  - rule: warning
    when: { severity: warning }
    then:
      alert: { delayed: true }
  - rule: info
    when: { severity: info }
    then:
      log: { level: info }
```

## API Reference

### `decision(config)`

Creates a decision engine instance.

**Parameters:**

- `config` (String | Object): Path to YAML file or configuration object

**Returns:**
Object with:

- `rules`: Array of rules in evaluation order
- `decide(fact, all)`: Function to evaluate facts
- `tests`: Test cases from configuration (if present)

### `decide(fact, all = false)`

Evaluates a fact against configured rules.

**Parameters:**

- `fact` (Object): The fact to evaluate
- `all` (Boolean): If true, returns all matching rules; if false, returns
  only first match

**Returns:**
Array of decision objects:

```javascript
[
  { rule: 'rule-name', decision: 'decision-type', ...decision-value }
]
```

Returns `null` (or empty array if `all=true`) if no rules match.

## Testing

The library supports inline test definitions in YAML:

```yaml
rules:
  # ... rule definitions

tests:
  - fact: { type: transfer, amount: 500 }
    expected:
      - approved: true
        reason: approved
        rule: transfer-approval
        decision: expect
```

Run tests with Jest:

```javascript
const decision = require('./');
const { decide, tests } = decision('./config.yaml');

tests.forEach(({ fact, expected }) => {
  test(`fact: ${JSON.stringify(fact)}`, () => {
    expect(decide(fact)).toEqual(expected);
  });
});
```
