import { Ajv, type ErrorObject } from 'ajv'
import { Ajv2020 } from 'ajv/dist/2020.js'
import { JSON_SCHEMA_2020_12, MAX_LISTED_FINDINGS } from '../constants.ts'
import type { JsonObject } from '../JsonObject.ts'
import type { ApiAnswer } from './ApiAnswer.ts'
import type { ApiBodyValidation } from './ApiBodyValidation.ts'
import { findDeclaredApiResponse } from './findDeclaredApiResponse.ts'
import { isDeclaredContentType } from './isDeclaredContentType.ts'

const JSON_CONTENT_TYPE = /^application\/(?:.+\+)?json$/
// OpenAPI schemas carry keywords JSON Schema does not know (`example`, `xml`), and name formats
// this check does not judge.
const VALIDATOR_OPTIONS = { strict: false, validateFormats: false, allErrors: true }

const unvalidated = (reason: string): ApiBodyValidation => ({ kind: 'unvalidated', reason })

// The schema the document declares for the answered status and content type; undefined when it
// declares none.
const findBodySchema = (answer: ApiAnswer): JsonObject | undefined => {
  const status = findDeclaredApiResponse(answer.operation, answer.status)?.status ?? ''
  return answer.operation.bodySchemas.find(
    (declared) =>
      declared.status === status && isDeclaredContentType(answer.contentType, declared.contentType)
  )?.schema
}

const describe = (error: ErrorObject): string =>
  `${error.instancePath === '' ? 'the body' : error.instancePath} ${error.message ?? 'is not allowed'}`

// Holds an answer's JSON body against the schema the document declares for the answered status and
// content type. An answer that is not JSON, or has no usable schema declared, is left unvalidated.
export const validateApiBody = (answer: ApiAnswer): ApiBodyValidation => {
  const isJsonAnswer = JSON_CONTENT_TYPE.test(answer.contentType)
  if (!isJsonAnswer) {
    return unvalidated(`the answer is ${answer.contentType || 'of no content type'}, not JSON`)
  }
  const schema = findBodySchema(answer)
  const hasSchema = schema !== undefined
  if (!hasSchema) {
    return unvalidated(
      `the document declares no schema for an HTTP ${String(answer.status)} answer as ${answer.contentType}`
    )
  }

  const isJsonSchema2020 = schema['$schema'] === JSON_SCHEMA_2020_12
  const validator = isJsonSchema2020 ? new Ajv2020(VALIDATOR_OPTIONS) : new Ajv(VALIDATOR_OPTIONS)
  let validate
  try {
    validate = validator.compile(schema)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    return unvalidated(`the document's schema for this answer cannot be used: ${reason}`)
  }

  let body: unknown
  try {
    body = JSON.parse(answer.body)
  } catch {
    return { kind: 'validated', problems: ['the body is not valid JSON'] }
  }
  validate(body)
  const problems = (validate.errors ?? []).map(describe)
  const listed = problems.slice(0, MAX_LISTED_FINDINGS)
  const unlisted = problems.length - listed.length
  return {
    kind: 'validated',
    problems: unlisted > 0 ? [...listed, `…and ${String(unlisted)} more`] : listed
  }
}
