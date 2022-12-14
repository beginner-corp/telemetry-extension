#!/usr/bin/env node

let { log } = require('./lib')
let { nextEvent, registerAndSubscribeExtension } = require('./lambda-api')
let { eventListener, eventQueue } = require('./listener')
let tiny = require('tiny-json-http')
let shutdown = () => process.exit(0)

try {
  async function main () {
    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)

    let { BEGIN_STAGING: isStaging, TELEMETRY_URL } = process.env
    let endpoint = `api.begin.com/v1/telemetry`
    let url = 'https://' + (isStaging ? 'staging-' : '') + endpoint
    if (TELEMETRY_URL) url = TELEMETRY_URL

    let listenerURL = eventListener()
    log('Listening at:', listenerURL)
    let extensionID = await registerAndSubscribeExtension(listenerURL)
    log('Registered extension ID:', extensionID)

    let rate = 333 // Flush the event queue up to 3x/second
    let lastPublish = 0

    async function publish (shuttingDown) {
      let now = Date.now()
      let go = !lastPublish || (lastPublish && ((now - lastPublish) >= rate))
      if (eventQueue.length && go) {
        lastPublish = now
        let done = eventQueue.some(({ type }) => type === 'platform.runtimeDone')
        log(`Publishing ${eventQueue.length} event(s) at ${new Date(now).toISOString()}`)

        // Deep copy the contents, then reset the queue
        let body = JSON.parse(JSON.stringify(eventQueue))
        eventQueue.splice(0)

        await tiny.post({ url, body })

        // Freeze telemetry until the Lambda's next invocation or container shutdown
        if (done && !shuttingDown) next()
      }
    }

    // Check fairly aggressively to ensure logs have a chance to exfil during quick invocations
    let interval = setInterval(publish, 10)

    async function next () {
      let event = await nextEvent(extensionID)

      // Ignore event.eventType of 'INVOKE'; the publish interval will pick up those events

      if (event.eventType === 'SHUTDOWN') {
        // Halt final event publishing, let the stragglers catch up before the final update
        clearInterval(interval)
        await new Promise(resolve => setTimeout(resolve, rate))
        await publish(true)
        shutdown()
      }
    }
    next()
  }
  main()
}
catch (err) {
  console.log('Begin telemetry extension error', err)
}