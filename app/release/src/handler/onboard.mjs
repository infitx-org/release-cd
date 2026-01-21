import onboard from "../bin/onboard.mjs";

export default async function onboardHandler(request, h) {
    await onboard(request.params.dfsp);
    return h.response('Onboarding started').code(200);
}
