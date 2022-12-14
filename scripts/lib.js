let { SSMClient, GetParametersByPathCommand } = require('@aws-sdk/client-ssm')

async function getRegions () {
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
  if (!regions.length) throw Error('No regions found! Weird.')

  return regions
}

let { BEGIN_STAGING, CUSTOM_NAME } = process.env
let LayerName = BEGIN_STAGING ? 'begin-telemetry' : 'begin-telemetry-staging'
if (CUSTOM_NAME) LayerName = CUSTOM_NAME

module.exports = {
  getRegions,
  LayerName,
}
