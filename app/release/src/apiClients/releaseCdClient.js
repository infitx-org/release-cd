const { env } = require('rc')('dev') // todo: find a better way
const { sendHttpRequest } = require('../report/test.utils')

const releaseCdClient = {
  async getDfspState (dfspId) {
    return sendHttpRequest({
      url: `${env['pm-dev']}/dfsp/${dfspId}/state`
    })
  }
}

module.exports = { releaseCdClient }
