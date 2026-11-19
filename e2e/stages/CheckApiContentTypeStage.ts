import { ApiCheck } from '../ApiCheck.ts'
import type { ApiAnswer } from '../fixtures/ApiAnswer.ts'
import { findApiContentTypeProblems } from '../fixtures/findApiContentTypeProblems.ts'
import { ApiOperationStage } from './ApiOperationStage.ts'

// The API answered with a content type its OpenAPI document declares for the answered status.
export class CheckApiContentTypeStage extends ApiOperationStage {
  public readonly title = 'Check the API answer’s content type'
  public readonly check = ApiCheck.CONTENT_TYPE

  protected override findProblems(answer: ApiAnswer): string[] {
    return findApiContentTypeProblems(answer)
  }
}
