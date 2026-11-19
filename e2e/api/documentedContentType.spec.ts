import { activeApiOperations } from '../activeApiOperations.ts'
import { test } from '../fixtures/test.ts'
import { CheckApiContentTypeStage } from '../stages/CheckApiContentTypeStage.ts'
import { runIsolated } from '../stages/runIsolated.ts'

for (const operation of activeApiOperations()) {
  test(`GET ${operation.path} answers with a content type its document declares`, async ({
    stageRuntime
  }) => {
    await runIsolated(new CheckApiContentTypeStage(stageRuntime, operation))
  })
}
