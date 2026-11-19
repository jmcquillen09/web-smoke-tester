import { test } from '@playwright/test'
import { ApiCheck } from '../ApiCheck.ts'
import type { ApiBodyValidation } from '../fixtures/ApiBodyValidation.ts'
import { validateApiBody } from '../fixtures/validateApiBody.ts'
import { ApiOperationStage } from './ApiOperationStage.ts'
import type { E2eWorkflowState } from './E2eWorkflowState.ts'

const NOT_YET_VALIDATED: ApiBodyValidation = {
  kind: 'unvalidated',
  reason: 'the answer has not been held against its schema yet'
}

// The API answered with a JSON body the schema its OpenAPI document declares allows. An answer
// there is no schema to hold against is skipped with the reason, not passed.
export class CheckApiBodyStage extends ApiOperationStage {
  public readonly title = 'Check the API answer’s body'
  public readonly check = ApiCheck.BODY
  #validation = NOT_YET_VALIDATED

  public override async execute(state: E2eWorkflowState): Promise<E2eWorkflowState> {
    const validation = validateApiBody(state.requireApiAnswer())
    this.#validation = validation
    const isValidated = validation.kind === 'validated'
    test.skip(!isValidated, isValidated ? '' : validation.reason)
    return super.execute(state)
  }

  protected override findProblems(): string[] {
    const validation = this.#validation
    const isValidated = validation.kind === 'validated'
    return isValidated ? [...validation.problems] : []
  }
}
