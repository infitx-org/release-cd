/**
 * Matches a fact value against a rule value with support for pattern matching,
 * JSON pointers, time intervals, ranges, and complex object comparisons.
 *
 * @param factValue - The actual value to match against
 * @param ruleValue - The expected pattern/rule to match
 * @param referenceTime - Reference timestamp for time-based comparisons (default: Date.now())
 * @param rootFact - Root fact object for JSON pointer resolution
 * @returns true if factValue matches ruleValue, false otherwise
 *
 * @example
 * ```typescript
 * match({ a: 1 }, { a: 1 }); // true
 * match({ a: 1, b: 2 }, { a: 1 }); // true (partial match)
 * match({ age: 25 }, { age: { min: 18, max: 65 } }); // true (range match)
 * match({ date: '2024-01-01' }, { date: { $lte: 'now-1d' } }); // time comparison
 * ```
 */
declare function match(
    factValue: object,
    ruleValue: object,
    referenceTime?: number,
    rootFact?: object
): boolean;

export = match;
