import * as core from '@actions/core'

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

  const response = await fetch(url, {
    method: 'PUT',
    body: value,
    headers
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(
      `PUT failed: ${response.status} ${response.statusText}${body ? ` — ${body}` : ''}`
    )
  }

  return null
}

async function get(kvUrl, headers, failOnMissing) {
  const response = await fetch(kvUrl, { headers })

  if (response.status === 404 && !failOnMissing) {
    return ''
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(
      `GET failed: ${response.status} ${response.statusText}${body ? ` — ${body}` : ''}`
    )
  }

  const text = await response.text()
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

async function remove(kvUrl, headers) {
  const response = await fetch(kvUrl, { method: 'DELETE', headers })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(
      `DELETE failed: ${response.status} ${response.statusText}${body ? ` — ${body}` : ''}`
    )
  }

  return null
}

const OPERATIONS = ['get', 'put', 'delete']

export default async function kv(
  accountId,
  accountEmail,
  apiKey,
  namespaceId,
  key,
  value,
  expiration,
  expirationTtl,
  operation,
  failOnMissing
) {
  if (operation && !OPERATIONS.includes(operation)) {
    throw new Error(
      `Invalid operation: ${operation}. Use one of: ${OPERATIONS.join(', ')}`
    )
  }

  const kvUrl = `https://api.cloudflare.com/client/${API_VERSION}/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${key}`

  const headers = accountEmail
    ? {
        'X-Auth-Key': apiKey,
        'X-Auth-Email': accountEmail
      }
    : {
        Authorization: `Bearer ${apiKey}`
      }

  // Without an explicit operation, infer it: a non-empty value sets, else get.
  const op =
    operation ||
    (value && (value.length > 0 || Object.keys(value).length > 0)
      ? 'put'
      : 'get')

  if (op === 'put') {
    core.info(`Setting value for ${key}`)
    return set(kvUrl, headers, value ?? '', expiration, expirationTtl)
  } else if (op === 'delete') {
    core.info(`Deleting ${key}`)
    return remove(kvUrl, headers)
  } else {
    core.info(`Getting value for ${key}`)
    return get(kvUrl, headers, failOnMissing)
  }
}
