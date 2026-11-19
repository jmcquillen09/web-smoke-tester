import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import path from 'node:path'
import test from 'node:test'

import { demoSite } from '../demo/demoSite.ts'
import { startDemoServer } from '../demo/startDemoServer.ts'
import { stopDemoServer } from '../demo/stopDemoServer.ts'
import { TARGETS_FILE_VARIABLE } from '../e2e/constants.ts'
import { writeTargetsFile } from './fixtures/writeTargetsFile.ts'

const HOST = '127.0.0.1'
const RUNNER = path.join(import.meta.dirname, '..', 'scripts', 'runE2ePlaywright.ts')
const WEB_TEST = /\[isolated-chrome\] › /
const API_TEST = /\[api\] › /

const targetsFileWith = (target: object): string =>
  writeTargetsFile(JSON.stringify({ defaultTarget: 'site', targets: { site: target } }))

// Runs the combined runner with `--list`, which has Playwright name the tests without opening a
// browser, and resolves with its exit code and everything it printed.
const listTests = (targetsFile: string): Promise<{ code: number; output: string }> =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [RUNNER, 'site', '--list'], {
      env: { ...process.env, [TARGETS_FILE_VARIABLE]: targetsFile }
    })
    let output = ''
    child.stdout.on('data', (chunk: Buffer) => (output += chunk.toString()))
    child.stderr.on('data', (chunk: Buffer) => (output += chunk.toString()))
    child.on('error', reject)
    child.on('close', (code) => {
      resolve({ code: code ?? 1, output })
    })
  })

void test('a run against a site with an OpenAPI document holds its web tests and its API tests', async () => {
  const free = await startDemoServer(demoSite, 0, HOST)
  const { port } = free.address() as AddressInfo
  await stopDemoServer(demoSite, free)

  const run = await listTests(
    targetsFileWith({ baseUrl: `http://${HOST}:${String(port)}`, servesDemoSite: true })
  )

  assert.equal(run.code, 0, run.output)
  assert.match(run.output, /testing 3 page\(s\)/)
  assert.match(run.output, /testing 7 GET operation\(s\)/)
  assert.match(run.output, WEB_TEST)
  assert.match(run.output, API_TEST)
  assert.match(run.output, /the demo site has shut down/)
})

void test('a site with no OpenAPI document is told so and still gets its web tests', async () => {
  const site = createServer((_request, response) => {
    response
      .writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      .end('<!doctype html><title>A site</title><h1>A site with no API</h1>')
  })
  await new Promise<void>((resolve) => site.listen(0, HOST, resolve))
  const baseUrl = `http://${HOST}:${String((site.address() as AddressInfo).port)}`
  try {
    const run = await listTests(targetsFileWith({ baseUrl, apiSpecPath: '/openapi.yaml' }))

    assert.equal(run.code, 0, run.output)
    assert.match(
      run.output,
      /The site target has no OpenAPI 3 JSON document at: http:\/\/127\.0\.0\.1:\d+\/openapi\.yaml\./
    )
    assert.match(run.output, /running the web tests only/)
    assert.match(run.output, WEB_TEST)
    assert.doesNotMatch(run.output, API_TEST)
  } finally {
    site.closeAllConnections()
    await new Promise<void>((resolve) => site.close(() => resolve()))
  }
})

void test('an expected API failure the run does not request still stops the run', async () => {
  const free = await startDemoServer(demoSite, 0, HOST)
  const { port } = free.address() as AddressInfo
  await stopDemoServer(demoSite, free)

  const run = await listTests(
    targetsFileWith({
      baseUrl: `http://${HOST}:${String(port)}`,
      servesDemoSite: true,
      expectedApiFailures: [{ path: '/no-such-operation', check: 'status' }]
    })
  )

  assert.equal(run.code, 1)
  assert.match(run.output, /expects a failure on GET \/no-such-operation/)
  assert.doesNotMatch(run.output, WEB_TEST)
  assert.match(run.output, /the demo site has shut down/)
})

void test('a site that does not answer stops the run before any test is planned', async () => {
  const free = await startDemoServer(demoSite, 0, HOST)
  const { port } = free.address() as AddressInfo
  await stopDemoServer(demoSite, free)

  const run = await listTests(targetsFileWith({ baseUrl: `http://${HOST}:${String(port)}` }))

  assert.equal(run.code, 1)
  assert.match(run.output, /The site target did not answer at/)
  assert.doesNotMatch(run.output, /testing \d+ page/)
})
