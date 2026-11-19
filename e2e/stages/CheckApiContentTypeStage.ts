import { expect } from '@playwright/test'
import { findApiContentTypeProblems } from '../fixtures/findApiContentTypeProblems.ts'
import { ApiOperationStage } from './ApiOperationStage.ts'
import type { E2eWorkflowState } from './E2eWorkflowState.ts'

// The API answered with a content type its OpenAPI document declares for the answered status.
export class CheckApiContentTypeStage extends ApiOperationStage {
  public readonly title = 'Check the API answer’s content type'

  public override async execute(state: E2eWorkflowState): Promise<E2eWorkflowState> {
    const answer = state.requireApiAnswer()

    const problems = findApiContentTypeProblems(answer)

    expect(problems, `Content type problems on GET ${answer.operation.url}`).toEqual([])
    return state
  }
}
