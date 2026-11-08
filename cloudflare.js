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

// Cloudflare does not document the error for a missing key. The API returns
// code 10009 with the message "get: 'key not found'". Other 404s (unknown
// namespace or account) carry other errors and must not count as missing.
function isKeyNotFound(body) {
  try {
    return JSON.parse(body).errors.some(
      (error) =>
        error.code === 10009 || /key not found/i.test(error.message ?? '')
    )
  } catch {
    return false
  }
}

async function get(kvUrl, headers, failOnMissing) {
  const response = await fetch(kvUrl, { headers })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    if (response.status === 404 && !failOnMissing && isKeyNotFound(body)) {
      return ''
    }
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
  failOnMissing = true
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
