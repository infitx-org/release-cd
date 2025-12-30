import notify from "../bin/notify.mjs";

export default async function notifyHandler(request, h) {
    await notify(request.payload);
    return h.response('Notification sent').code(200);
}
