import { test } from './fixtures/test.ts'
import { sitePages } from './sitePages.ts'
import { CheckSeoStage } from './stages/CheckSeoStage.ts'
import { runIsolated } from './stages/runIsolated.ts'

for (const path of sitePages()) {
  test(`${path} has a title and a meta description`, async ({ stageRuntime }) => {
    await runIsolated(new CheckSeoStage(stageRuntime, path))
  })
}
