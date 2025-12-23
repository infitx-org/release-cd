const isMatchWith = require('lodash/isMatchWith');
const isPlainObject = require('lodash/isPlainObject');

function match(value, condition) {
    if (value == null && condition == null) {
        return true
    } else if (value === condition) {
        return true;
    } else if (Array.isArray(condition) || Array.isArray(value)) {
        return Array.isArray(value)
            ? value.some(v => module.exports(v, condition))
            : condition.some(v => module.exports(value, v));
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
            let { min, max } = condition;
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
            if (typeof value === 'object' && value && condition) return module.exports(value, condition);
        }
    }
}

module.exports = function (factValue, ruleValue) {
    if (factValue === ruleValue) return true;
    if (
        Array.isArray(factValue) ||
        Array.isArray(ruleValue) ||
        !isPlainObject(factValue) ||
        !isPlainObject(ruleValue)
    )
        return match(factValue, ruleValue);
    if (factValue && ruleValue && typeof factValue === 'object' && typeof ruleValue === 'object') {
        const nullFilter = Object.entries(ruleValue).filter(([, value]) => value == null || Array.isArray(value));
        if (nullFilter.length > 0) factValue = { ...Object.fromEntries(nullFilter), ...factValue };
    };
    return isMatchWith(factValue, ruleValue, match);
};
