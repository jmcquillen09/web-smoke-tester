import assert from 'node:assert/strict'
import test from 'node:test'

import { withSiteServing } from './fixtures/withSiteServing.ts'
import { listTestsArguments } from './fixtures/listTestsArguments.ts'
import { runPlaywrightRunner } from './fixtures/runPlaywrightRunner.ts'
import { writeTargetsFile } from './fixtures/writeTargetsFile.ts'
import { findFreePort } from './fixtures/findFreePort.ts'

const HOST = '127.0.0.1'
const WEB_TEST = /\[isolated-chrome\] › /
const API_TEST = /\[api\] › /

const targetsFileWith = (target: object): string =>
  writeTargetsFile(JSON.stringify({ defaultTarget: 'site', targets: { site: target } }))

// Runs the combined runner with `--list`, which has Playwright name the tests without opening a
// browser, and resolves with its exit code and everything it printed.
const listTests = (targetsFile: string): Promise<{ code: number; output: string }> =>
  runPlaywrightRunner('runE2ePlaywright.ts', targetsFile, ['site', ...listTestsArguments])

void test('a run against a site with an OpenAPI document holds its web tests and its API tests', async () => {
  const port = await findFreePort()

  const run = await listTests(
    targetsFileWith({ baseUrl: `http://${HOST}:${String(port)}`, servesDemoSite: true })
  )

  assert.equal(run.code, 0, run.output)
  assert.match(run.output, /testing 3 page\(s\)/)
  assert.match(run.output, /testing \d+ GET operation\(s\)/)
  assert.match(
    run.output,
    /requesting GET \/books\/\{bookId\}\/reviews\/\{reviewId\} with reviewId "7"/
  )
  assert.match(run.output, WEB_TEST)
  assert.match(run.output, API_TEST)
  assert.match(run.output, /the demo site has shut down/)
})

void test('a site with no OpenAPI document is told so and still gets its web tests', async () => {
  await withSiteServing({}, async (baseUrl) => {
    const run = await listTests(targetsFileWith({ baseUrl, apiSpecPath: '/openapi.yaml' }))

    assert.equal(run.code, 0, run.output)
    assert.match(
      run.output,
      /The site target has no OpenAPI or Swagger document at: http:\/\/127\.0\.0\.1:\d+\/openapi\.yaml\./
    )
    assert.match(run.output, /running the web tests only/)
    assert.match(run.output, WEB_TEST)
    assert.doesNotMatch(run.output, API_TEST)
  })
})

void test('a site whose document has no operation a run can request still gets its web tests', async () => {
  const document = { openapi: '3.0.3', paths: { '/orders': { post: {} } } }

  await withSiteServing({ '/openapi.json': document }, async (baseUrl) => {
    const run = await listTests(targetsFileWith({ baseUrl }))

    assert.equal(run.code, 0, run.output)
    assert.match(run.output, /has no GET operation a run can request/)
    assert.match(run.output, /running the web tests only/)
    assert.match(run.output, WEB_TEST)
    assert.doesNotMatch(run.output, API_TEST)
  })
})

void test('an expected API failure the run does not request is reported and ignored, and every test still runs', async () => {
  const port = await findFreePort()

  const run = await listTests(
    targetsFileWith({
      baseUrl: `http://${HOST}:${String(port)}`,
      servesDemoSite: true,
      expectedApiFailures: [{ path: '/no-such-operation', check: 'status' }]
    })
  )

  assert.equal(run.code, 0, run.output)
  assert.match(
    run.output,
    /ignoring the expected failure on GET \/no-such-operation: the site target names it in expectedApiFailures, but this run does not request it/
  )
  assert.match(run.output, WEB_TEST)
  assert.match(run.output, API_TEST)
  assert.match(run.output, /the demo site has shut down/)
})

void test('a site that does not answer stops the run before any test is planned', async () => {
  const port = await findFreePort()

  const run = await listTests(targetsFileWith({ baseUrl: `http://${HOST}:${String(port)}` }))

  assert.equal(run.code, 1)
  assert.match(run.output, /The site target did not answer at/)
  assert.doesNotMatch(run.output, /testing \d+ page/)
})
