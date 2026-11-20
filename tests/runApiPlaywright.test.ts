import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import test from 'node:test'

import { demoApi } from '../demo/demoApi.ts'
import { startDemoServer } from '../demo/startDemoServer.ts'
import { stopDemoServer } from '../demo/stopDemoServer.ts'
import { withSiteServing } from './fixtures/withSiteServing.ts'
import { listTestsArguments } from './fixtures/listTestsArguments.ts'
import { runPlaywrightRunner } from './fixtures/runPlaywrightRunner.ts'
import { writeTargetsFile } from './fixtures/writeTargetsFile.ts'
import { findFreePort } from './fixtures/findFreePort.ts'

const HOST = '127.0.0.1'

// Runs the API runner against `targetsFile` and resolves with its exit code and everything it printed.
const runApiRunner = (
  targetsFile: string,
  args: readonly string[] = []
): Promise<{ code: number; output: string }> =>
  runPlaywrightRunner('runApiPlaywright.ts', targetsFile, ['demo', ...args])

void test('a run that stops before its tests start still shuts the demo API down', async () => {
  const port = await findFreePort()
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
  const port = await findFreePort()
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

  const run = await runApiRunner(targetsFile, listTestsArguments)

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
      listTestsArguments
    )

    assert.equal(run.code, 1)
    assert.match(run.output, /has no GET operation a run can request/)
    assert.doesNotMatch(run.output, /\[api\] › /)
  })
})
