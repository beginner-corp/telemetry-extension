# Begin real-time Lambda telemetry extension

[![GitHub CI status](https://github.com/beginner-corp/telemetry-extension/workflows/Node%20CI/badge.svg)](https://github.com/beginner-corp/telemetry-extension/actions?query=workflow%3A%22Node+CI%22)

Stream Lambda telemetry to an arbitrary endpoint in real-time.


## Installation

| Region                          | ARN                                                            |
|---------------------------------|----------------------------------------------------------------|
| Any (except `us-gov-*`, `cn-*`) | `arn:aws:lambda:<region>:315848108193:layer:begin-telemetry:1` |

After adding the extension ARN to your Lambda layers, be sure to [configure the extension's telemetry URL](#extension-configuration).

> Note: this extension is currently only compatible with Node.js Lambda runtimes. You can also test the `staging` version of the extension by changing the above layer name to `begin-telemetry-staging` (and using the latest version number).


## Extension configuration

Configure the extension via the following Lambda environment variables; either `TELEMETRY_CONFIG` with a `url` property or `TELEMETRY_URL` are required:

- `TELEMETRY_CONFIG` (JSON-serialized [configuration object](#configuration-object)) - See options below; any data in config will be passed to the telemetry endpoint, so if you intend to secure your API requests, this is where you should place your secrets
- `TELEMETRY_URL` (String) - Telemetry endpoint to emit events to; supersedes `config.url`
- `TELEMETRY_DEBUG` (Boolean, default disabled) - Enables extension debug logging to CloudWatch logs; supersedes `config.debug`; do not enter `false`, as env vars are coerced to strings (which is truthy)


### Configuration object

```js
process.env.TELEMETRY_CONFIG = JSON.stringify({
  debug: Boolean,                 // Default: false,
  rate: Number,                   // Minimum batch rate; default: 333,
  url: String,                    // Must be defined here or with `TELEMETRY_URL`
  // Lambda API config
  telemetryTypes: Array,          // Default: [ 'platform', 'function' ]
  telemetryTimeoutMs: Number,     // Default: 25,
  telemetryListenerPort: Number,  // Default: 4243,
  // Any additional properties in the config object will be passed to the telemetry URL
})
```


### Data shape

The extension will publish to your configured URL as JSON with a Lambda telemetry events array called `telemetry`. Any other properties found in your `TELEMETRY_CONFIG` will be present at the top level of the published request.

For example, if your `TELEMETRY_CONFIG` was:
```json
{
  "url": "https://foo.bar/telemetry-endpoint",
  "token": "fiz-buz"
}
```

The following payload shape would be sent to the above endpoint with each interval of events:

```json
{
  "token": "fiz-buz",
  "telemetry": [
    ...events
  ]
}
```


## Deployment options

If you would like to deploy this extension to your own Lambda layer collection (instead of using the publicly published version above), you can customize the extension name by setting the `LAYER_NAME` env var (which defaults to `begin-telemetry`) when running `npm run publish`.
