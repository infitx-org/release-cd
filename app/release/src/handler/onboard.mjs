import onboard from "../bin/onboard.mjs";

export default async function onboardHandler(request, h) {
    await onboard(request.params.dfsp, Number(request.query.ping || 0));
    return h.response('Onboarding complete').code(200);
}
