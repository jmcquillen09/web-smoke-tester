#!/usr/bin/env node
// `npm run test:web-playwright [target] [--browser=<b>[,<b>...]] [args...]`: runs only the web
// tests of `playwright test`, on the pages found on the target's site.

import { API_OPERATIONS_VARIABLE, BROWSER_VARIABLE, SITE_PAGES_VARIABLE } from '../e2e/constants.ts'
import { planWebRun } from '../e2e/planWebRun.ts'
import { runPlaywrightForTarget } from '../e2e/runPlaywrightForTarget.ts'
import { takeRunArguments } from '../e2e/takeRunArguments.ts'

const COMMAND = 'test:web-playwright'

const { browser, settings, playwrightArgs } = takeRunArguments(
  COMMAND,
  process.argv.slice(2),
  process.env
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
