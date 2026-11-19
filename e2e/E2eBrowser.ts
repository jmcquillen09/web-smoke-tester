// The browsers the Playwright suite can run in. Selected by
// `npm run test:e2e-playwright -- <target> --browser=<browser>` (default chrome, a comma-separated
// list, or `all`) and carried to playwright.config.ts as E2E_BROWSER.
export type E2eBrowser = 'chrome' | 'firefox' | 'safari' | 'edge'

export const E2eBrowser = {
  CHROME: 'chrome',
  FIREFOX: 'firefox',
  SAFARI: 'safari',
  EDGE: 'edge'
} satisfies Record<string, E2eBrowser>

export const E2eBrowserValues: readonly E2eBrowser[] = Object.values(E2eBrowser)
