import { activeApiOperations } from '../activeApiOperations.ts'
import { test } from '../fixtures/test.ts'
import { CheckApiStatusStage } from '../stages/CheckApiStatusStage.ts'
import { runIsolated } from '../stages/runIsolated.ts'

for (const operation of activeApiOperations()) {
  test(`GET ${operation.path} answers with a status its document declares`, async ({
    stageRuntime
  }) => {
    await runIsolated(new CheckApiStatusStage(stageRuntime, operation))
  })
}
