#!/usr/bin/env node
// `npm run test:web-playwright [target] [--browser=<b>[,<b>...]] [args...]`: runs only the web
// tests of `playwright test`, on the pages found on the target's site.

import { API_OPERATIONS_VARIABLE, BROWSER_VARIABLE, SITE_PAGES_VARIABLE } from '../e2e/constants.ts'
import { planWebRun } from '../e2e/planWebRun.ts'
import { readE2eTargets } from '../e2e/readE2eTargets.ts'
import { resolveE2eBrowsers } from '../e2e/resolveE2eBrowsers.ts'
import { runPlaywrightForTarget } from '../e2e/runPlaywrightForTarget.ts'
import { takeBrowserArgument } from '../e2e/takeBrowserArgument.ts'
import { takeE2eTarget } from '../e2e/takeE2eTarget.ts'
import { targetsFilePath } from '../e2e/targetsFilePath.ts'
import { stopOnConfigurationError } from '../support/stopOnConfigurationError.ts'

const COMMAND = 'test:web-playwright'

const { choice: browser, rest: args } = takeBrowserArgument(process.argv.slice(2))
// Checked here so a bad choice stops the run before the crawl; playwright.config.ts resolves the
// same E2E_BROWSER and E2E_TARGET values again through the same functions.
stopOnConfigurationError(COMMAND, () => resolveE2eBrowsers(browser))

const { settings, rest: playwrightArgs } = stopOnConfigurationError(COMMAND, () =>
  takeE2eTarget(args, readE2eTargets(targetsFilePath(process.env)))
)

await runPlaywrightForTarget(COMMAND, settings, playwrightArgs, async (siteRequest, log) => ({
  env: {
    [BROWSER_VARIABLE]: browser,
    [SITE_PAGES_VARIABLE]: JSON.stringify(await planWebRun(settings, siteRequest, log)),
    // Empty, so the api project writes no tests whatever the caller's environment holds.
    [API_OPERATIONS_VARIABLE]: ''
  },
  args: []
}))
