# Cloudflare KV Action

![Test](https://github.com/zentered/cloudflare-kv-action/workflows/Test/badge.svg)
![Release](https://github.com/zentered/cloudflare-kv-action/workflows/Publish/badge.svg)
![Semantic Release](https://github.com/govolition/storefront-api/workflows/Semantic%20Release/badge.svg)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)

Put and get values from Cloudflare KV.

## Table of Contents

- [Usage](#usage)
- [Environment Variables](#environment-variables--secret)
- [Inputs](#inputs)
- [Outputs](#outputs)

## Usage

[Copy your "Global API Key"](https://dash.cloudflare.com/profile/api-tokens)

Cloudflare needs a little time to build the preview, you can check the average
build time in your deployments and add the seconds plus a little to a `sleep`
action, to wait until the deployment is ready. The action only works on
branches, so make sure you exclude the `main` branch from the trigger:

```yaml
on:
  push:
    branches:
      - '**'
      - '!main'
```

Here are the steps for an example job:

```yaml
- run: sleep 30
- name: cloudflare-kv-action
  uses: zentered/cloudflare-kv-action@v1.0.0
  id: cloudflare_kv
  env:
    CLOUDFLARE_API_KEY: ${{ secrets.CLOUDFLARE_API_KEY }}
    CLOUDFLARE_ACCOUNT_EMAIL: ${{ secrets.CLOUDFLARE_ACCOUNT_EMAIL }}
    CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
  with:
    namespace_identifier: '123'
    key_name: 'hello'
    value: 'world'
    expiration_ttl: 120
- name: Value
  run: echo "${{ steps.cloudflare_kv.outputs.value }}"
```

## Environment Variables / Secret

In the repository, go to "Settings", then "Secrets" and add
"CLOUDFLARE_API_TOKEN", the value you can retrieve on your
[Cloudflare account](https://dash.cloudflare.com/profile/api-tokens). You also
need to add:

- `CLOUDFLARE_ACCOUNT_EMAIL` (your login email, optional)
- `CLOUDFLARE_ACCOUNT_ID` (from the URL:
  `https://dash.cloudflare.com/123abc....`)
- `CLOUDFLARE_API_KEY` (from the URL:
  `https://dash.cloudflare.com/profile/api-tokens`)

## Inputs

| Name                   | Requirement | Description                                                                                                                                                               |
| ---------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `namespace_identifier` | required    | Cloudflare namespace ID                                                                                                                                                   |
| `key_name`             | required    | KV key name                                                                                                                                                               |
| `value`                | optional    | Optional: Use "value" to set a key, otherwise it will be retrieved                                                                                                        |
| `expiration`           | optional    | Optional: expiration                                                                                                                                                      |
| `expiration_ttl`       | optional    | Optional: If neither expiration nor expiration_ttl is specified, the key-value pair will never expire. If both are set, expiration_ttl is used and expiration is ignored. |

[Cloudflare API Reference](https://api.cloudflare.com/#workers-kv-namespace-write-key-value-pair)

## Outputs

| Name    | Description |
| ------- | ----------- |
| `value` | KV value    |

## Contributing

See [CONTRIBUTING](CONTRIBUTING.md).

## License

See [LICENSE](LICENSE).
