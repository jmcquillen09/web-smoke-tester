import type { E2eTargetSettings } from './E2eTargetSettings.ts'
import type { E2eTargetsFile } from './E2eTargetsFile.ts'
import { resolveE2eTarget } from './resolveE2eTarget.ts'

interface TakenE2eTarget {
  readonly settings: E2eTargetSettings
  /** Every argument after the target, in order. */
  readonly rest: readonly string[]
}

// Takes the target out of a runner's arguments: the first one when it is not a flag, otherwise the
// targets file's defaultTarget. The rest goes to `playwright test`, which rejects a bare target name.
export const takeE2eTarget = (args: readonly string[], targets: E2eTargetsFile): TakenE2eTarget => {
  const [first = ''] = args
  const hasTargetArgument = first !== '' && !first.startsWith('-')
  return {
    settings: resolveE2eTarget(hasTargetArgument ? first : targets.defaultTarget, targets),
    rest: hasTargetArgument ? args.slice(1) : args
  }
}
