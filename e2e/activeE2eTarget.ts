import { TARGET_VARIABLE } from './constants.ts'
import type { E2eTargetSettings } from './E2eTargetSettings.ts'
import { readE2eTargets } from './readE2eTargets.ts'
import { resolveE2eTarget } from './resolveE2eTarget.ts'
import { targetsFilePath } from './targetsFilePath.ts'

// E2E_TARGET, or the targets file's defaultTarget without it. Read here in the config path rather
// than as a CLI flag, so the npm script and the VS Code Playwright extension resolve the same site.
export const activeE2eTarget = (
  targetsFile: string = targetsFilePath(process.env)
): E2eTargetSettings => {
  const targets = readE2eTargets(targetsFile)
  const chosen = process.env[TARGET_VARIABLE] ?? ''
  const hasChosenTarget = chosen !== ''
  return resolveE2eTarget(hasChosenTarget ? chosen : targets.defaultTarget, targets)
}
