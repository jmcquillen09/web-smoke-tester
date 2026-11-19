import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import test from 'node:test'

import { demoSite } from '../demo/demoSite.ts'
import { startDemoServer } from '../demo/startDemoServer.ts'
import { stopDemoServer } from '../demo/stopDemoServer.ts'
import { withTargetDemoServer } from '../demo/withTargetDemoServer.ts'

const HOST = '127.0.0.1'

// An address nothing listens on: a port the system just handed out and took back.
const freeBaseUrl = async (): Promise<string> => {
  const server = await startDemoServer(demoSite, 0, HOST)
  const { port } = server.address() as AddressInfo
  await stopDemoServer(demoSite, server)
  return `http://${HOST}:${String(port)}`
}

// What the address answers `path` with while the target's demo server, if it names one, is served.
const statusDuringRun = async (
  serves: { servesDemoApi: boolean; servesDemoSite: boolean },
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
  const serves = { servesDemoApi: false, servesDemoSite: true }

  assert.deepEqual(await statusDuringRun(serves, '/books'), {
    status: 200,
    logged: ['the demo site is running at <address>', 'the demo site has shut down']
  })
  assert.equal((await statusDuringRun(serves, '/openapi.json')).status, 200)
})

void test('a target that serves the demo API has the API served, and no pages', async () => {
  const serves = { servesDemoApi: true, servesDemoSite: false }

  assert.deepEqual(await statusDuringRun(serves, '/openapi.json'), {
    status: 200,
    logged: ['the demo API is running at <address>', 'the demo API has shut down']
  })
  assert.equal((await statusDuringRun(serves, '/books')).status, 404)
})

void test('a target that names no demo server has none started', async () => {
  const serves = { servesDemoApi: false, servesDemoSite: false }

  assert.deepEqual(await statusDuringRun(serves, '/'), { status: 0, logged: [] })
})
