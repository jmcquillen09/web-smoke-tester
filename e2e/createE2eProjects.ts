import { devices, type PlaywrightTestProject } from '@playwright/test'
import type { E2eBrowser } from './E2eBrowser.ts'
import type { E2eTargetSettings } from './E2eTargetSettings.ts'

// Each browser's launch settings. Edge runs the installed Microsoft Edge (the `msedge` channel),
// because Playwright's Desktop Edge preset is only Chromium with an Edge user agent. Safari runs
// WebKit, the engine Safari is built on: Playwright cannot drive Safari itself.
const BROWSER_SETTINGS = {
  chrome: devices['Desktop Chrome'],
  firefox: devices['Desktop Firefox'],
  safari: devices['Desktop Safari'],
  edge: { ...devices['Desktop Edge'], channel: 'msedge' }
} satisfies Record<E2eBrowser, PlaywrightTestProject['use']>

// Two projects per browser. workflows-<browser> runs only once every isolated-<browser> test passes,
// so a broken stage fails as its own isolated test instead of as a user story (Playwright reports
// the workflows "did not run"), and one browser's failures never hold back another's workflows.
// A target's own window size replaces the browser preset's, which would otherwise win over the
// config's top-level settings.
export const createE2eProjects = (
  browsers: readonly E2eBrowser[],
  target: Pick<E2eTargetSettings, 'viewport'> = {}
): PlaywrightTestProject[] =>
  browsers.flatMap((browser) => {
    const hasOwnViewport = target.viewport !== undefined
    const use = hasOwnViewport
      ? { ...BROWSER_SETTINGS[browser], viewport: { ...target.viewport } }
      : BROWSER_SETTINGS[browser]
    return [
      { name: `isolated-${browser}`, testIgnore: 'workflows/**', use },
      {
        name: `workflows-${browser}`,
        testMatch: 'workflows/**/*.spec.ts',
        dependencies: [`isolated-${browser}`],
        use
      }
    ]
  })
