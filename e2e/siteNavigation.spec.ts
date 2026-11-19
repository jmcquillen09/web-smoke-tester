import { test } from './fixtures/test.ts'
import { FollowSiteLinkStage } from './stages/FollowSiteLinkStage.ts'
import { ReturnToPreviousPageStage } from './stages/ReturnToPreviousPageStage.ts'
import { runIsolated } from './stages/runIsolated.ts'

test('a link from the start page opens another working page of the site', async ({
  stageRuntime
}) => {
  await runIsolated(new FollowSiteLinkStage(stageRuntime))
})

test('Back returns from a followed link to the page it was on', async ({ stageRuntime }) => {
  await runIsolated(new ReturnToPreviousPageStage(stageRuntime))
})
