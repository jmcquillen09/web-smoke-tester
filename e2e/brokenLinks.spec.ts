import { test } from './fixtures/test.ts'
import { sitePages } from './sitePages.ts'
import { CheckLinksStage } from './stages/CheckLinksStage.ts'
import { runIsolated } from './stages/runIsolated.ts'

for (const path of sitePages()) {
  test(`${path} has no broken same-site link`, async ({ stageRuntime }) => {
    await runIsolated(new CheckLinksStage(stageRuntime, path))
  })
}
