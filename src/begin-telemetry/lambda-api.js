let { basename } = require('path')
let { log } = require('./lib')
let tiny = require('tiny-json-http')
let { AWS_LAMBDA_RUNTIME_API } = process.env
let extensionURL = `http://${AWS_LAMBDA_RUNTIME_API}/2020-01-01/extension`
let telemetryURL = `http://${AWS_LAMBDA_RUNTIME_API}/2022-07-01/telemetry`
let extHeader = 'lambda-extension-identifier'

async function registerAndSubscribeExtension (listenerURL) {
  let res = await tiny.post({
    url: `${extensionURL}/register`,
    headers: { 'lambda-extension-name': basename(__dirname) },
    body: { events: [ 'INVOKE', 'SHUTDOWN' ] },
  })
  let extensionID = res.headers[extHeader]

  await tiny.put({
    url: telemetryURL,
    headers: { [extHeader]: extensionID },
    body: {
      schemaVersion: '2022-07-01',
      destination: {
        protocol: 'HTTP',
        URI: listenerURL,
      },
      types: [ 'platform', 'function' ],
      // This needs to be as low as possible to ensure logs exfil during short executions
      buffering: { timeoutMs: 25 },
    },
  })
  log(`Extension subscribed to 'platform', 'function' events`)
  return extensionID
}

async function nextEvent (extensionID) {
  try {
    let { body } = await tiny.get({
      url: `${extensionURL}/event/next`,
      headers: { [extHeader]: extensionID },
    })
    return body
  }
  catch (err) {
    log('Next event error', err)
    return null
  }
}

module.exports = {
  nextEvent,
  registerAndSubscribeExtension,
}
