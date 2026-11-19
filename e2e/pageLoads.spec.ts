import { test } from './fixtures/test.ts'
import { sitePages } from './sitePages.ts'
import { LoadPageStage } from './stages/LoadPageStage.ts'
import { runIsolated } from './stages/runIsolated.ts'

// A page that leaves a script error unhandled fails here, once, with the error attached.
test.use({ reportUncaughtPageErrors: true })

for (const path of sitePages()) {
  test(`${path} loads, renders, throws no error and makes no failed same-site request`, async ({
    stageRuntime
  }) => {
    await runIsolated(new LoadPageStage(stageRuntime, path))
  })
}
