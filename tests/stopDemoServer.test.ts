import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import test from 'node:test'

import { demoApi } from '../demo/demoApi.ts'
import { startDemoServer } from '../demo/startDemoServer.ts'
import { stopDemoServer } from '../demo/stopDemoServer.ts'

const HOST = '127.0.0.1'

void test('a stopped demo API no longer listens or answers once the stop resolves', async () => {
  const server = await startDemoServer(demoApi, 0, HOST)
  const { port } = server.address() as AddressInfo
  const address = `http://${HOST}:${String(port)}/api/books`
  // Leaves a keep-alive connection open, which a stop must close rather than wait out.
  await (await fetch(address)).text()

  await stopDemoServer(demoApi, server)

  assert.equal(server.listening, false)
  await assert.rejects(fetch(address))
})

void test('the port is free for another demo API as soon as the stop resolves', async () => {
  const first = await startDemoServer(demoApi, 0, HOST)
  const { port } = first.address() as AddressInfo

  await stopDemoServer(demoApi, first)
  const second = await startDemoServer(demoApi, port, HOST)

  assert.equal(second.listening, true)
  await stopDemoServer(demoApi, second)
})

void test('stopping a demo API that is not running is reported, not ignored', async () => {
  const server = await startDemoServer(demoApi, 0, HOST)
  await stopDemoServer(demoApi, server)

  await assert.rejects(stopDemoServer(demoApi, server), { name: 'DemoServerError' })
})
