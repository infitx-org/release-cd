const match = require('@infitx/match');

module.exports = function decide(rules, input) {
    for (const { id, when, then } of rules) {
        if (match(input, when)) {
            return {
                id,
                ...then
            }
        }
    }
    return null;
}