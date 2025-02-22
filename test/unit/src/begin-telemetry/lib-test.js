let { join } = require('path')
let test = require('tape')
let cwd = process.cwd()
let sut = join(cwd, 'src', 'arc-telemetry', 'lib.js')
let lib = require(sut)
let { getConfig, log, sequence } = lib

let setConfig = config => process.env.TELEMETRY_CONFIG = JSON.stringify(config)

test('Set up env', t => {
  t.plan(3)
  t.ok(getConfig, 'getConfig method is present')
  t.ok(log, 'log method is present')
  t.ok(sequence, 'sequence method is present')
})

test('getConfig', t => {
  t.plan(15)
  let config, options

  try { getConfig() }
  catch (err) {
    t.equal(err.message, 'Telemetry endpoint not found', 'Config threw for lack of telemetry endpoint')
  }

  let url = 'foo'
  setConfig({ url })
  ;({ config, options } = getConfig())

  t.equal(config.url, url, 'Got back correct telemetry URL')
  t.equal(config.rate, 333, 'Got back default config rate: 333ms')
  t.deepEqual(config.telemetryTypes, [ 'platform', 'function' ], 'Got back default telemetry types: platform, function')
  t.equal(config.telemetryTimeoutMs, 25, 'Got back default config timeout: 25ms')
  t.equal(config.telemetryListenerPort, 4243, 'Got back default config port: 4243')
  t.equal(Object.keys(options).length, 0, 'Did not get back any options')

  url = 'bar'
  process.env.TELEMETRY_URL = url
  ;({ config, options } = getConfig())
  t.equal(config.url, url, `Got back correct telemetry URL: ${url}`)

  let rate = 1000
  let telemetryTypes = [ 'function' ]
  let telemetryTimeoutMs = 1234
  let telemetryListenerPort = 3337
  let ignore = [ 'platform.initStart' ]
  let rando = 'lol'
  setConfig({ rate, telemetryTypes, telemetryTimeoutMs, telemetryListenerPort, ignore, rando })
  ;({ config, options } = getConfig())
  t.equal(config.rate, rate, `Got back configured rate: ${rate}`)
  t.deepEqual(config.telemetryTypes, [ 'function' ], 'Got back configured telemetry types: function')
  t.equal(config.telemetryTimeoutMs, telemetryTimeoutMs, `Got back configured timeout: ${telemetryTimeoutMs}`)
  t.equal(config.telemetryListenerPort, telemetryListenerPort, `Got back configured port: ${telemetryListenerPort}`)
  t.deepEqual(config.ignore, ignore, `Got back ignore types: ${ignore}`)
  t.equal(Object.keys(options).length, 1, 'Got back one option')
  t.equal(options.rando, rando, `Got arbitrary property in returned options: ${rando}`)

  delete process.env.TELEMETRY_URL
})

test('sequence', t => {
  t.plan(4)
  let telemetry, result
  let record = 'lolidk'

  // Round one: single entry
  telemetry = [
    { time: '2022-01-01T01:23:45.678Z', record },
  ]
  result = sequence(telemetry)
  t.deepEqual(result, [ { ...telemetry[0], pos: 0 } ], 'Got back correct sequence')

  // Round two: multiple entries, same timestamp
  telemetry = [
    { time: '2022-01-01T01:23:45.678Z', record },
    { time: '2022-01-01T01:23:45.678Z', record },
  ]
  result = sequence(telemetry)
  t.deepEqual(result, [
    { ...telemetry[0], pos: 0 },
    { ...telemetry[1], pos: 1 },
  ], 'Got back correct sequence')

  // Round three: multiple entries, multiple timestamps
  telemetry = [
    { time: '2022-01-01T01:23:45.678Z', record },
    { time: '2022-01-02T01:23:45.678Z', record },
  ]
  result = sequence(telemetry)
  t.deepEqual(result, [
    { ...telemetry[0], pos: 0 },
    { ...telemetry[1], pos: 0 },
  ], 'Got back correct sequence')

  // Round three: multiple entries, same and multiple timestamps
  telemetry = [
    { time: '2022-01-01T01:23:45.678Z', record },
    { time: '2022-01-01T01:23:45.678Z', record },
    { time: '2022-01-02T01:23:45.678Z', record },
    { time: '2022-01-03T01:23:45.678Z', record },
  ]
  result = sequence(telemetry)
  t.deepEqual(result, [
    { ...telemetry[0], pos: 0 },
    { ...telemetry[1], pos: 1 },
    { ...telemetry[2], pos: 0 },
    { ...telemetry[3], pos: 0 },
  ], 'Got back correct sequence')
})
