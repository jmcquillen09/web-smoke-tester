import assert from 'node:assert/strict'
import test from 'node:test'

import { demoApi } from '../demo/demoApi.ts'
import { demoSite } from '../demo/demoSite.ts'
import { runNodeScript } from './fixtures/runNodeScript.ts'

const UNSERVABLE_ADDRESSES = [
  'http://localhost',
  'https://localhost:4020',
  'localhost:4020',
  'not an address',
  'http://alice:secret@localhost:4020'
]

for (const demo of [demoApi, demoSite]) {
  void test(`the ${demo.label} is served only at a plain http address that names its port`, async () => {
    for (const address of UNSERVABLE_ADDRESSES) {
      const run = await runNodeScript([demo.script, address], {})

      assert.equal(run.code, 1, address)
      assert.match(
        run.output,
        new RegExp(
          `The ${demo.label} is served at an address like http://localhost:<port>, with no user name or password; the address given is not one\\.`
        ),
        address
      )
    }
  })

  void test(`the ${demo.label} never prints back a password it is given`, async () => {
    const run = await runNodeScript([demo.script, 'http://alice:secret@localhost:4020'], {})

    assert.equal(run.output.includes('secret'), false, run.output)
    assert.equal(run.output.includes('alice'), false, run.output)
  })
}
