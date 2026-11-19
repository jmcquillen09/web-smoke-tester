import { expect } from '@playwright/test'
import { findApiStatusProblems } from '../fixtures/findApiStatusProblems.ts'
import { ApiOperationStage } from './ApiOperationStage.ts'
import type { E2eWorkflowState } from './E2eWorkflowState.ts'

// The API answered with a status its OpenAPI document declares, and not with a server error.
export class CheckApiStatusStage extends ApiOperationStage {
  public readonly title = 'Check the API answer’s status'

  public override async execute(state: E2eWorkflowState): Promise<E2eWorkflowState> {
    const answer = state.requireApiAnswer()

    const problems = findApiStatusProblems(answer)

    expect(problems, `Status problems on GET ${answer.operation.url}`).toEqual([])
    return state
  }
}
