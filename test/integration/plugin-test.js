let { join } = require('path')
let http = require('http')
let test = require('tape')
let tiny = require('tiny-json-http')
let cwd = process.cwd()
let { spawn } = require('child_process')
let sut = join(cwd, 'src', 'begin-telemetry', 'index.js')

let listener = 'http://localhost:4243'
let port = 50000
let host = 'localhost'
process.env.AWS_LAMBDA_RUNTIME_API = `${host}:${port}`
let { AWS_LAMBDA_RUNTIME_API } = process.env
let telemetryEndpoint = '/telemetry'
let url = `http://${AWS_LAMBDA_RUNTIME_API}${telemetryEndpoint}`

let server, child, body = []
let extNameHeader = 'lambda-extension-name'
let extIDHeader = 'lambda-extension-identifier'
let extID = 'abc123'
let arbitraryData = 'hello!'
let nextCalled = 0

let batch = 0
function sendTelemetry () {
  if (batch >= 3) return
  // Fire the first round of telemetry
  tiny.post({ url: listener, body: telemetryData[batch] })
  batch++
}

test('Run telemetry plugin', t => {
  t.plan(23)
  server = http.createServer()
  server.on('request', (req, res) => {
    let { url, method } = req

    // Check HTTP methods + URLs to ensure the extension is correctly interfacing with the Lambda API
    let isReg =     method === 'POST' && url === '/2020-01-01/extension/register'
    let isTelAPI =  method === 'PUT'  && url === '/2022-07-01/telemetry'
    let isNext =    method === 'GET'  && url === '/2020-01-01/extension/event/next'
    let isTelData = method === 'POST' && url === telemetryEndpoint

    req.on('data', chunk => body.push(chunk))
    req.on('end', () => {
      let responseHeaders, responseBody
      if (body.length) body = JSON.parse(Buffer.concat(body))

      // Lambda extension API registration mock
      if (isReg) {
        responseHeaders = { [extIDHeader]: extID }
        t.equal(req.headers[extNameHeader], 'begin-telemetry', 'Registered begin-telemetry plugin')
        t.deepEqual(body, { events: [ 'INVOKE', 'SHUTDOWN' ] }, 'Registered invoke, shutdown events')
      }

      // Lambda telemetry API registration mock
      if (isTelAPI) {
        t.equal(req.headers[extIDHeader], extID, 'Registered telemetry API with correct extension')
        t.equal(req.method, 'PUT', 'Used PUT method to register telemetry')
        t.deepEqual(body, {
          schemaVersion: '2022-07-01',
          destination: { protocol: 'HTTP', URI: listener },
          types: [ 'platform', 'function' ],
          buffering: { timeoutMs: 25 }
        }, 'Registered telemetry with correct options')
      }

      // Lambda extension API /next
      if (isNext) {
        nextCalled++
        t.equal(req.headers[extIDHeader], extID, 'Called /next with correct extension ID')
        responseBody = JSON.stringify({ event: {} })
        sendTelemetry()
      }

      // Live telemetry data (sent by the extension listener)
      if (isTelData) {
        console.log(`Telemetry body:`, body)

        t.ok(body.batch, 'Telemetry plugin passed batch ID')
        t.equal(body.arbitraryData, arbitraryData, 'Telemetry plugin passed arbitrary property from config')
        let expected = telemetryData[batch - 1]
        t.equal(body.telemetry.length, expected.length, `Got back ${expected.length} telemetry items`)

        // Check the actual data
        expected.forEach((item, i) => {
          // The second batch uses different days, so position should be 0
          let pos = (batch - 1 === 1) ? 0 : i
          t.deepEqual({ ...item, pos }, body.telemetry[i], 'Got back correct telemetry item')
        })

        if (batch <= 2) sendTelemetry()
        else t.equal(nextCalled, 1, '/next endpoint called one time during execution')
      }
      body = []
      res.writeHead(200, responseHeaders)
      res.end(responseBody)
    })
  })
  server.listen({ port, host }, err => {
    if (err) t.fail(err)
    else t.ok(`Started mock Lambda extension / telemetry API on port ${port}`)
  })

  let TELEMETRY_CONFIG = JSON.stringify({ url, arbitraryData, debug: true })
  child = spawn(sut, {
    shell: true,
    env: { ...process.env, TELEMETRY_CONFIG }
  })
  let print = chunk => console.log(chunk.toString())
  child.stdout.on('data', print)
  child.stderr.on('data', print)
})

test('Shut down', t => {
  t.plan(2)
  delete process.env.AWS_LAMBDA_RUNTIME_API
  child.on('close', (code) => {
    t.equal(code, 0, 'Closed plugin process')
  })
  child.kill()
  server.close(err => {
    if (err) t.fail(err)
    else t.pass('Closed server')
  })
})

let telemetryData = [
  [
    {
      time: '2022-01-01T01:23:45.678Z',
      type: 'function',
      record: '1 - 1/1',
    }
  ],
  [
    // Diff days, so both pos 0
    {
      time: '2022-01-01T01:23:45.678Z',
      type: 'function',
      record: '2 - 1/2',
    },
    {
      time: '2022-01-02T01:23:45.678Z',
      type: 'function',
      record: '2 - 2/2',
    },
  ],
  [
    {
      time: '2022-01-01T01:23:45.678Z',
      type: 'function',
      record: '3 - 1/3',
    },
    {
      time: '2022-01-01T01:23:45.678Z',
      type: 'function',
      record: '3 - 2/3',
    },
    {
      time: '2022-01-01T01:23:45.678Z',
      type: 'function',
      record: '3 - 3/3',
    },
  ],
]
