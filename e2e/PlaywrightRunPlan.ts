// What a runner found on the target's site for one Playwright run to test.
export interface PlaywrightRunPlan {
  /** The variables that hand the run its pages and operations, on top of the target's name. */
  readonly env: Readonly<Record<string, string>>
  /** The arguments the command itself adds to `playwright test`, before the caller's own. */
  readonly args: readonly string[]
}
