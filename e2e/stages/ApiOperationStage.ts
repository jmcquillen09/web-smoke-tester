import { expect, test } from '@playwright/test'
import type { ApiCheck } from '../ApiCheck.ts'
import type { ApiOperation } from '../ApiOperation.ts'
import { EXPECTED_API_FAILURE } from '../constants.ts'
import type { ApiAnswer } from '../fixtures/ApiAnswer.ts'
import { requestApiOperation } from '../fixtures/requestApiOperation.ts'
import { isExpectedApiFailure } from '../isExpectedApiFailure.ts'
import type { ApiStageRuntime } from './ApiStageRuntime.ts'
import { E2eStage } from './E2eStage.ts'
import { E2eWorkflowState } from './E2eWorkflowState.ts'

// A stage that checks one answer of the site's API. Run alone, it requests `operation` first; in a
// workflow it checks the answer the stage before it left in the state.
export abstract class ApiOperationStage extends E2eStage<ApiStageRuntime> {
  /** The operation an isolated run requests. */
  protected readonly operation: ApiOperation

  constructor(runtime: ApiStageRuntime, operation: ApiOperation) {
    super(runtime)
    this.operation = operation
  }

  /** The check this stage makes, as a target's `expectedApiFailures` names it. */
  public abstract readonly check: ApiCheck
  /** What the check finds wrong with the answer, one line each; empty when nothing is. */
  protected abstract findProblems(answer: ApiAnswer): string[]

  public override async setup(): Promise<E2eWorkflowState> {
    return E2eWorkflowState.empty().withApiAnswer(
      await requestApiOperation(this.runtime.request, this.operation)
    )
  }

  public override async execute(state: E2eWorkflowState): Promise<E2eWorkflowState> {
    const answer = state.requireApiAnswer()
    // Marked once there is an answer to judge, so an operation that never answers still fails.
    test.fail(
      isExpectedApiFailure(this.runtime.targetSettings, answer.operation, this.check),
      EXPECTED_API_FAILURE
    )

    const problems = this.findProblems(answer)

    expect(problems, `${this.title}: GET ${answer.operation.url}`).toEqual([])
    return state
  }
}
