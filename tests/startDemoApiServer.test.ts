import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import test from 'node:test'

import { startDemoApiServer } from '../demo/startDemoApiServer.ts'
import { stopDemoApiServer } from '../demo/stopDemoApiServer.ts'

const HOST = '127.0.0.1'

void test('a started demo API already answers when the start resolves', async () => {
  const server = await startDemoApiServer(0, HOST)
  const { port } = server.address() as AddressInfo
  try {
    const response = await fetch(`http://${HOST}:${String(port)}/openapi.json`)

    assert.equal(response.status, 200)
    await response.body?.cancel()
  } finally {
    await stopDemoApiServer(server)
  }
})

void test('a port another server holds is refused with the address and the reason', async () => {
  const first = await startDemoApiServer(0, HOST)
  const { port } = first.address() as AddressInfo
  try {
    await assert.rejects(
      startDemoApiServer(port, HOST),
      (error: unknown) =>
        error instanceof Error &&
        error.name === 'DemoApiError' &&
        error.message.startsWith(`The demo API could not start on ${HOST}:${String(port)}: `)
    )
  } finally {
    await stopDemoApiServer(first)
  }
})
