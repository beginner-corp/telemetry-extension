let debug
let log = (...logs) => debug ? console.log('[Begin telemetry extension]', ...logs) : null
let knownConfig = [ 'debug', 'url', 'telemetryTypes', 'telemetryTimeoutMs', 'telemetryListenerPort' ]

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

    // Arbitrary options to pass to the telemetry API
    let options = JSON.parse(TELEMETRY_CONFIG)
    knownConfig.forEach(opt => delete options[opt])

    return { config, options }
  }
  catch (err) {
    console.error('Begin telemetry config error', err)
    process.exit(1)
  }
}

module.exports = { log, getConfig }
