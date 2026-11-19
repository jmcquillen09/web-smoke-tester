import type { ApiAnswer } from './ApiAnswer.ts'
import { findDeclaredApiResponse } from './findDeclaredApiResponse.ts'

// Whether an answer's media type is one the document declares: the same type, or a declared range
// (`application/*`, `*/*`) that holds it.
const isDeclaredContentType = (contentType: string, declared: string): boolean => {
  const [declaredMediaType = ''] = declared.toLowerCase().split(';')
  const [declaredType = '', declaredSubtype = ''] = declaredMediaType.trim().split('/')
  const [type = '', subtype = ''] = contentType.split('/')
  const isSameType = declaredType === '*' || declaredType === type
  const isSameSubtype = declaredSubtype === '*' || declaredSubtype === subtype
  return isSameType && isSameSubtype
}

// What is wrong with an answer's content type, one line each, empty when nothing is: the document
// declares body types for the answered status and the answer's is none of them. A status the
// document does not declare is the status check's finding, not this one's.
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
