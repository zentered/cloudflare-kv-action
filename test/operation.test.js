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

describe('action: missing key', () => {
  it('does not fail the step on a missing key by default', () => {
    const out = runAction({ STUB_STATUS: '404' })
    assert.ok(!out.includes('::error::'), out)
    assert.ok(out.includes('::set-output name=value::'), out)
  })

  it('fails the step when fail_on_missing is true', () => {
    const out = runAction({ STUB_STATUS: '404', INPUT_FAIL_ON_MISSING: 'true' })
    assert.ok(out.includes('::error::GET failed: 404'), out)
  })

  it('reads operation from the input', () => {
    const out = runAction({ INPUT_OPERATION: 'purge' })
    assert.ok(out.includes('::error::Invalid operation: purge'), out)
  })
})
