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
      status: 500,
      statusText: 'Server Error',
      text: async () => ''
    })
    await assert.rejects(
      () => kv('acct', '', 'tok', 'ns', 'key'),
      /GET failed: 500 Server Error/
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

describe('unit: operation input', () => {
  let calls

  before(() => {
    globalThis.fetch = async (url, init) => {
      calls.push({ url, init: init || {} })
      return { ok: true, text: async () => 'null' }
    }
  })

  after(() => {
    globalThis.fetch = originalFetch
  })

  const run = (value, operation, failOnMissing) => {
    calls = []
    return kv(
      'acct',
      '',
      'tok',
      'ns',
      'key',
      value,
      null,
      null,
      operation,
      failOnMissing
    )
  }

  it('puts an empty string when operation is put', async () => {
    await run('', 'put')
    assert.equal(calls.length, 1)
    assert.equal(calls[0].init.method, 'PUT')
    assert.equal(calls[0].init.body, '')
  })

  it('sends DELETE when operation is delete', async () => {
    const result = await run('', 'delete')
    assert.equal(calls[0].init.method, 'DELETE')
    assert.ok(calls[0].url.endsWith('/values/key'), calls[0].url)
    assert.equal(result, null)
  })

  it('throws when DELETE fails', async () => {
    globalThis.fetch = async () => ({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      text: async () => ''
    })
    await assert.rejects(() => run('', 'delete'), /DELETE failed: 403/)
  })

  it('gets when operation is get, even if a value is given', async () => {
    globalThis.fetch = async (url, init) => {
      calls.push({ url, init: init || {} })
      return { ok: true, text: async () => 'stored' }
    }
    const result = await run('ignored', 'get')
    assert.equal(calls[0].init.method, undefined)
    assert.equal(result, 'stored')
  })

  it('infers put from a non-empty value when operation is empty', async () => {
    await run('v', '')
    assert.equal(calls[0].init.method, 'PUT')
  })

  it('infers get from an empty value when operation is empty', async () => {
    await run('', '')
    assert.equal(calls[0].init.method, undefined)
  })

  it('rejects an unknown operation', async () => {
    await assert.rejects(() => run('', 'purge'), /Invalid operation: purge/)
  })
})

describe('unit: missing key on GET', () => {
  const keyNotFound =
    '{"success":false,"errors":[{"code":10009,"message":"get: \'key not found\'"}]}'
  const namespaceNotFound =
    '{"success":false,"errors":[{"code":10013,"message":"namespace not found"}]}'

  const respond404 = (body) => {
    globalThis.fetch = async () => ({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: async () => body
    })
  }

  after(() => {
    globalThis.fetch = originalFetch
  })

  it('throws on a missing key by default', async () => {
    respond404(keyNotFound)
    await assert.rejects(
      () => kv('acct', '', 'tok', 'ns', 'key'),
      /GET failed: 404 Not Found/
    )
  })

  it('throws on a missing key when fail_on_missing is true', async () => {
    respond404(keyNotFound)
    await assert.rejects(
      () => kv('acct', '', 'tok', 'ns', 'key', '', null, null, 'get', true),
      /GET failed: 404 Not Found/
    )
  })

  it('returns an empty string for a missing key when fail_on_missing is false', async () => {
    respond404(keyNotFound)
    const result = await kv(
      'acct',
      '',
      'tok',
      'ns',
      'key',
      '',
      null,
      null,
      'get',
      false
    )
    assert.equal(result, '')
  })

  it('matches the key-not-found message when the code differs', async () => {
    respond404('{"errors":[{"code":1,"message":"get: \'Key Not Found\'"}]}')
    const result = await kv(
      'a',
      '',
      't',
      'ns',
      'k',
      '',
      null,
      null,
      'get',
      false
    )
    assert.equal(result, '')
  })

  it('throws on another 404 even when fail_on_missing is false', async () => {
    respond404(namespaceNotFound)
    await assert.rejects(
      () => kv('acct', '', 'tok', 'ns', 'key', '', null, null, 'get', false),
      /GET failed: 404 Not Found .*namespace not found/
    )
  })

  it('throws on a 404 with an unparseable body when fail_on_missing is false', async () => {
    respond404('<html>Not Found</html>')
    await assert.rejects(
      () => kv('acct', '', 'tok', 'ns', 'key', '', null, null, 'get', false),
      /GET failed: 404 Not Found .*<html>/
    )
  })

  it('still throws on other GET errors', async () => {
    globalThis.fetch = async () => ({
      ok: false,
      status: 500,
      statusText: 'Server Error',
      text: async () => ''
    })
    await assert.rejects(
      () => kv('acct', '', 'tok', 'ns', 'key'),
      /GET failed: 500/
    )
  })
})

describe('unit: key name encoding', () => {
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

  it('encodes / and ? in the key on GET', async () => {
    await kv('acct', '', 'tok', 'ns', 'config/prod?x=1')
    const url = new URL(capturedUrl)
    assert.equal(url.search, '')
    assert.ok(
      url.pathname.endsWith('/values/config%2Fprod%3Fx%3D1'),
      `url was: ${capturedUrl}`
    )
  })

  it('encodes the key on PUT and keeps expiration query intact', async () => {
    await kv('acct', '', 'tok', 'ns', 'a b#c%d', 'val', null, 120)
    const url = new URL(capturedUrl)
    assert.ok(
      url.pathname.endsWith('/values/a%20b%23c%25d'),
      `url was: ${capturedUrl}`
    )
    assert.equal(url.search, '?expiration_ttl=120')
  })
})
