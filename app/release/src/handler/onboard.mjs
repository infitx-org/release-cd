import onboard from "../bin/onboard.mjs";

export default async function onboardHandler(request, h) {
    return h.response(await onboard(request.params.dfsp, Number(request.query.timeout || 0))).code(200).type('text/plain');
}
