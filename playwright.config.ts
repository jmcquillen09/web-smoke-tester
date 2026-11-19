import { defineConfig } from '@playwright/test'
import { activeE2eBrowsers } from './e2e/activeE2eBrowsers.ts'
import { activeE2eTarget } from './e2e/activeE2eTarget.ts'
import { JSON_REPORT_PATH } from './e2e/constants.ts'
import { createApiProject } from './e2e/createApiProject.ts'
import { createDemoWebServers } from './e2e/createDemoWebServers.ts'
import { createE2eProjects } from './e2e/createE2eProjects.ts'
import { createRunMetadata } from './e2e/createRunMetadata.ts'

// Run through `npm run test:e2e-playwright [target]` or its web-only and API-only siblings, which
// set the E2E_* variables read here (e2e/runPlaywrightForTarget.ts).
const target = activeE2eTarget()
const browsers = activeE2eBrowsers()
const isCi = process.env['CI'] !== undefined

export default defineConfig({
  // A page on a cold server or a slow connection routinely outlasts Playwright's 5s default before
  // it renders anything.
  expect: { timeout: 15_000 },
  forbidOnly: isCi,
  // Checks once that the site answers at all; see e2e/globalSetup.ts.
  globalSetup: './e2e/globalSetup.ts',
  fullyParallel: true,
  // Shown in the HTML report and written to the JSON one, so a report says what it tested.
  metadata: createRunMetadata(target, browsers, process.env),
  // The api project has tests only in a run that hands over the operations of an OpenAPI document.
  projects: [...createE2eProjects(browsers, target), createApiProject()],
  // The JSON report tells failed assertions apart from a run that never got going. A run picks its
  // own folders with Playwright's own switches: `--output` for traces and screenshots,
  // PLAYWRIGHT_HTML_OUTPUT_DIR and PLAYWRIGHT_JSON_OUTPUT_FILE for the two reports.
  reporter: [['list'], ['html', { open: 'never' }], ['json', { outputFile: JSON_REPORT_PATH }]],
  retries: isCi ? 1 : 0,
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  // Serves the target's demo server for a run no runner started; see e2e/createDemoWebServers.ts.
  webServer: createDemoWebServers(target),
  // A link or image check requests every address on a page, each with its own 20s limit, which does
  // not fit Playwright's 30s default per test.
  timeout: 90_000,
  use: {
    baseURL: target.baseUrl,
    ignoreHTTPSErrors: target.ignoreHttpsErrors,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  // The site under test is someone's server, and a local run shares the machine with the browsers;
  // Playwright's default of half the cores can flood both. CI keeps that default.
  workers: isCi ? '50%' : 4
})
