import { ApiCheck } from '../ApiCheck.ts'
import type { ApiAnswer } from '../fixtures/ApiAnswer.ts'
import type { ApiCheckResult } from '../fixtures/ApiCheckResult.ts'
import { validateApiBody } from '../fixtures/validateApiBody.ts'
import { ApiOperationStage } from './ApiOperationStage.ts'

// The API answered with a JSON body the schema its OpenAPI document declares allows. An answer
// there is no schema to hold against is skipped with the reason, not passed.
export class CheckApiBodyStage extends ApiOperationStage {
  public readonly title = 'Check the API answer’s body'
  public readonly check = ApiCheck.BODY

  protected override judge(answer: ApiAnswer): ApiCheckResult {
    return validateApiBody(answer)
  }
}
