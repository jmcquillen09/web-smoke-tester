import { test } from '@playwright/test'
import type { E2eStage } from './E2eStage.ts'
import type { E2eStepRunner } from './E2eStepRunner.ts'
import type { E2eWorkflowState } from './E2eWorkflowState.ts'

// One stage on its own: setup builds its state, execute runs from it, teardown clears the local
// side effects. Each phase is its own report step. Teardown runs after a failed execute; when it
// fails too, both errors are reported together. A failed setup built no state, so nothing is torn
// down.
export const runIsolated = async (
  stage: E2eStage,
  step: E2eStepRunner = test.step
): Promise<E2eWorkflowState> => {
  const state = await step(`${stage.title}: setup`, () => stage.setup())
  const teardown = (): Promise<void> =>
    step(`${stage.title}: teardown`, () => stage.teardown(state))
  let result: E2eWorkflowState
  try {
    result = await step(`${stage.title}: execute`, () => stage.execute(state))
  } catch (executeError) {
    await teardown().catch((teardownError: unknown) => {
      throw new AggregateError(
        [executeError, teardownError],
        `${stage.title} failed, and its teardown failed too.`
      )
    })
    throw executeError
  }
  await teardown()
  return result
}
