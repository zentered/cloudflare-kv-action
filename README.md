# Cloudflare KV Action

![Test](https://github.com/zentered/cloudflare-kv-action/workflows/Test/badge.svg)
![Release](https://github.com/zentered/cloudflare-kv-action/workflows/Publish/badge.svg)
[![semantic-release: conventional](https://img.shields.io/badge/semantic--release-conventional-e10079?logo=semantic-release)](https://github.com/semantic-release/semantic-release)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)

Put and get values from Cloudflare KV.

## Table of Contents

- [Usage](#usage)
- [Environment Variables](#environment-variables--secret)
- [Inputs](#inputs)
- [Outputs](#outputs)
- [Development](#development)

## Usage

### Bearer Token (recommended)

Create an [API Token](https://dash.cloudflare.com/profile/api-tokens) with
Workers KV Storage permissions.

```yaml
- name: cloudflare-kv-action
  uses: zentered/cloudflare-kv-action@v2
  id: cloudflare_kv
  env:
    CLOUDFLARE_API_KEY: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
  with:
    namespace_identifier: '123'
    key_name: 'hello'
    value: 'world'
    expiration_ttl: 120
- name: Value
  run: echo "${{ steps.cloudflare_kv.outputs.value }}"
```

### Legacy Auth (API Key + Email)

```yaml
- name: cloudflare-kv-action
  uses: zentered/cloudflare-kv-action@v2
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

In the repository, go to "Settings", then "Secrets" and add your Cloudflare
credentials. You can retrieve them on your
[Cloudflare account](https://dash.cloudflare.com/profile/api-tokens).

| Variable                   | Required | Description                                            |
| -------------------------- | -------- | ------------------------------------------------------ |
| `CLOUDFLARE_ACCOUNT_ID`    | required | From the URL: `https://dash.cloudflare.com/123abc....` |
| `CLOUDFLARE_API_KEY`       | required | API Token (Bearer) or Global API Key (legacy)          |
| `CLOUDFLARE_ACCOUNT_EMAIL` | optional | Required only for legacy API Key auth                  |

## Inputs

| Name                   | Requirement | Description                                                                                                       |
| ---------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------- |
| `namespace_identifier` | required    | Cloudflare namespace ID                                                                                           |
| `key_name`             | required    | KV key name                                                                                                       |
| `value`                | optional    | Use "value" to set a key; omit to retrieve the current value                                                      |
| `expiration`           | optional    | Absolute expiration (Unix timestamp)                                                                              |
| `expiration_ttl`       | optional    | Relative expiration in seconds. If both `expiration` and `expiration_ttl` are set, `expiration` takes precedence. |

[Cloudflare API Reference](https://api.cloudflare.com/#workers-kv-namespace-write-key-value-pair)

## Outputs

| Name    | Description |
| ------- | ----------- |
| `value` | KV value    |

## Development

Requirements: Node >= 20

```bash
# Install dependencies
npm install

# Copy and fill in your Cloudflare credentials
cp .env.example .env

# Run linter
npm run lint

# Run tests (unit tests run without credentials; integration tests require .env)
npm test

# Rebuild dist/ after code changes
npm run prepare
```

## Contributing

See [CONTRIBUTING](CONTRIBUTING.md).

## License

See [LICENSE](LICENSE).
