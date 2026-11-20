import type { PlaywrightTestConfig } from '@playwright/test'
import { DEMO_OPENAPI_PATH } from '../demo/constants.ts'
import { demoSite } from '../demo/demoSite.ts'
import type { E2eTargetSettings } from './E2eTargetSettings.ts'

// Has Playwright serve the demo site for a target that names it when nothing answers at its address
// yet: a run started without a runner (an IDE's Playwright extension). A runner's own server is reused.
export const createDemoWebServers = (
  target: Pick<E2eTargetSettings, 'baseUrl' | 'servesDemoSite'>
): NonNullable<PlaywrightTestConfig['webServer']> =>
  target.servesDemoSite
    ? [
        {
          command: `"${process.execPath}" ${demoSite.script} ${target.baseUrl}`,
          url: new URL(DEMO_OPENAPI_PATH, target.baseUrl).href,
          reuseExistingServer: true
        }
      ]
    : []
