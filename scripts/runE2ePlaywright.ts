#!/usr/bin/env node
// `npm run test:e2e-playwright [target] [--browser=<b>[,<b>...]] [args...]`: Playwright rejects a
// bare target name, so it becomes E2E_TARGET, --browser becomes E2E_BROWSER, the pages found on the
// site become E2E_SITE_PAGES, and the rest passes to `playwright test`.

import { createRequire } from 'node:module'
import path from 'node:path'
import { BROWSER_VARIABLE, SITE_PAGES_VARIABLE, TARGET_VARIABLE } from '../e2e/constants.ts'
import { discoverSitePages } from '../e2e/discoverSitePages.ts'
import { fetchPageHtml } from '../e2e/fetchPageHtml.ts'
import { readE2eTargets } from '../e2e/readE2eTargets.ts'
import { resolveE2eBrowsers } from '../e2e/resolveE2eBrowsers.ts'
import { takeBrowserArgument } from '../e2e/takeBrowserArgument.ts'
import { takeE2eTarget } from '../e2e/takeE2eTarget.ts'
import { targetsFilePath } from '../e2e/targetsFilePath.ts'
import { withSiteRequest } from '../e2e/withSiteRequest.ts'
import { spawnChild } from '../support/spawnChild.ts'
import { stopOnConfigurationError } from '../support/stopOnConfigurationError.ts'

const COMMAND = 'test:e2e-playwright'

const { choice: browser, rest: args } = takeBrowserArgument(process.argv.slice(2))
// Checked here so a bad choice stops the run before the crawl; playwright.config.ts resolves the
// same E2E_BROWSER and E2E_TARGET values again through the same functions.
stopOnConfigurationError(COMMAND, () => resolveE2eBrowsers(browser))

const { settings, rest: playwrightArgs } = stopOnConfigurationError(COMMAND, () =>
  takeE2eTarget(args, readE2eTargets(targetsFilePath(process.env)))
)

// Node runs Playwright's CLI module directly; spawning `npx` fails on Windows, where it is a .cmd shim.
const playwrightCli = createRequire(import.meta.url).resolve('@playwright/test/cli')

const repoRoot = path.join(import.meta.dirname, '..')

try {
  const pages = await withSiteRequest(settings, (siteRequest) =>
    discoverSitePages(settings, (url) => fetchPageHtml(siteRequest, url))
  )
  console.log(
    `${COMMAND}: testing ${String(pages.length)} page(s) on ${settings.baseUrl} (${settings.target}): ${pages.join(', ')}`
  )
  const outcome = await spawnChild(process.execPath, [playwrightCli, 'test', ...playwrightArgs], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      [TARGET_VARIABLE]: settings.target,
      [BROWSER_VARIABLE]: browser,
      [SITE_PAGES_VARIABLE]: JSON.stringify(pages)
    }
  })
  if (outcome.kind === 'signalled') process.kill(process.pid, outcome.signal)
  process.exit(outcome.kind === 'exited' ? outcome.code : 1)
} catch (error) {
  console.error(`${COMMAND}: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}
