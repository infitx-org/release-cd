import axios from 'axios';
import { monotonicFactory } from "ulidx";

const ulid = monotonicFactory();

export default async function pingDFSP(dfsp) {
    // return (await axios.post('http://localhost:8888/ping', {
    return (await axios.post('http://moja-ml-participant-connection-test-svc.mojaloop.svc.cluster.local/ping', {
        requestId: ulid()
    }, {
        headers: {
            'fspiop-destination': dfsp,
        }
    })).data?.pingStatus;
}
