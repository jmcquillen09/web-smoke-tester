import { ApiCheck } from '../ApiCheck.ts'
import type { ApiAnswer } from '../fixtures/ApiAnswer.ts'
import { findApiAuthProblems } from '../fixtures/findApiAuthProblems.ts'
import { ApiOperationStage } from './ApiOperationStage.ts'

// The API refused a request without credentials on an operation its OpenAPI document marks as secured.
export class CheckApiAuthStage extends ApiOperationStage {
  public readonly title = 'Check the API refuses a request without credentials'
  public readonly check = ApiCheck.AUTH

  protected override findProblems(answer: ApiAnswer): string[] {
    return findApiAuthProblems(answer)
  }
}
