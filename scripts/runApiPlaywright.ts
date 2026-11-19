#!/usr/bin/env node
// `npm run test:api-playwright [target] [args...]`: runs the `api` project of `playwright test` on
// the GET operations of the target's OpenAPI document, serving the demo API when the target asks.

import { createRequire } from 'node:module'
import path from 'node:path'
import { startDemoApiServer } from '../demo/startDemoApiServer.ts'
import { stopDemoApiServer } from '../demo/stopDemoApiServer.ts'
import { assertExpectedApiFailuresPlanned } from '../e2e/assertExpectedApiFailuresPlanned.ts'
import { API_OPERATIONS_VARIABLE, API_PROJECT, TARGET_VARIABLE } from '../e2e/constants.ts'
import { discoverOpenApiDocument } from '../e2e/discoverOpenApiDocument.ts'
import { fetchOpenApiDocument } from '../e2e/fetchOpenApiDocument.ts'
import { planApiOperations } from '../e2e/planApiOperations.ts'
import { readE2eTargets } from '../e2e/readE2eTargets.ts'
import { takeE2eTarget } from '../e2e/takeE2eTarget.ts'
import { targetsFilePath } from '../e2e/targetsFilePath.ts'
import { withSiteRequest } from '../e2e/withSiteRequest.ts'
import type { ChildOutcome } from '../support/ChildOutcome.ts'
import { spawnChild } from '../support/spawnChild.ts'
import { stopOnConfigurationError } from '../support/stopOnConfigurationError.ts'

const COMMAND = 'test:api-playwright'

const { settings, rest: playwrightArgs } = stopOnConfigurationError(COMMAND, () =>
  takeE2eTarget(process.argv.slice(2), readE2eTargets(targetsFilePath(process.env)))
)

// Node runs Playwright's CLI module directly; spawning `npx` fails on Windows, where it is a .cmd shim.
const playwrightCli = createRequire(import.meta.url).resolve('@playwright/test/cli')

const repoRoot = path.join(import.meta.dirname, '..')

// Serves the demo API at the target's address and returns what shuts it down again. It resolves
// once the API is listening, and its shutdown resolves once the API has closed completely.
const serveDemoApi = async (): Promise<() => Promise<void>> => {
  const { hostname, port } = new URL(settings.baseUrl)
  const server = await startDemoApiServer(Number(port), hostname)
  console.log(`${COMMAND}: the demo API is running at ${settings.baseUrl}`)
  return async () => {
    await stopDemoApiServer(server)
    console.log(`${COMMAND}: the demo API has shut down`)
  }
}

const runApiTests = async (): Promise<ChildOutcome> => {
  const discovered = await withSiteRequest(settings, (siteRequest) =>
    discoverOpenApiDocument(settings, (url) => fetchOpenApiDocument(siteRequest, url))
  )
  const plan = planApiOperations(discovered.document, discovered.url)
  console.log(
    `${COMMAND}: testing ${String(plan.operations.length)} GET operation(s) from ${discovered.url} (${settings.target})`
  )
  for (const { path: operationPath, reason } of plan.skipped) {
    console.log(`${COMMAND}: skipping GET ${operationPath}: ${reason}`)
  }
  const hasOperations = plan.operations.length > 0
  if (!hasOperations) {
    console.error(`${COMMAND}: the document has no GET operation a run can request.`)
    return { kind: 'exited', code: 1 }
  }
  assertExpectedApiFailuresPlanned(settings, plan.operations)
  return spawnChild(
    process.execPath,
    [playwrightCli, 'test', `--project=${API_PROJECT}`, ...playwrightArgs],
    {
      cwd: repoRoot,
      stdio: 'inherit',
      env: {
        ...process.env,
        [TARGET_VARIABLE]: settings.target,
        [API_OPERATIONS_VARIABLE]: JSON.stringify(plan.operations)
      }
    }
  )
}

try {
  const stopDemoApi = settings.servesDemoApi ? await serveDemoApi() : async (): Promise<void> => {}
  let outcome: ChildOutcome
  try {
    outcome = await runApiTests()
  } finally {
    // The process ends only after this resolves, so nothing is left listening on the port.
    await stopDemoApi()
  }
  if (outcome.kind === 'signalled') process.kill(process.pid, outcome.signal)
  process.exit(outcome.kind === 'exited' ? outcome.code : 1)
} catch (error) {
  console.error(`${COMMAND}: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}
