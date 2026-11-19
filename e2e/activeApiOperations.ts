import { readFileSync } from 'node:fs'
import { z } from 'zod'
import { type ApiOperation, ApiOperationSchema } from './ApiOperation.ts'
import { API_OPERATIONS_FILE_VARIABLE } from './constants.ts'
import { E2eConfigurationError } from './errors/E2eConfigurationError.ts'

const ApiOperationsSchema = z.array(ApiOperationSchema)

// The API operations the runner (e2e/planApiRun.ts) planned for this run, read from the file it
// names. A run started without a runner names none, so the API specs write no tests.
export const activeApiOperations = (
  env: Readonly<Record<string, string | undefined>> = process.env
): readonly ApiOperation[] => {
  const file = env[API_OPERATIONS_FILE_VARIABLE] ?? ''
  const hasOperationsFile = file !== ''
  if (!hasOperationsFile) return []

  let content: unknown
  try {
    content = JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    throw new E2eConfigurationError(
      `${API_OPERATIONS_FILE_VARIABLE} names "${file}", which is not a readable JSON file.`
    )
  }
  const parsed = ApiOperationsSchema.safeParse(content)
  if (!parsed.success) {
    throw new E2eConfigurationError(
      `The file ${API_OPERATIONS_FILE_VARIABLE} names must hold a JSON array of the operations the API runner plans.`
    )
  }
  return parsed.data
}
