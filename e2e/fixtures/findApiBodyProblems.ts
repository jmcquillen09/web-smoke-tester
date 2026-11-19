import type { ApiAnswer } from './ApiAnswer.ts'
import { validateApiBody } from './validateApiBody.ts'

// What the document's schema does not allow in an answer's body, one line each. An answer with no
// schema to hold against has no finding here: the body check skips it.
export const findApiBodyProblems = (answer: ApiAnswer): string[] => {
  const validation = validateApiBody(answer)
  const isValidated = validation.kind === 'validated'
  return isValidated ? [...validation.problems] : []
}
