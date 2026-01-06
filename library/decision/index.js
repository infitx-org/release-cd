const match = require('@infitx/match');
const yaml = require('yaml');
const fs = require('fs');

module.exports = function decision(config) {
    if (typeof config === 'string') {
        config = yaml.parse(fs.readFileSync(config, 'utf8'), { customTags: ['timestamp'] });
    }
    let rules = config.rules ?? config;
    if (!Array.isArray(rules)) rules = Object.entries(rules).map(([rule, value]) => ({ rule, ...value })).sort((a, b) => {
        const aPriority = a.priority ?? a.rule;
        const bPriority = b.priority ?? b.rule;
        if (aPriority < bPriority) return -1;
        if (aPriority > bPriority) return 1;
        return 0;
    });
    return {
        ...config,
        rules,
        decide: (fact, all) => {
            const decisions = all ? [] : null;
            for (const index in rules) {
                const { rule = index, when, then } = rules[index];
                if (match(fact, when)) {
                    if (all) {
                        Object.entries(typeof then === 'function' ? then(fact) : then).forEach(([decision, value]) => decisions.push({ rule, decision, ...value }));
                    } else {
                        return Object.entries(typeof then === 'function' ? then(fact) : then).map(([decision, value]) => ({ rule, decision, ...value }));
                    }
                }
            }
            return decisions;
        }
    }
};