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
})
