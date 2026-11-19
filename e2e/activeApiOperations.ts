import { z } from 'zod'
import { type ApiOperation, ApiOperationSchema } from './ApiOperation.ts'
import { API_OPERATIONS_VARIABLE } from './constants.ts'
import { E2eConfigurationError } from './errors/E2eConfigurationError.ts'

const ApiOperationsSchema = z.array(ApiOperationSchema)

// The API operations the runner (e2e/planApiRun.ts) planned for this run. A run started without it
// has none, so the API specs write no tests.
export const activeApiOperations = (
  env: Readonly<Record<string, string | undefined>> = process.env
): readonly ApiOperation[] => {
  const handedOver = env[API_OPERATIONS_VARIABLE] ?? ''
  const hasHandedOverOperations = handedOver !== ''
  if (!hasHandedOverOperations) return []

  let content: unknown
  try {
    content = JSON.parse(handedOver)
  } catch {
    throw new E2eConfigurationError(`${API_OPERATIONS_VARIABLE} is not valid JSON.`)
  }
  const parsed = ApiOperationsSchema.safeParse(content)
  if (!parsed.success) {
    throw new E2eConfigurationError(
      `${API_OPERATIONS_VARIABLE} must be a JSON array of the operations the API runner plans.`
    )
  }
  return parsed.data
}
