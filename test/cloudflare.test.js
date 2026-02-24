'use strict'

import t from 'tap'
import fn from '../cloudflare.js'

const test = t.test
const skip = process.env.CI

test(
  'skip tests on ci as env variables are require',
  { skip: !skip },
  async (t) => {
    t.ok(true)
    return
  }
)

test('put', { skip: skip }, async (t) => {
  const testObj = { hello: 'world' }

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const apiKey = process.env.CLOUDFLARE_API_KEY
  const accountEmail = process.env.CLOUDFLARE_ACCOUNT_EMAIL

  const namespaceId = process.env.CLOUDFLARE_NAMESPACE_IDENTIFIER
  const key = 'cloudflare-kv-test-key'
  const value = testObj
  const expirationTtl = 120

  const actual = await fn(
    accountId,
    accountEmail,
    apiKey,
    namespaceId,
    key,
    value,
    expirationTtl
  )

  t.same(actual, null)
})

test('get', { skip: skip }, async (t) => {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const apiKey = process.env.CLOUDFLARE_API_KEY
  const accountEmail = process.env.CLOUDFLARE_ACCOUNT_EMAIL

  const namespaceId = process.env.CLOUDFLARE_NAMESPACE_IDENTIFIER
  const key = 'cloudflare-kv-test-key'

  const actual = await fn(accountId, accountEmail, apiKey, namespaceId, key)
  const expected = { hello: 'world' }

  t.same(actual, expected)
})
