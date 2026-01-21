import pingDFSP from '../fn/ping.mjs';

export default async function ping(request, h) {
    return h.response(await pingDFSP(request.params.dfsp)).code(200);
}