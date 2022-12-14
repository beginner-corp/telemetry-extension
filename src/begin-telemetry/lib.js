let debug = process.env.BEGIN_DEBUG
let log = (...logs) => debug ? console.log('[Begin telemetry extension]', ...logs) : null

module.exports = { log }
