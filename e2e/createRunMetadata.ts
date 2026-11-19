import { E2E_BROWSER_LIST_SEPARATOR, RUN_METADATA_VARIABLES } from './constants.ts'
import type { E2eBrowser } from './E2eBrowser.ts'
import type { E2eTargetSettings } from './E2eTargetSettings.ts'

export type RunMetadata = Readonly<Record<string, string>>

// What the HTML and JSON reports record about a run: always the target, the site it resolved to and
// the browsers covered, plus the run and deployment IDs when they are set. A local run sets
// neither, so its report carries only what it tested.
export const createRunMetadata = (
  target: Pick<E2eTargetSettings, 'target' | 'baseUrl'>,
  browsers: readonly E2eBrowser[],
  env: Readonly<Record<string, string | undefined>>
): RunMetadata => {
  const identity = Object.entries(RUN_METADATA_VARIABLES).flatMap(([key, variable]) => {
    const value = env[variable] ?? ''
    const hasValue = value !== ''
    return hasValue ? [[key, value] as const] : []
  })
  return {
    target: target.target,
    site: target.baseUrl,
    browsers: browsers.join(E2E_BROWSER_LIST_SEPARATOR),
    ...Object.fromEntries(identity)
  }
}
