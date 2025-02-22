#!/usr/bin/env node

let { getConfig, log, sequence } = require('./lib')
let { nextEvent, registerAndSubscribeExtension } = require('./lambda-api')
let { eventListener, eventQueue } = require('./listener')
let { randomUUID } = require('crypto')
let tiny = require('tiny-json-http')
let shutdown = () => process.exit(0)

try {
  async function main () {
    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)

    let { config, options } = getConfig()

    let listenerURL = eventListener(config)
    log('Listening at:', listenerURL)
    let extensionID = await registerAndSubscribeExtension(listenerURL, config)
    log('Registered extension ID:', extensionID)

    let { url, rate } = config
    let lastPublish = 0

    async function publish (shuttingDown) {
      let now = Date.now()
      let go = !lastPublish || (lastPublish && ((now - lastPublish) >= rate))
      if (eventQueue.length && go) {
        lastPublish = now
        let done = eventQueue.some(({ type }) => type === 'platform.runtimeDone')
        log(`Publishing ${eventQueue.length} event(s) at ${new Date(now).toISOString()}`)

        // Deep copy the contents, then reset the queue
        let telemetry = JSON.parse(JSON.stringify(eventQueue))
        eventQueue.splice(0)

        // Add sequencing
        telemetry = sequence(telemetry)

        await tiny.post({
          url,
          body: {
            ...options,
            batch: randomUUID(),
            telemetry,
          },
        })

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
