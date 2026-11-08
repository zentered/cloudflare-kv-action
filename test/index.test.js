import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const indexPath = fileURLToPath(new URL('../index.js', import.meta.url))
const stubPath = fileURLToPath(
  new URL('./helpers/stub-fetch.mjs', import.meta.url)
)

function runAction(env) {
  const result = spawnSync(
    process.execPath,
    ['--import', stubPath, indexPath],
    {
      env: {
        PATH: process.env.PATH,
        CLOUDFLARE_ACCOUNT_ID: 'acct',
        CLOUDFLARE_API_KEY: 'tok',
        INPUT_NAMESPACE_IDENTIFIER: 'ns',
        INPUT_KEY_NAME: 'key',
        ...env
      },
      encoding: 'utf8'
    }
  )
  return result.stdout
}

describe('action: masking', () => {
  it('masks a value read from KV before it is set as output', () => {
    const out = runAction({ STUB_BODY: 's3cret-token' })
    const maskAt = out.indexOf('::add-mask::s3cret-token')
    const outputAt = out.indexOf('::set-output name=value::s3cret-token')
    assert.ok(maskAt !== -1, `no add-mask in stdout: ${out}`)
    assert.ok(outputAt !== -1, `no set-output in stdout: ${out}`)
    assert.ok(maskAt < outputAt, 'mask must come before output')
  })

  it('masks the JSON form of an object value', () => {
    const out = runAction({ STUB_BODY: '{"token":"abc"}' })
    assert.ok(out.includes('::add-mask::{"token":"abc"}'), out)
  })

  it('does not mask an empty value', () => {
    const out = runAction({ STUB_BODY: '' })
    assert.ok(!out.includes('::add-mask::'), out)
  })

  it('does not mask when a value is put', () => {
    const out = runAction({ INPUT_VALUE: 'new-value', STUB_BODY: '' })
    assert.ok(!out.includes('::add-mask::'), out)
  })

  it('masks every string and number leaf of a parsed object', () => {
    const out = runAction({
      STUB_BODY:
        '{"a":{"token":"leaf-secret"},"list":["item-one",424242],"ok":true}'
    })
    assert.ok(out.includes('::add-mask::leaf-secret\n'), out)
    assert.ok(out.includes('::add-mask::item-one\n'), out)
    assert.ok(out.includes('::add-mask::424242\n'), out)
  })

  it('masks every non-empty trimmed line of a multi-line value', () => {
    const out = runAction({
      STUB_BODY: 'first-line\n  second-line  \n\nthird-line'
    })
    assert.ok(out.includes('::add-mask::first-line\n'), out)
    assert.ok(out.includes('::add-mask::second-line\n'), out)
    assert.ok(out.includes('::add-mask::third-line\n'), out)
  })

  it('masks every line of a multi-line string inside an object', () => {
    const out = runAction({ STUB_BODY: '{"key":"line-a\\nline-b"}' })
    assert.ok(out.includes('::add-mask::line-a\n'), out)
    assert.ok(out.includes('::add-mask::line-b\n'), out)
  })

  it('masks the innermost leaf of a deeply nested array', () => {
    const depth = 4000
    const body = '['.repeat(depth) + '"deep-secret"' + ']'.repeat(depth)
    const out = runAction({ STUB_BODY: body })
    assert.ok(out.includes('::add-mask::deep-secret\n'), out.slice(0, 300))
    assert.ok(!out.includes('::error::'), out.slice(0, 300))
  })

  it('masks the JSON-escaped form of a string leaf with quotes and backslashes', () => {
    const out = runAction({ STUB_BODY: '{"t":"ab\\"cd\\\\ef"}' })
    assert.ok(out.includes('::add-mask::ab"cd\\ef\n'), out)
    assert.ok(out.includes('::add-mask::ab\\"cd\\\\ef\n'), out)
  })
})
