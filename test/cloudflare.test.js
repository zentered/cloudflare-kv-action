import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import kv from '../cloudflare.js'

// --- Unit tests (always run, fetch is mocked) ---

const originalFetch = globalThis.fetch

describe('unit: auth headers', () => {
  let capturedRequest

  before(() => {
    globalThis.fetch = async (url, init) => {
      capturedRequest = { url, options: init }
      return { ok: true, text: async () => 'null' }
    }
  })

  after(() => {
    globalThis.fetch = originalFetch
  })

  it('uses Bearer token when no email provided', async () => {
    await kv('acct', '', 'mytoken', 'ns', 'key', 'val')
    assert.equal(
      capturedRequest.options.headers['Authorization'],
      'Bearer mytoken'
    )
    assert.equal(capturedRequest.options.headers['X-Auth-Email'], undefined)
  })

  it('uses legacy auth when email provided', async () => {
    await kv('acct', 'user@example.com', 'mykey', 'ns', 'key', 'val')
    assert.equal(capturedRequest.options.headers['X-Auth-Key'], 'mykey')
    assert.equal(
      capturedRequest.options.headers['X-Auth-Email'],
      'user@example.com'
    )
    assert.equal(capturedRequest.options.headers['Authorization'], undefined)
  })
})

describe('unit: expiration params', () => {
  let capturedUrl

  before(() => {
    globalThis.fetch = async (url) => {
      capturedUrl = url
      return { ok: true, text: async () => 'null' }
    }
  })

  after(() => {
    globalThis.fetch = originalFetch
  })

  it('appends expiration_ttl query param', async () => {
    await kv('acct', '', 'tok', 'ns', 'key', 'val', null, 120)
    assert.ok(
      capturedUrl.includes('expiration_ttl=120'),
      `url was: ${capturedUrl}`
    )
  })

  it('appends expiration query param', async () => {
    await kv('acct', '', 'tok', 'ns', 'key', 'val', 1700000000, null)
    assert.ok(
      capturedUrl.includes('expiration=1700000000'),
      `url was: ${capturedUrl}`
    )
  })

  it('expiration takes precedence over expiration_ttl', async () => {
    await kv('acct', '', 'tok', 'ns', 'key', 'val', 1700000000, 120)
    assert.ok(
      capturedUrl.includes('expiration=1700000000'),
      `url was: ${capturedUrl}`
    )
    assert.ok(
      !capturedUrl.includes('expiration_ttl'),
      `url was: ${capturedUrl}`
    )
  })
})

describe('unit: GET response parsing', () => {
  it('parses JSON response', async () => {
    globalThis.fetch = async () => ({
      ok: true,
      text: async () => '{"hello":"world"}'
    })
    const result = await kv('acct', '', 'tok', 'ns', 'key')
    assert.deepEqual(result, { hello: 'world' })
    globalThis.fetch = originalFetch
  })

  it('returns plain text when response is not valid JSON', async () => {
    globalThis.fetch = async () => ({
      ok: true,
      text: async () => 'plain text value'
    })
    const result = await kv('acct', '', 'tok', 'ns', 'key')
    assert.equal(result, 'plain text value')
    globalThis.fetch = originalFetch
  })

  it('returns null for JSON null value', async () => {
    globalThis.fetch = async () => ({
      ok: true,
      text: async () => 'null'
    })
    const result = await kv('acct', '', 'tok', 'ns', 'key')
    assert.equal(result, null)
    globalThis.fetch = originalFetch
  })
})

describe('unit: object value serialization', () => {
  it('serializes object value to JSON string', async () => {
    let capturedBody
    globalThis.fetch = async (url, options) => {
      capturedBody = options.body
      return { ok: true, text: async () => 'null' }
    }
    await kv('acct', '', 'tok', 'ns', 'key', { hello: 'world' })
    assert.equal(capturedBody, '{"hello":"world"}')
    globalThis.fetch = originalFetch
  })
})

describe('unit: error handling', () => {
  it('throws on PUT failure', async () => {
    globalThis.fetch = async () => ({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      text: async () => ''
    })
    await assert.rejects(
      () => kv('acct', '', 'tok', 'ns', 'key', 'val'),
      /PUT failed: 403 Forbidden/
    )
    globalThis.fetch = originalFetch
  })

  it('throws on GET failure', async () => {
    globalThis.fetch = async () => ({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: async () => ''
    })
    await assert.rejects(
      () => kv('acct', '', 'tok', 'ns', 'key'),
      /GET failed: 404 Not Found/
    )
    globalThis.fetch = originalFetch
  })

  it('includes error body in PUT failure message', async () => {
    globalThis.fetch = async () => ({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () =>
        '{"errors":[{"code":10000,"message":"Authentication error"}]}'
    })
    await assert.rejects(
      () => kv('acct', '', 'tok', 'ns', 'key', 'val'),
      /PUT failed: 401 Unauthorized — \{"errors"/
    )
    globalThis.fetch = originalFetch
  })

  it('includes error body in GET failure message', async () => {
    globalThis.fetch = async () => ({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () =>
        '{"errors":[{"code":10000,"message":"Authentication error"}]}'
    })
    await assert.rejects(
      () => kv('acct', '', 'tok', 'ns', 'key'),
      /GET failed: 401 Unauthorized — \{"errors"/
    )
    globalThis.fetch = originalFetch
  })
})

// --- End-to-end tests (mocked fetch, full PUT→GET flow) ---

describe('e2e: put and get', () => {
  const store = {}

  before(() => {
    globalThis.fetch = async (url, init) => {
      const key = new URL(url).pathname.split('/').pop()
      if (init && init.method === 'PUT') {
        store[key] = init.body
        return { ok: true, text: async () => 'null' }
      }
      return {
        ok: true,
        text: async () => store[key] || ''
      }
    }
  })

  after(() => {
    globalThis.fetch = originalFetch
  })

  it('put', async () => {
    const result = await kv(
      'acct',
      '',
      'tok',
      'ns',
      'test-key',
      { hello: 'world' },
      null,
      120
    )
    assert.equal(result, null)
  })

  it('get', async () => {
    const result = await kv('acct', '', 'tok', 'ns', 'test-key')
    assert.deepEqual(result, { hello: 'world' })
  })
})
