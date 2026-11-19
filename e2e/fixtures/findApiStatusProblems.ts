import { HTTP_SERVER_ERROR_STATUS, HTTP_UNAUTHENTICATED_STATUSES } from '../constants.ts'
import type { ApiAnswer } from './ApiAnswer.ts'
import { findDeclaredApiResponse } from './findDeclaredApiResponse.ts'

// The answer's status when it is a server error or one the document does not declare, as one line.
// An operation the document marks as secured may also refuse a run, which sends no credentials.
export const findApiStatusProblems = (answer: ApiAnswer): string[] => {
  const isServerError = answer.status >= HTTP_SERVER_ERROR_STATUS
  if (isServerError) return [`answered HTTP ${String(answer.status)}, a server error`]

  const isDeclared = findDeclaredApiResponse(answer.operation, answer.status) !== undefined
  const isCredentialRefusal =
    answer.operation.secured && HTTP_UNAUTHENTICATED_STATUSES.includes(answer.status)
  const isExpected = isDeclared || isCredentialRefusal
  if (isExpected) return []

  const declaredStatuses = answer.operation.responses.map((response) => response.status).join(', ')
  return [
    `answered HTTP ${String(answer.status)}, which the document does not declare (declared: ${declaredStatuses || 'none'})`
  ]
}
