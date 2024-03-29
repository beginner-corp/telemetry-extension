let http = require('http')
let host = process.env.AWS_LAMBDA_FUNCTION_NAME ? 'sandbox.localdomain' : 'localhost'
let eventQueue = []

function eventListener (config) {
  let { ignore, telemetryListenerPort: port } = config
  let checkIgnored = ({ type }) => !ignore.includes(type)
  let server = http.createServer()
  server.on('request', (req, res) => {
    let raw = []
    req.on('data', chunk => raw.push(chunk))
    req.on('end', () => {
      if (raw.length) {
        let body = JSON.parse(Buffer.concat(raw))
        if (body.length) {
          let items = ignore.length ? body.filter(checkIgnored) : body
          eventQueue.push(...items)
        }
      }
      res.statusCode = 200
      res.end()
    })
  })
  let listenerURL = `http://${host}:${port}`
  server.listen({ port, host })
  return listenerURL
}

module.exports = {
  eventListener,
  eventQueue,
}
