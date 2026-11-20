import assert from 'node:assert/strict'
import test from 'node:test'

import { withTargetDemoServer } from '../demo/withTargetDemoServer.ts'
import { findFreePort } from './fixtures/findFreePort.ts'

const HOST = '127.0.0.1'

const freeBaseUrl = async (): Promise<string> => `http://${HOST}:${String(await findFreePort())}`

// What the address answers `path` with while the target's demo server, if it names one, is served.
const statusDuringRun = async (
  serves: { servesDemoSite: boolean },
  path: string
): Promise<{ status: number; logged: string[] }> => {
  const baseUrl = await freeBaseUrl()
  const logged: string[] = []
  const status = await withTargetDemoServer(
    { baseUrl, ...serves },
    (message) => logged.push(message),
    async () => {
      const response = await fetch(`${baseUrl}${path}`).catch(() => ({ status: 0 }))
      return response.status
    }
  )
  return { status, logged: logged.map((message) => message.replace(baseUrl, '<address>')) }
}

void test('a target that serves the demo site has its pages and its API document served', async () => {
  const serves = { servesDemoSite: true }

  assert.deepEqual(await statusDuringRun(serves, '/books'), {
    status: 200,
    logged: ['the demo site is running at <address>', 'the demo site has shut down']
  })
  assert.equal((await statusDuringRun(serves, '/openapi.json')).status, 200)
})

void test('a target that names no demo server has none started', async () => {
  const serves = { servesDemoSite: false }

  assert.deepEqual(await statusDuringRun(serves, '/'), { status: 0, logged: [] })
})
