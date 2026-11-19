import { BROWSER_VARIABLE } from './constants.ts'
import { E2eBrowser } from './E2eBrowser.ts'
import { resolveE2eBrowsers } from './resolveE2eBrowsers.ts'

// E2E_BROWSER (default chrome), set by scripts/runE2ePlaywright.ts from `--browser`.
export const activeE2eBrowsers = (): readonly E2eBrowser[] =>
  resolveE2eBrowsers(process.env[BROWSER_VARIABLE] ?? E2eBrowser.CHROME)
