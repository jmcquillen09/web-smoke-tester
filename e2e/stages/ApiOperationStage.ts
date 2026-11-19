import type { ApiOperation } from '../ApiOperation.ts'
import { requestApiOperation } from '../fixtures/requestApiOperation.ts'
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

  public override async setup(): Promise<E2eWorkflowState> {
    return E2eWorkflowState.empty().withApiAnswer(
      await requestApiOperation(this.runtime.request, this.operation)
    )
  }
}
