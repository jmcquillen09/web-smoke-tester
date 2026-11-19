import path from 'node:path'
import { TARGETS_FILE_NAME, TARGETS_FILE_VARIABLE } from './constants.ts'

// This repo's targets.json, found from this file rather than the working directory: an IDE can load
// the Playwright config from a parent workspace folder, where a bare `targets.json` does not exist.
const REPO_TARGETS_FILE = path.join(import.meta.dirname, '..', TARGETS_FILE_NAME)

// The targets file a run reads: E2E_TARGETS_FILE when set, otherwise the repo's own.
export const targetsFilePath = (env: Readonly<Record<string, string | undefined>>): string => {
  const override = env[TARGETS_FILE_VARIABLE] ?? ''
  const hasOverride = override !== ''
  return hasOverride ? path.resolve(override) : REPO_TARGETS_FILE
}
