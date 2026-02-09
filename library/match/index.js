const isMatchWith = require('lodash/isMatchWith');
const isPlainObject = require('lodash/isPlainObject');

// Resolve JSON Pointer path from fact (e.g., "#/offer/dateCreated")
function resolveRef(refPath, factValue) {
    if (typeof refPath !== 'string' || !refPath.startsWith('#/')) return undefined;
    const path = refPath.slice(2).split('/');
    let value = factValue;
    for (const key of path) {
        if (value == null) return undefined;
        value = value[key];
    }
    return value;
}

// Round a date to the start of a time unit
function roundToUnit(date, unit) {
    const d = new Date(date);

    switch (unit) {
        case 's': // Round to start of second
            d.setMilliseconds(0);
            break;
        case 'm': // Round to start of minute
            d.setSeconds(0, 0);
            break;
        case 'h': // Round to start of hour
            d.setMinutes(0, 0, 0);
            break;
        case 'd': // Round to start of day
            d.setHours(0, 0, 0, 0);
            break;
        case 'w': // Round to start of week (Monday)
            d.setHours(0, 0, 0, 0);
            const day = d.getDay();
            const diff = day === 0 ? 6 : day - 1; // Monday is 1, Sunday is 0
            d.setDate(d.getDate() - diff);
            break;
        case 'M': // Round to start of month
            d.setDate(1);
            d.setHours(0, 0, 0, 0);
            break;
        case 'y': // Round to start of year
            d.setMonth(0, 1);
            d.setHours(0, 0, 0, 0);
            break;
    }

    return d;
}

// Parse Grafana-style time intervals (now, now-5m, now+1h, now/d, now-5d/d, etc.)
function parseTimeInterval(str, referenceTime) {
    if (typeof str !== 'string') return null;

    // Handle "now" without modifiers
    if (str === 'now') return new Date(referenceTime);

    // Handle "now/unit" (rounding without offset)
    const roundOnlyMatch = /^now\/([smhdwMy])$/.exec(str);
    if (roundOnlyMatch) {
        const [, unit] = roundOnlyMatch;
        return roundToUnit(new Date(referenceTime), unit);
    }

    // Handle "now[+-]amount(unit)" or "now[+-]amount(unit)/roundUnit"
    const match = /^now([+-])(\d+)(ms|s|m|h|d|w|M|y)(?:\/([smhdwMy]))?$/.exec(str);
    if (!match) return null;

    const [, sign, amount, unit, roundUnit] = match;
    const value = parseInt(amount, 10);
    const multiplier = sign === '+' ? 1 : -1;

    // Convert to milliseconds
    const unitMultipliers = {
        ms: 1,
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
        w: 7 * 24 * 60 * 60 * 1000,
        M: 30 * 24 * 60 * 60 * 1000, // Approximate month
        y: 365 * 24 * 60 * 60 * 1000  // Approximate year
    };

    const offset = multiplier * value * unitMultipliers[unit];
    const resultTime = new Date(referenceTime + offset);

    // Apply rounding if specified
    if (roundUnit) {
        return roundToUnit(resultTime, roundUnit);
    }

    return resultTime;
}

const match = (referenceTime, rootFact) => (value, condition) => {
    // Resolve $ref if condition is a reference object
    if (isPlainObject(condition) && '$ref' in condition && Object.keys(condition).length === 1) {
        condition = resolveRef(condition.$ref, rootFact);
    }

    if (value == null && condition == null) {
        return true
    } else if (value === condition) {
        return true;
    } else if (Array.isArray(condition) || Array.isArray(value)) {
        return Array.isArray(value)
            ? value.some(v => module.exports(v, condition, referenceTime, rootFact))
            : condition.some(v => module.exports(value, v, referenceTime, rootFact));
    } else if (value == null || condition == null) {
        return false;
    } else if (condition instanceof RegExp) {
        if (typeof value === 'string') return condition.test(value);
    } else if (condition instanceof Date) {
        value = value instanceof Date ? value.getTime() : new Date(value).getTime();
        condition = condition.getTime();
        if (!Number.isFinite(value) || !Number.isFinite(condition)) return false;
        return value === condition;
    } else if (Number.isNaN(value) || Number.isNaN(condition)) return false;
    switch (typeof condition) {
        case 'boolean':
            return Boolean(value) === condition;
        case 'string':
            return String(value) === condition;
        case 'number':
            return Number(value) === condition;
        case 'function':
            return condition(value);
        case 'object': {
            let { min, max, not } = condition;
            if (not != null) return !module.exports(value, not, referenceTime, rootFact);

            // Resolve $ref in min and max
            if (isPlainObject(min) && min.$ref) {
                min = resolveRef(min.$ref, rootFact);
            }
            if (isPlainObject(max) && max.$ref) {
                max = resolveRef(max.$ref, rootFact);
            }

            // Parse Grafana-style time intervals for min and max
            if (typeof min === 'string') {
                const parsed = parseTimeInterval(min, referenceTime);
                if (parsed) min = parsed;
            }
            if (typeof max === 'string') {
                const parsed = parseTimeInterval(max, referenceTime);
                if (parsed) max = parsed;
            }

            if (value instanceof Date) {
                value = value.getTime();
                if (!Number.isFinite(value)) return false;
                if (min != null) min = new Date(min).getTime();
                if (max != null) max = new Date(max).getTime();
            } else if (min instanceof Date || max instanceof Date) {
                value = new Date(value).getTime();
                if (!Number.isFinite(value)) return false;
            }
            if (min instanceof Date) min = min.getTime();
            if (max instanceof Date) max = max.getTime();
            if (Number.isNaN(min)) return false;
            if (Number.isNaN(max)) return false;
            if (min != null && (value < min || value === -Infinity || min === Infinity))
                return false;
            if (max != null && (value > max || value === Infinity || max === -Infinity))
                return false;
            if (min != null || max != null) return true;
            // If condition only contains min/max/not (which have been handled above), return true
            const conditionKeys = Object.keys(condition);
            if (conditionKeys.every(k => ['min', 'max', 'not'].includes(k))) return true;
            if (typeof value === 'object' && value && condition) return module.exports(value, condition, referenceTime, rootFact);
        }
    }
}

module.exports = function (factValue, ruleValue, referenceTime = Date.now(), rootFact = null) {
    if (rootFact === null) rootFact = factValue;  // Store the root fact for $ref resolution only on first call
    if (factValue === ruleValue) return true;
    if (ruleValue && typeof ruleValue === 'object' && 'not' in ruleValue && Object.keys(ruleValue).length === 1) return !module.exports(factValue, ruleValue.not, referenceTime, rootFact);
    if (
        Array.isArray(factValue) ||
        Array.isArray(ruleValue) ||
        !isPlainObject(factValue) ||
        !isPlainObject(ruleValue)
    )
        return match(referenceTime, rootFact)(factValue, ruleValue);
    if (factValue && ruleValue && typeof factValue === 'object' && typeof ruleValue === 'object') {
        const nullFilter = Object.entries(ruleValue).filter(([, value]) => value == null || Array.isArray(value));
        if (nullFilter.length > 0) factValue = { ...Object.fromEntries(nullFilter), ...factValue };
    };
    return isMatchWith(factValue, ruleValue, match(referenceTime, rootFact));
};
