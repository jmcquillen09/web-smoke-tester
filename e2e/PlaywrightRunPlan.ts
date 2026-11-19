import type { ApiOperation } from './ApiOperation.ts'

// What a runner found on the target's site for one Playwright run to test.
export interface PlaywrightRunPlan {
  /** The variables that hand the run its browser and pages, on top of the target's name. */
  readonly env: Readonly<Record<string, string>>
  /** The API operations the run tests; none for a run of the web tests alone. */
  readonly apiOperations: readonly ApiOperation[]
  /** The arguments the command itself adds to `playwright test`, before the caller's own. */
  readonly args: readonly string[]
}
