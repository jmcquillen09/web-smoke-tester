import path from 'node:path'

import { TARGETS_FILE_VARIABLE } from '../../e2e/constants.ts'
import { runNodeScript } from './runNodeScript.ts'

const SCRIPTS_FOLDER = path.join(import.meta.dirname, '..', '..', 'scripts')

export const runPlaywrightRunner = (
  runnerFile: 'runApiPlaywright.ts' | 'runE2ePlaywright.ts' | 'runWebPlaywright.ts',
  targetsFile: string,
  args: readonly string[],
  env: Readonly<Record<string, string>> = {}
): Promise<{ readonly code: number; readonly output: string }> =>
  runNodeScript([path.join(SCRIPTS_FOLDER, runnerFile), ...args], {
    ...env,
    [TARGETS_FILE_VARIABLE]: targetsFile
  })
