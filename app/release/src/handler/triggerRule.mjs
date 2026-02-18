import { triggerRule } from "../trigger.mjs";

export default async function triggerRuleHandler(request, h) {
    const result = await triggerRule(request, request.params.ruleName);
    return h.response(result);
}
