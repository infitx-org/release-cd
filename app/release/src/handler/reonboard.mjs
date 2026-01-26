import reonboardDfsp from '../fn/reonboard.mjs';

export default async function reonboard(request, h) {
    return h.response(await reonboardDfsp((request.query.pm || '').split(','), request.params.key)).code(200)
}
