import { test } from '@playwright/test'
import { ApiCheck } from '../ApiCheck.ts'
import type { ApiAnswer } from '../fixtures/ApiAnswer.ts'
import { findApiBodyProblems } from '../fixtures/findApiBodyProblems.ts'
import { validateApiBody } from '../fixtures/validateApiBody.ts'
import { ApiOperationStage } from './ApiOperationStage.ts'
import type { E2eWorkflowState } from './E2eWorkflowState.ts'

// The API answered with a JSON body the schema its OpenAPI document declares allows. An answer
// there is no schema to hold against is skipped with the reason, not passed.
export class CheckApiBodyStage extends ApiOperationStage {
  public readonly title = 'Check the API answer’s body'
  public readonly check = ApiCheck.BODY

  public override async execute(state: E2eWorkflowState): Promise<E2eWorkflowState> {
    const validation = validateApiBody(state.requireApiAnswer())
    const isValidated = validation.kind === 'validated'
    test.skip(!isValidated, isValidated ? '' : validation.reason)
    return super.execute(state)
  }

  protected override findProblems(answer: ApiAnswer): string[] {
    return findApiBodyProblems(answer)
  }
}
