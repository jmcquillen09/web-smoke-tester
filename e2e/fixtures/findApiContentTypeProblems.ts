import type { ApiAnswer } from './ApiAnswer.ts'
import { findDeclaredApiResponse } from './findDeclaredApiResponse.ts'
import { isDeclaredContentType } from './isDeclaredContentType.ts'

// The answer's content type when it is none the document declares for the answered status, as one
// line. A status the document does not declare is the status check's finding, not this one's.
export const findApiContentTypeProblems = (answer: ApiAnswer): string[] => {
  const declaredTypes = findDeclaredApiResponse(answer.operation, answer.status)?.contentTypes ?? []
  const declaresBody = declaredTypes.length > 0
  if (!declaresBody) return []

  const isDeclared = declaredTypes.some((declared) =>
    isDeclaredContentType(answer.contentType, declared)
  )
  if (isDeclared) return []
  return [
    `answered HTTP ${String(answer.status)} as ${answer.contentType || 'no content type'}; the document declares ${declaredTypes.join(', ')}`
  ]
}
