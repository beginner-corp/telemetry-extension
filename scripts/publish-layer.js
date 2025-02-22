#!/usr/bin/env node

let { join } = require('path')
let { existsSync, readFileSync } = require('fs')
let { getRegions, LayerName } = require('./lib')
let {
  LambdaClient,
  AddLayerVersionPermissionCommand,
  PublishLayerVersionCommand,
} = require('@aws-sdk/client-lambda')

try {
  async function main () {
    let layerPath = join(__dirname, '..', 'build', 'extension.zip')
    if (!existsSync(layerPath)) throw Error('build/extension.zip not found!')
    let ZipFile = readFileSync(layerPath)

    // Publish to each region
    let regions = await getRegions()
    for (let region of regions) {
      let lambda = new LambdaClient({ region })
      let publish = new PublishLayerVersionCommand({
        Content: { ZipFile },
        LayerName,
        CompatibleRuntimes: [ 'nodejs12.x', 'nodejs14.x', 'nodejs16.x', 'nodejs18.x' ],
        Description: 'Real-time Lambda telemetry, by Architect (arc.codes)',
        LicenseInfo: 'Apache-2.0',
      })
      let layer = await lambda.send(publish)
      let { LayerVersionArn, Version } = layer
      let update = new AddLayerVersionPermissionCommand({
        Action: 'lambda:GetLayerVersion',
        Principal: '*',
        StatementId: String(Date.now()),
        LayerName,
        VersionNumber: Version,
      })
      await lambda.send(update)
      console.error(`Published layer to: ${region}, ARN: ${LayerVersionArn}`)
    }
    console.error(`Published layer to ${regions.length} regions`)
  }
  main()
}
catch (err) {
  console.error(err)
  process.exit(1)
}
