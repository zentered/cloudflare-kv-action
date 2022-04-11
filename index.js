import core from '@actions/core'
import kv from './cloudflare.js'

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

    if (returnValue) {
      core.setOutput('value', returnValue)
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
