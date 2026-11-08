import * as core from '@actions/core'
import kv from './cloudflare.js'

// KV often holds tokens. Mask the value, each of its lines (the runner masks
// per line) and each string or number inside parsed JSON, so that
// fromJSON(...).token is masked too.
function maskValue(value) {
  const secrets = new Set()

  const add = (text) => {
    secrets.add(text)
    for (const line of text.split('\n')) {
      secrets.add(line.trim())
    }
  }

  // Explicit stack: deeply nested JSON must not overflow the call stack.
  const addLeaves = (root) => {
    const stack = [root]
    while (stack.length > 0) {
      const node = stack.pop()
      if (typeof node === 'string') {
        add(node)
        // toJSON prints quotes and backslashes escaped.
        const escaped = JSON.stringify(node).slice(1, -1)
        if (escaped !== node) {
          add(escaped)
        }
      } else if (typeof node === 'number') {
        add(String(node))
      } else if (node && typeof node === 'object') {
        for (const child of Object.values(node)) {
          stack.push(child)
        }
      }
    }
  }

  if (typeof value === 'string') {
    add(value)
  } else {
    add(JSON.stringify(value))
    addLeaves(value)
  }

  for (const secret of secrets) {
    if (secret) {
      core.setSecret(secret)
    }
  }
}

async function run() {
  try {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
    const apiKey = process.env.CLOUDFLARE_API_KEY
    const accountEmail = process.env.CLOUDFLARE_ACCOUNT_EMAIL

    const namespaceId = core.getInput('namespace_identifier')
    const key = core.getInput('key_name')
    const value = core.getInput('value')
    const expirationTtl = core.getInput('expiration_ttl')
    const expiration = core.getInput('expiration')

    const returnValue = await kv(
      accountId,
      accountEmail,
      apiKey,
      namespaceId,
      key,
      value,
      expiration,
      expirationTtl
    )

    if (returnValue !== null && returnValue !== undefined) {
      maskValue(returnValue)
      core.setOutput('value', returnValue)
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
