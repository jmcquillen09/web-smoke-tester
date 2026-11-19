import { activeApiOperations } from '../activeApiOperations.ts'
import { ApiCheck } from '../ApiCheck.ts'
import { EXPECTED_API_FAILURE } from '../constants.ts'
import { test } from '../fixtures/test.ts'
import { isExpectedApiFailure } from '../isExpectedApiFailure.ts'
import { CheckApiStatusStage } from '../stages/CheckApiStatusStage.ts'
import { runIsolated } from '../stages/runIsolated.ts'

for (const operation of activeApiOperations()) {
  test(`GET ${operation.path} answers with a status its document declares`, async ({
    stageRuntime
  }) => {
    test.fail(
      isExpectedApiFailure(stageRuntime.targetSettings, operation, ApiCheck.STATUS),
      EXPECTED_API_FAILURE
    )
    await runIsolated(new CheckApiStatusStage(stageRuntime, operation))
  })
}
