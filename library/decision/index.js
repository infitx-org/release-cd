const match = require('@infitx/match');
const yaml = require('yaml');
const fs = require('fs');

module.exports = function decision(config) {
    if (typeof config === 'string') {
        config = yaml.parse(fs.readFileSync(config, 'utf8'), { customTags: ['timestamp'] });
    }
    let rules = config.rules ?? config;
    if (!Array.isArray(rules)) rules = Object.entries(rules).map(([id, value]) => ({ id, ...value })).sort((a, b) => {
        const aPriority = a.priority ?? a.id;
        const bPriority = b.priority ?? b.id;
        if (aPriority < bPriority) return -1;
        if (aPriority > bPriority) return 1;
        return 0;
    });
    return {
        ...config,
        rules,
        decide: fact => {
            for (const index in rules) {
                const { id = index, when, then } = rules[index];
                if (match(fact, when)) return { id, ...typeof then === 'function' ? then(fact) : then };
            }
            return null;
        }
    }
};