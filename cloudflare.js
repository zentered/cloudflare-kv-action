import core from '@actions/core'
import fetch from 'node-fetch'

const API_VERSION = 'v4'

async function set(kvUrl, headers, value, expiration, expirationTtl) {
  let url = kvUrl

  headers['Content-Type'] = 'text/plain'

  if (expiration) {
    url = `${url}?expiration=${expiration}`
  } else if (expirationTtl) {
    url = `${url}?expiration_ttl=${expirationTtl}`
  }

  if (typeof value !== 'string') {
    if (Object.keys(value).length > 0) {
      value = JSON.stringify(value)
    } else {
      value = value.toString()
    }
  }

  await fetch(url, {
    method: 'PUT',
    body: value,
    headers
  })

  return null
}

async function get(kvUrl, headers) {
  const response = await fetch(kvUrl, {
    headers,
    responseType: 'json',
    responseEncoding: 'utf8'
  })
  const text = await response.text()
  return text
}

export default async function kv(
  accountId,
  accountEmail,
  apiKey,
  namespaceId,
  key,
  value,
  expiration,
  expirationTtl
) {
  const kvUrl = `https://api.cloudflare.com/client/${API_VERSION}/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${key}`

  const headers = accountEmail
    ? {
        'X-Auth-Key': apiKey,
        'X-Auth-Email': accountEmail
      }
    : {
        Authorization: `Bearer ${apiKey}`
      }

  if (value && (value.length > 0 || Object.keys(value).length > 0)) {
    core.info(`Setting value for ${key}`)
    return set(kvUrl, headers, value, expirationTtl)
  } else {
    core.info(`Getting value for ${key}`)
    return get(kvUrl, headers)
  }
}
