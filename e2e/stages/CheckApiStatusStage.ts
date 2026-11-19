import { ApiCheck } from '../ApiCheck.ts'
import type { ApiAnswer } from '../fixtures/ApiAnswer.ts'
import { findApiStatusProblems } from '../fixtures/findApiStatusProblems.ts'
import { ApiOperationStage } from './ApiOperationStage.ts'

// The API answered with a status its OpenAPI document declares, and not with a server error.
export class CheckApiStatusStage extends ApiOperationStage {
  public readonly title = 'Check the API answer’s status'
  public readonly check = ApiCheck.STATUS

  protected override findProblems(answer: ApiAnswer): string[] {
    return findApiStatusProblems(answer)
  }
}
