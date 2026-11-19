import { existsSync, readFileSync } from 'node:fs'
import { type E2eTargetsFile, E2eTargetsFileSchema } from './E2eTargetsFile.ts'
import { E2eConfigurationError } from './errors/E2eConfigurationError.ts'

const describeIssues = (issues: readonly { path: PropertyKey[]; message: string }[]): string =>
  issues
    .map((issue) => `${issue.path.map(String).join('.') || '(file)'}: ${issue.message}`)
    .join('; ')

// Reads and validates a targets file. A missing, unparseable or misshapen file stops the run with
// the file's path and what is wrong with it.
export const readE2eTargets = (file: string): E2eTargetsFile => {
  const hasFile = existsSync(file)
  if (!hasFile) {
    throw new E2eConfigurationError(
      `No targets file at ${file}. Create it with a "defaultTarget" and a "targets" entry per site.`
    )
  }
  let content: unknown
  try {
    content = JSON.parse(readFileSync(file, 'utf8'))
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new E2eConfigurationError(`The targets file ${file} is not valid JSON: ${reason}`)
  }
  const parsed = E2eTargetsFileSchema.safeParse(content)
  if (!parsed.success) {
    throw new E2eConfigurationError(
      `The targets file ${file} is not valid. ${describeIssues(parsed.error.issues)}`
    )
  }
  return parsed.data
}
