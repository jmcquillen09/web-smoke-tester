import type { ApiOperation } from '../ApiOperation.ts'
import { requestApiOperation } from '../fixtures/requestApiOperation.ts'
import { E2eStage } from './E2eStage.ts'
import type { E2eStageRuntime } from './E2eStageRuntime.ts'
import { E2eWorkflowState } from './E2eWorkflowState.ts'

// A stage that checks one answer of the site's API. Run alone, it requests `operation` first; in a
// workflow it checks the answer the stage before it left in the state.
export abstract class ApiOperationStage extends E2eStage {
  /** The operation an isolated run requests. */
  protected readonly operation: ApiOperation

  constructor(runtime: E2eStageRuntime, operation: ApiOperation) {
    super(runtime)
    this.operation = operation
  }

  public override async setup(): Promise<E2eWorkflowState> {
    return E2eWorkflowState.empty().withApiAnswer(
      await requestApiOperation(this.runtime.request, this.operation)
    )
  }
}
