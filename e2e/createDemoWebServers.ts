import type { PlaywrightTestConfig } from '@playwright/test'
import { DEMO_OPENAPI_PATH } from '../demo/constants.ts'
import { targetDemoServers } from '../demo/targetDemoServers.ts'
import type { E2eTargetSettings } from './E2eTargetSettings.ts'

// Has Playwright serve the demo server the target names when nothing answers at its address yet: a
// run started without a runner (an IDE's Playwright extension). A runner's own server is reused.
export const createDemoWebServers = (
  target: Pick<E2eTargetSettings, 'baseUrl' | 'servesDemoApi' | 'servesDemoSite'>
): NonNullable<PlaywrightTestConfig['webServer']> =>
  targetDemoServers(target).map((demo) => ({
    command: `"${process.execPath}" ${demo.script} ${target.baseUrl}`,
    url: new URL(DEMO_OPENAPI_PATH, target.baseUrl).href,
    reuseExistingServer: true
  }))
