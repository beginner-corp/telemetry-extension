#!/usr/bin/env node

let { getRegions } = require('./lib')
let {
  LambdaClient,
  ListLayersCommand,
} = require('@aws-sdk/client-lambda')

try {
  async function main () {
    let regions = await getRegions()

    // Destroy from each region
    for (let region of regions) {
      let lambda = new LambdaClient({ region })
      let getLayers = new ListLayersCommand({ CompatibleRuntime: 'nodejs14.x' })
      let layers = await lambda.send(getLayers)
      if (layers.Layers.length) {
        console.error(`Layers in ${region}:`, layers.Layers)
      }
    }
  }
  main()
}
catch (err) {
  console.error(err)
  process.exit(1)
}
