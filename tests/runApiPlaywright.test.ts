import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import type { AddressInfo } from 'node:net'
import path from 'node:path'
import test from 'node:test'

import { demoApi } from '../demo/demoApi.ts'
import { startDemoServer } from '../demo/startDemoServer.ts'
import { stopDemoServer } from '../demo/stopDemoServer.ts'
import { TARGETS_FILE_VARIABLE } from '../e2e/constants.ts'
import { withSiteServing } from './fixtures/withSiteServing.ts'
import { writeTargetsFile } from './fixtures/writeTargetsFile.ts'

const HOST = '127.0.0.1'
const RUNNER = path.join(import.meta.dirname, '..', 'scripts', 'runApiPlaywright.ts')

// A port nothing listens on: one the system just handed out and took back.
const freePort = async (): Promise<number> => {
  const server = await startDemoServer(demoApi, 0, HOST)
  const { port } = server.address() as AddressInfo
  await stopDemoServer(demoApi, server)
  return port
}

// Runs the API runner against `targetsFile` and resolves with its exit code and everything it printed.
const runApiRunner = (
  targetsFile: string,
  args: readonly string[] = []
): Promise<{ code: number; output: string }> =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [RUNNER, 'demo', ...args], {
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

void test('a run that stops before its tests start still shuts the demo API down', async () => {
  const port = await freePort()
  const targetsFile = writeTargetsFile(
    JSON.stringify({
      defaultTarget: 'demo',
      targets: {
        demo: {
          baseUrl: `http://${HOST}:${String(port)}`,
          servesDemoApi: true,
          apiSpecPath: '/no-such-document.json'
        }
      }
    })
  )

  const run = await runApiRunner(targetsFile)

  assert.equal(run.code, 1)
  assert.match(run.output, /the demo API is running at/)
  assert.match(run.output, /The demo target has no OpenAPI 3 JSON document at/)
  assert.match(run.output, /the demo API has shut down/)
  const next = await startDemoServer(demoApi, port, HOST)
  await stopDemoServer(demoApi, next)
})

void test('an expected failure the run does not request is reported and ignored, and the tests still run', async () => {
  const port = await freePort()
  const targetsFile = writeTargetsFile(
    JSON.stringify({
      defaultTarget: 'demo',
      targets: {
        demo: {
          baseUrl: `http://${HOST}:${String(port)}`,
          servesDemoApi: true,
          expectedApiFailures: [{ path: '/no-such-operation', check: 'status' }]
        }
      }
    })
  )

  const run = await runApiRunner(targetsFile, ['--list'])

  assert.equal(run.code, 0, run.output)
  assert.match(
    run.output,
    /ignoring the expected failure on GET \/no-such-operation: the demo target names it in expectedApiFailures, but this run does not request it/
  )
  assert.match(run.output, /\[api\] › /)
})

void test('a run whose port is taken stops with the reason and leaves the port’s holder running', async () => {
  const holder = await startDemoServer(demoApi, 0, HOST)
  const { port } = holder.address() as AddressInfo
  const targetsFile = writeTargetsFile(
    JSON.stringify({
      defaultTarget: 'demo',
      targets: { demo: { baseUrl: `http://${HOST}:${String(port)}`, servesDemoApi: true } }
    })
  )
  try {
    const run = await runApiRunner(targetsFile)

    assert.equal(run.code, 1)
    assert.doesNotMatch(run.output, /the demo API is running at/)
    assert.equal(holder.listening, true)
  } finally {
    await stopDemoServer(demoApi, holder)
  }
})

void test('a site whose document has no operation a run can request fails an API run', async () => {
  const document = { openapi: '3.0.3', paths: { '/orders': { post: {} } } }

  await withSiteServing({ '/openapi.json': document }, async (baseUrl) => {
    const run = await runApiRunner(
      writeTargetsFile(JSON.stringify({ defaultTarget: 'demo', targets: { demo: { baseUrl } } })),
      ['--list']
    )

    assert.equal(run.code, 1)
    assert.match(run.output, /has no GET operation a run can request/)
    assert.doesNotMatch(run.output, /\[api\] › /)
  })
})
