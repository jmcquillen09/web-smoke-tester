import assert from 'node:assert/strict'
import test from 'node:test'

import { demoSite } from '../demo/demoSite.ts'
import { runNodeScript } from './fixtures/runNodeScript.ts'

const UNSERVABLE_ADDRESSES = [
  'http://localhost',
  'https://localhost:4020',
  'localhost:4020',
  'not an address',
  'http://alice:secret@localhost:4020'
]

void test('the demo site is served only at a plain http address that names its port', async () => {
  for (const address of UNSERVABLE_ADDRESSES) {
    const run = await runNodeScript([demoSite.script, address], {})

    assert.equal(run.code, 1, address)
    assert.match(
      run.output,
      /The demo site is served at an address like http:\/\/localhost:<port>, with no user name or password; the address given is not one\./,
      address
    )
  }
})

void test('the demo site never prints back a password it is given', async () => {
  const run = await runNodeScript([demoSite.script, 'http://alice:secret@localhost:4020'], {})

  assert.equal(run.output.includes('secret'), false, run.output)
  assert.equal(run.output.includes('alice'), false, run.output)
})
