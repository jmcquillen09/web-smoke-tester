import { test } from '@playwright/test'
import type { ApiStageRuntime } from './ApiStageRuntime.ts'
import type { E2eStage } from './E2eStage.ts'
import type { E2eStepRunner } from './E2eStepRunner.ts'
import type { E2eWorkflowState } from './E2eWorkflowState.ts'

// A user-story path: calls only execute on each stage in order, threading each result into the
// next. Each stage is one report step, and the first failing stage stops the path. Setup and
// teardown belong to isolated runs, so a stage that installs something temporary removes it itself.
export const runWorkflow = async (
  stages: readonly E2eStage<ApiStageRuntime>[],
  state: E2eWorkflowState,
  step: E2eStepRunner = test.step
): Promise<E2eWorkflowState> => {
  let current = state
  for (const stage of stages) {
    current = await step(stage.title, () => stage.execute(current))
  }
  return current
}
