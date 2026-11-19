import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import test from 'node:test'

import { request } from '@playwright/test'
import type { ApiOperation } from '../e2e/ApiOperation.ts'
import { requestApiOperation } from '../e2e/fixtures/requestApiOperation.ts'

const HOST = '127.0.0.1'

const operationAt = (url: string): ApiOperation => ({
  method: 'GET',
  path: '/old',
  url,
  secured: false,
  bodySchemas: [],
  responses: []
})

void test('a redirecting operation is answered by the redirect, and its destination is never requested', async () => {
  const requested: string[] = []
  const server = createServer((incoming, response) => {
    requested.push(incoming.url ?? '')
    response.writeHead(302, { location: '/session/logout' }).end()
  })
  await new Promise<void>((resolve) => server.listen(0, HOST, resolve))
  const origin = `http://${HOST}:${String((server.address() as AddressInfo).port)}`
  const context = await request.newContext()
  try {
    const operation = operationAt(`${origin}/old`)

    const answer = await requestApiOperation(context, operation)

    assert.deepEqual(answer, { operation, status: 302, contentType: '', body: '' })
    assert.deepEqual(requested, ['/old'])
  } finally {
    await context.dispose()
    server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
})

void test('an operation that never answers is a setup failure', async () => {
  const context = await request.newContext()
  try {
    await assert.rejects(requestApiOperation(context, operationAt(`http://${HOST}:1/old`)), {
      name: 'E2eFixtureError'
    })
  } finally {
    await context.dispose()
  }
})
