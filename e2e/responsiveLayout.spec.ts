import { RESPONSIVE_VIEWPORTS } from './constants.ts'
import { handheldDeviceOptions } from './fixtures/handheldDeviceOptions.ts'
import { test } from './fixtures/test.ts'
import { sitePages } from './sitePages.ts'
import { CheckResponsiveLayoutStage } from './stages/CheckResponsiveLayoutStage.ts'
import type { ResponsiveViewport } from './stages/ResponsiveViewport.ts'
import { runIsolated } from './stages/runIsolated.ts'

for (const viewport of RESPONSIVE_VIEWPORTS satisfies readonly ResponsiveViewport[]) {
  test.describe(`${viewport.name} (${String(viewport.width)}px)`, () => {
    // The page is first requested and laid out as this screen's device would, so a site that serves
    // phones their own page is judged on that page; the stage holds the size there.
    if ('device' in viewport) {
      const { supportsMobileViewport, ...device } = handheldDeviceOptions(viewport.device, viewport)
      test.use({
        ...device,
        isMobile: async ({ browserName }, use) => {
          await use(supportsMobileViewport(browserName))
        }
      })
    } else {
      test.use({ viewport: { width: viewport.width, height: viewport.height } })
    }

    for (const path of sitePages()) {
      test(`${path} fits the screen without sideways scrolling`, async ({ stageRuntime }) => {
        await runIsolated(new CheckResponsiveLayoutStage(stageRuntime, path, viewport))
      })
    }
  })
}
