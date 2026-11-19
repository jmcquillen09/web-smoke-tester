import { test } from './fixtures/test.ts'
import { sitePages } from './sitePages.ts'
import { CheckImagesStage } from './stages/CheckImagesStage.ts'
import { runIsolated } from './stages/runIsolated.ts'

for (const path of sitePages()) {
  test(`${path} has no broken image`, async ({ stageRuntime }) => {
    await runIsolated(new CheckImagesStage(stageRuntime, path))
  })
}
