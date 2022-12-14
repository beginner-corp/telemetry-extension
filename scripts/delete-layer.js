#!/usr/bin/env node

// Use with great caution!
let enabled = false
let LayerName = 'you-gotta-write-me-in-manually'
if (!enabled) return

let { getRegions } = require('./lib')
let {
  LambdaClient,
  DeleteLayerVersionCommand,
  ListLayerVersionsCommand,
} = require('@aws-sdk/client-lambda')

try {
  async function main () {
    let regions = await getRegions()

    // Destroy from each region
    for (let region of regions) {
      let lambda = new LambdaClient({ region })
      let getVersions = new ListLayerVersionsCommand({ LayerName })
      let versions = await lambda.send(getVersions)
      let { LayerVersions } = versions
      let lambdaVersions = LayerVersions.map(({ Version }) => Version)

      if (lambdaVersions.length) {
        for (let VersionNumber of lambdaVersions) {
          let del = new DeleteLayerVersionCommand({ LayerName, VersionNumber })
          await lambda.send(del)
        }
        console.error(`Deleted ${lambdaVersions.length} layer versions from: ${region}`)
      }
    }
    console.error(`Deleted layer and all its versions from ${regions.length} regions`)
  }
  main()
}
catch (err) {
  console.error(err)
  process.exit(1)
}
