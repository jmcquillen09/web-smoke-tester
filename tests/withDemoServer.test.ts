import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import test from 'node:test'

import { demoSite } from '../demo/demoSite.ts'
import { startDemoServer } from '../demo/startDemoServer.ts'
import { stopDemoServer } from '../demo/stopDemoServer.ts'
import { withDemoServer } from '../demo/withDemoServer.ts'
import { findFreePort } from './fixtures/findFreePort.ts'

const HOST = '127.0.0.1'

const freeBaseUrl = async (): Promise<string> => `http://${HOST}:${String(await findFreePort())}`

void test('the demo server answers while the work runs and has shut down once it is done', async () => {
  const baseUrl = await freeBaseUrl()
  const logged: string[] = []

  const status = await withDemoServer(
    demoSite,
    baseUrl,
    (message) => logged.push(message),
    async () => {
      const response = await fetch(baseUrl)
      await response.body?.cancel()
      return response.status
    }
  )

  assert.equal(status, 200)
  assert.deepEqual(logged, [
    `the demo site is running at ${baseUrl}`,
    'the demo site has shut down'
  ])
  await assert.rejects(fetch(baseUrl))
})

void test('the demo server is shut down when the work fails, and the failure is the work’s', async () => {
  const baseUrl = await freeBaseUrl()
  const logged: string[] = []
  const failure = new Error('the tests could not start')

  await assert.rejects(
    withDemoServer(
      demoSite,
      baseUrl,
      (message) => logged.push(message),
      async () => {
        throw failure
      }
    ),
    failure
  )

  assert.equal(logged.at(-1), 'the demo site has shut down')
  await assert.rejects(fetch(baseUrl))
})

void test('a port that is taken starts no work', async () => {
  const holder = await startDemoServer(demoSite, 0, HOST)
  const { port } = holder.address() as AddressInfo
  let hasWorked = false
  try {
    await assert.rejects(
      withDemoServer(
        demoSite,
        `http://${HOST}:${String(port)}`,
        () => {},
        async () => {
          hasWorked = true
        }
      ),
      { name: 'DemoServerError' }
    )

    assert.equal(hasWorked, false)
    assert.equal(holder.listening, true)
  } finally {
    await stopDemoServer(demoSite, holder)
  }
})

void test('the demo server is shut down when announcing it fails', async () => {
  const baseUrl = await freeBaseUrl()
  const failure = new Error('the output is closed')

  await assert.rejects(
    withDemoServer(
      demoSite,
      baseUrl,
      () => {
        throw failure
      },
      async () => {}
    ),
    failure
  )

  await assert.rejects(fetch(baseUrl))
})
