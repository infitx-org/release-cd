import offboard from "../fn/offboard.mjs";

export default async function offboardHandler(request, h) {
    return h.response(await offboard(request.params.dfsp, Number(request.query.ping || 0))).code(200).type('text/plain');
}
