import { test } from './fixtures/test.ts'
import { sitePages } from './sitePages.ts'
import { CheckAccessibilityStage } from './stages/CheckAccessibilityStage.ts'
import { runIsolated } from './stages/runIsolated.ts'

for (const path of sitePages()) {
  test(`${path} meets the accessibility basics`, async ({ stageRuntime }) => {
    await runIsolated(new CheckAccessibilityStage(stageRuntime, path))
  })
}
