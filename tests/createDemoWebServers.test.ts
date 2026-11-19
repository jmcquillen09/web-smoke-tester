import assert from 'node:assert/strict'
import test from 'node:test'

import { createDemoWebServers } from '../e2e/createDemoWebServers.ts'

const BASE_URL = 'http://localhost:4020'

void test('a target that serves the demo site has Playwright serve it where nothing answers yet', () => {
  const servers = createDemoWebServers({
    baseUrl: BASE_URL,
    servesDemoApi: false,
    servesDemoSite: true
  })

  assert.deepEqual(servers, [
    {
      command: `"${process.execPath}" scripts/serveDemoSite.ts ${BASE_URL}`,
      url: `${BASE_URL}/openapi.json`,
      reuseExistingServer: true
    }
  ])
})

void test('a target that serves the demo API has Playwright serve that one', () => {
  const servers = createDemoWebServers({
    baseUrl: BASE_URL,
    servesDemoApi: true,
    servesDemoSite: false
  })

  assert.deepEqual(servers, [
    {
      command: `"${process.execPath}" scripts/serveDemoApi.ts ${BASE_URL}`,
      url: `${BASE_URL}/openapi.json`,
      reuseExistingServer: true
    }
  ])
})

void test('a target that names no demo server has Playwright serve nothing', () => {
  assert.deepEqual(
    createDemoWebServers({ baseUrl: BASE_URL, servesDemoApi: false, servesDemoSite: false }),
    []
  )
})
