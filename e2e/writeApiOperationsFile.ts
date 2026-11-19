import { writeFileSync } from 'node:fs'
import path from 'node:path'
import type { ApiOperation } from './ApiOperation.ts'

const API_OPERATIONS_FILE_NAME = 'api-operations.json'

// Writes the operations a run tests into `folder`, for Playwright to read, and returns the file's
// path. A file holds them because their schemas outgrow what an environment variable can carry.
export const writeApiOperationsFile = (
  folder: string,
  operations: readonly ApiOperation[]
): string => {
  const file = path.join(folder, API_OPERATIONS_FILE_NAME)
  writeFileSync(file, JSON.stringify(operations))
  return file
}
