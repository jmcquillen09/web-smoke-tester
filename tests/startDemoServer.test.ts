import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import test from 'node:test'

import { demoSite } from '../demo/demoSite.ts'
import { startDemoServer } from '../demo/startDemoServer.ts'
import { stopDemoServer } from '../demo/stopDemoServer.ts'

const HOST = '127.0.0.1'

void test('a started demo site already answers when the start resolves', async () => {
  const server = await startDemoServer(demoSite, 0, HOST)
  const { port } = server.address() as AddressInfo
  try {
    const response = await fetch(`http://${HOST}:${String(port)}/openapi.json`)

    assert.equal(response.status, 200)
    await response.body?.cancel()
  } finally {
    await stopDemoServer(demoSite, server)
  }
})

void test('a port another server holds is refused with the address and the reason', async () => {
  const first = await startDemoServer(demoSite, 0, HOST)
  const { port } = first.address() as AddressInfo
  try {
    await assert.rejects(
      startDemoServer(demoSite, port, HOST),
      (error: unknown) =>
        error instanceof Error &&
        error.name === 'DemoServerError' &&
        error.message.startsWith(`The demo site could not start on ${HOST}:${String(port)}: `)
    )
  } finally {
    await stopDemoServer(demoSite, first)
  }
})
