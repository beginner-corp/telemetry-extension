let { SSMClient, GetParametersByPathCommand } = require('@aws-sdk/client-ssm')

let { LAYER_NAME, PUBLISH_REGION } = process.env
let LayerName = LAYER_NAME ? LAYER_NAME : 'arc-telemetry'

async function getRegions () {
  if (PUBLISH_REGION) return [ PUBLISH_REGION ]

  // Get the list of Lambda regions, filtering out Govcloud + CN
  let Path = '/aws/service/global-infrastructure/services/lambda/regions'
  let ssm = new SSMClient({ region: 'us-west-1' })
  let results = []
  async function getRegionPage (NextToken) {
    let cmd = new GetParametersByPathCommand({ Path, NextToken })
    let result = await ssm.send(cmd)
    results.push(...result.Parameters)
    if (result.NextToken) await getRegionPage(result.NextToken)
  }
  await getRegionPage()

  let regions = results
    .map(({ Value }) => Value)
    .filter(r => !r.startsWith('cn-') && !r.startsWith('us-gov-'))
    .sort()
    .reverse()
  if (!regions.length) throw Error('No regions found! Weird.')

  return regions
}

module.exports = {
  getRegions,
  LayerName,
}
