#!/usr/bin/env node
// `npm run test:e2e-playwright [target] [--browser=<b>[,<b>...]] [args...]`: runs the web tests and
// the API tests in one `playwright test`. A site with no OpenAPI document gets the web tests alone.

import type { ApiOperation } from '../e2e/ApiOperation.ts'
import { API_OPERATIONS_VARIABLE, BROWSER_VARIABLE, SITE_PAGES_VARIABLE } from '../e2e/constants.ts'
import { E2eApiDocumentError } from '../e2e/errors/E2eApiDocumentError.ts'
import { planApiRun } from '../e2e/planApiRun.ts'
import { planWebRun } from '../e2e/planWebRun.ts'
import { runPlaywrightForTarget } from '../e2e/runPlaywrightForTarget.ts'
import { takeRunArguments } from '../e2e/takeRunArguments.ts'

const COMMAND = 'test:e2e-playwright'
const NO_OPERATIONS: readonly ApiOperation[] = []

const { browser, settings, playwrightArgs } = takeRunArguments(
  COMMAND,
  process.argv.slice(2),
  process.env
)

await runPlaywrightForTarget(COMMAND, settings, playwrightArgs, async (siteRequest, log) => {
  const pages = await planWebRun(settings, siteRequest, log)
  const operations = await planApiRun(settings, siteRequest, log).catch((error: unknown) => {
    const isApiDocumentError = error instanceof E2eApiDocumentError
    if (!isApiDocumentError) throw error
    // The site has no API a run can test; that is said, and its pages are tested all the same.
    console.error(`${COMMAND}: ${error.message}`)
    log('running the web tests only')
    return NO_OPERATIONS
  })
  return {
    env: {
      [BROWSER_VARIABLE]: browser,
      [SITE_PAGES_VARIABLE]: JSON.stringify(pages),
      [API_OPERATIONS_VARIABLE]: JSON.stringify(operations)
    },
    args: []
  }
})
