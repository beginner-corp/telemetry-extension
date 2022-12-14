let http = require('http')
let host = process.env.AWS_LAMBDA_FUNCTION_NAME ? 'sandbox.localdomain' : 'localhost'
let port = 4243 // FIXME: this will conflict in the Sandbox invocation model
let eventQueue = []

function eventListener () {
  let server = http.createServer()
  server.on('request', (req, res) => {
    let raw = []
    req.on('data', chunk => raw.push(chunk))
    req.on('end', () => {
      if (raw.length) {
        let body = JSON.parse(Buffer.concat(raw))
        if (body.length) eventQueue.push(...body)
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
