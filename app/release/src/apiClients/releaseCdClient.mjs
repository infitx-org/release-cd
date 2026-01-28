import config from '../config.mjs';
import { sendHttpRequest } from '../report/test.utils.mjs';

export const releaseCdClient = {
  async getDfspState (dfspId) {
    return sendHttpRequest({
      url: `${config.env['pm-dev']}/dfsp/${dfspId}/state`
    })
  }
};
