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
        // The runner applies the action.yml default.
        INPUT_FAIL_ON_MISSING: 'true',
        ...env
      },
      encoding: 'utf8'
    }
  )
  return result.stdout
}

const keyNotFound =
  '{"success":false,"errors":[{"code":10009,"message":"get: \'key not found\'"}]}'

describe('action: missing key', () => {
  it('fails the step on a missing key by default', () => {
    const out = runAction({ STUB_STATUS: '404', STUB_BODY: keyNotFound })
    assert.ok(out.includes('::error::GET failed: 404'), out)
  })

  it('does not fail the step when fail_on_missing is false', () => {
    const out = runAction({
      STUB_STATUS: '404',
      STUB_BODY: keyNotFound,
      INPUT_FAIL_ON_MISSING: 'false'
    })
    assert.ok(!out.includes('::error::'), out)
    assert.ok(out.includes('::set-output name=value::'), out)
  })

  it('fails the step when fail_on_missing is true', () => {
    const out = runAction({
      STUB_STATUS: '404',
      STUB_BODY: keyNotFound,
      INPUT_FAIL_ON_MISSING: 'true'
    })
    assert.ok(out.includes('::error::GET failed: 404'), out)
  })

  it('fails loudly on an invalid fail_on_missing value', () => {
    const out = runAction({ INPUT_FAIL_ON_MISSING: 'yes' })
    assert.ok(out.includes('::error::Input does not meet YAML 1.2'), out)
  })

  it('reads operation from the input', () => {
    const out = runAction({
      INPUT_OPERATION: 'purge',
      INPUT_FAIL_ON_MISSING: 'true'
    })
    assert.ok(out.includes('::error::Invalid operation: purge'), out)
  })
})
