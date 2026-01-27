import offboard from "../fn/offboard.mjs";

export default async function offboardHandler(request, h) {
    return h.response(await offboard(request.params.dfsp, Number(request.query.timeout || 0))).code(200).type('text/plain');
}
