#!/usr/bin/env node
// `npm run test:e2e-playwright [target] [--browser=<b>[,<b>...]] [args...]`: runs the web tests and
// the API tests in one `playwright test`. A site whose API tests cannot be planned gets the web tests alone.

import type { ApiOperation } from '../e2e/ApiOperation.ts'
import { API_OPERATIONS_VARIABLE, BROWSER_VARIABLE, SITE_PAGES_VARIABLE } from '../e2e/constants.ts'
import { E2eApiDocumentError } from '../e2e/errors/E2eApiDocumentError.ts'
import { E2eConfigurationError } from '../e2e/errors/E2eConfigurationError.ts'
import { planApiRun } from '../e2e/planApiRun.ts'
import { planWebRun } from '../e2e/planWebRun.ts'
import { readE2eTargets } from '../e2e/readE2eTargets.ts'
import { resolveE2eBrowsers } from '../e2e/resolveE2eBrowsers.ts'
import { runPlaywrightForTarget } from '../e2e/runPlaywrightForTarget.ts'
import { takeBrowserArgument } from '../e2e/takeBrowserArgument.ts'
import { takeE2eTarget } from '../e2e/takeE2eTarget.ts'
import { targetsFilePath } from '../e2e/targetsFilePath.ts'
import { stopOnConfigurationError } from '../support/stopOnConfigurationError.ts'

const COMMAND = 'test:e2e-playwright'
const NO_OPERATIONS: readonly ApiOperation[] = []

const { choice: browser, rest: args } = takeBrowserArgument(process.argv.slice(2))
// Checked here so a bad choice stops the run before the crawl; playwright.config.ts resolves the
// same E2E_BROWSER and E2E_TARGET values again through the same functions.
stopOnConfigurationError(COMMAND, () => resolveE2eBrowsers(browser))

const { settings, rest: playwrightArgs } = stopOnConfigurationError(COMMAND, () =>
  takeE2eTarget(args, readE2eTargets(targetsFilePath(process.env)))
)

await runPlaywrightForTarget(COMMAND, settings, playwrightArgs, async (siteRequest, log) => {
  const pages = await planWebRun(settings, siteRequest, log)
  const operations = await planApiRun(settings, siteRequest, log).catch((error: unknown) => {
    const isApiPlanRefusal =
      error instanceof E2eApiDocumentError || error instanceof E2eConfigurationError
    if (!isApiPlanRefusal) throw error
    // No document to test, or an expected failure it does not hold: said, and the pages are tested.
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
