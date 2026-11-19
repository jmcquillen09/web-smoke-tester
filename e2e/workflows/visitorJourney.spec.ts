import { test } from '../fixtures/test.ts'
import { CheckAccessibilityStage } from '../stages/CheckAccessibilityStage.ts'
import { CheckImagesStage } from '../stages/CheckImagesStage.ts'
import { CheckLinksStage } from '../stages/CheckLinksStage.ts'
import { E2eWorkflowState } from '../stages/E2eWorkflowState.ts'
import { FollowSiteLinkStage } from '../stages/FollowSiteLinkStage.ts'
import { LoadPageStage } from '../stages/LoadPageStage.ts'
import { ReturnToPreviousPageStage } from '../stages/ReturnToPreviousPageStage.ts'
import { runWorkflow } from '../stages/runWorkflow.ts'

test.use({ reportUncaughtPageErrors: true })

test('a visitor lands on the start page, uses it, follows a link and comes back', async ({
  stageRuntime
}) => {
  const [startPath = '/'] = stageRuntime.targetSettings.paths
  await runWorkflow(
    [
      new LoadPageStage(stageRuntime, startPath),
      new CheckLinksStage(stageRuntime, startPath),
      new CheckImagesStage(stageRuntime, startPath),
      new CheckAccessibilityStage(stageRuntime, startPath),
      new FollowSiteLinkStage(stageRuntime),
      new ReturnToPreviousPageStage(stageRuntime)
    ],
    E2eWorkflowState.empty()
  )
})
