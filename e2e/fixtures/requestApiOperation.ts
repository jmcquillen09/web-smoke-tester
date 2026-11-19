import type { APIRequestContext } from '@playwright/test'
import type { ApiOperation } from '../ApiOperation.ts'
import { URL_CHECK_TIMEOUT_MS } from '../constants.ts'
import { E2eFixtureError } from '../errors/E2eFixtureError.ts'
import type { ApiAnswer } from './ApiAnswer.ts'

// Requests one planned operation and returns its answer: the state every API check starts from. An
// error status is an answer for the checks to judge; an operation that never answers is a setup
// failure.
export const requestApiOperation = async (
  request: APIRequestContext,
  operation: ApiOperation
): Promise<ApiAnswer> => {
  try {
    const response = await request.get(operation.url, {
      failOnStatusCode: false,
      timeout: URL_CHECK_TIMEOUT_MS
    })
    const [mediaType = ''] = (response.headers()['content-type'] ?? '').split(';')
    const status = response.status()
    await response.dispose()
    return { operation, status, contentType: mediaType.trim().toLowerCase() }
  } catch (error) {
    const reason = error instanceof Error ? (error.message.split('\n')[0] ?? '') : String(error)
    throw new E2eFixtureError(`GET ${operation.url} did not answer: ${reason}`)
  }
}
