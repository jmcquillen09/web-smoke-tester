import { HTTP_UNAUTHENTICATED_STATUSES } from '../constants.ts'
import type { ApiAnswer } from './ApiAnswer.ts'

// The answer's status when an operation the document marks as secured did not refuse a request
// that carried no credentials, as one line. An operation that is not secured has no finding here.
export const findApiAuthProblems = (answer: ApiAnswer): string[] => {
  const isRefusal = HTTP_UNAUTHENTICATED_STATUSES.includes(answer.status)
  const isAsDocumented = !answer.operation.secured || isRefusal
  if (isAsDocumented) return []
  return [
    `answered HTTP ${String(answer.status)} to a request without credentials; the document marks the operation as secured, so it should answer ${HTTP_UNAUTHENTICATED_STATUSES.join(' or ')}`
  ]
}
