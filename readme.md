# Architect real-time Lambda telemetry extension

[![GitHub CI status](https://github.com/architect/telemetry-extension/workflows/Node%20CI/badge.svg)](https://github.com/architect/telemetry-extension/actions?query=workflow%3A%22Node+CI%22)

Stream Lambda telemetry to an arbitrary endpoint in real-time.


## Installation

| Region                          | ARN                                                            |
|---------------------------------|----------------------------------------------------------------|
| Any (except `us-gov-*`, `cn-*`) | `arn:aws:lambda:<region>:315848108193:layer:arc-telemetry:2` |

After adding the extension ARN to your Lambda layers, be sure to [configure the extension's telemetry URL](#extension-configuration).

> Note: this extension is currently only compatible with Node.js Lambda runtimes. You can also test the `staging` version of the extension by changing the above layer name to `arc-telemetry-staging` (and using the latest version number).


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
  ignore: Array,                  // Default (disabled); array of event types to skip transmitting, e.g. 'platform.telemetrySubscription'
  // Any additional properties in the config object will be passed to the telemetry URL
})
```


### Data shape

The extension will publish to your configured URL as JSON with a Lambda telemetry events array called `telemetry`. Any other properties found in your `TELEMETRY_CONFIG` will be present at the top level of the published request. This is useful for securing your telemetry API with secrets.

Additionally, a top-level property named `batch` will be present with a UUID string; this represents the unique telemetry batch published by the extension so as to differentiate it from other telemetry data with the same timestamp.

The `batch` property may be ignored if you prefer to try relying on the invocation ID that is usually (but not always) present in the raw telemetry data – hence the addition of the `batch` property.

Because telemetry items may arrive with the same timestamp within a given invocation, the extension also provides each telemetry item with a zero-indexed property called `pos` denoting its sequence position within said timestamp.


#### Example

If your `TELEMETRY_CONFIG` was:

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
  "batch": String, // UUID
  "telemetry": [
    {
      "time": "2022-01-01T01:23:45.678Z",
      "type": "function",
      "record": "The actual telemetry body from Lambda",
      "pos": 0 // Zero-indexed position of this record within a given unique Lambda invocation + timestamp
    }
    ...the rest of your events
  ]
}
```


## Deployment options

If you would like to deploy this extension to your own Lambda layer collection (instead of using the publicly published version above), you can customize the extension name by setting the `LAYER_NAME` env var (which defaults to `arc-telemetry`) when running `npm run publish`.
