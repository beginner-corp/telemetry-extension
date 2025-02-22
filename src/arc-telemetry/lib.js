let debug
let log = (...logs) => debug ? console.log('[Arc telemetry extension]', ...logs) : null
let knownConfig = [ 'debug', 'url', 'rate', 'telemetryTypes', 'telemetryTimeoutMs', 'telemetryListenerPort', 'ignore' ]

function getConfig () {
  try {
    let { TELEMETRY_CONFIG = '{}', TELEMETRY_DEBUG, TELEMETRY_URL } = process.env

    let config = JSON.parse(TELEMETRY_CONFIG)
    if (config.debug || TELEMETRY_DEBUG) debug = true
    if (TELEMETRY_URL) config.url = TELEMETRY_URL
    if (!config.url) throw ReferenceError('Telemetry endpoint not found')

    // Set config defaults
    config.rate = config.rate || 333 // Flush the event queue; default up to 3x/second
    config.telemetryTypes = config.telemetryTypes || [ 'platform', 'function' ]
    config.telemetryTimeoutMs = config.telemetryTimeoutMs || 25
    config.telemetryListenerPort = config.telemetryListenerPort || 4243
    config.ignore = config.ignore || []

    // Arbitrary options to pass to the telemetry API
    let options = JSON.parse(TELEMETRY_CONFIG)
    knownConfig.forEach(opt => delete options[opt])

    return { config, options }
  }
  catch (err) {
    console.error('Arc telemetry config error')
    throw err
  }
}

let timestamps = {}
let tenMin = 60 * 1000 * 10
function sequence (telemetry) {
  let items = telemetry.map(item => {
    let { time } = item
    if (timestamps[time] === undefined) timestamps[time] = 0
    else timestamps[time]++
    item.pos = timestamps[time]
    return item
  })

  // Tidy up timestamps in case the Lambda sees frequent re-use in high-traffic contexts
  let now = Date.now()
  Object.keys(timestamps).forEach(ts => {
    if ((now - new Date(ts).getTime()) >= tenMin) delete timestamps[ts]
  })
  return items
}

module.exports = { getConfig, log, sequence }
