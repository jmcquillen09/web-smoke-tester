import type { APIRequestContext } from '@playwright/test'
import { createRequire } from 'node:module'
import path from 'node:path'
import { withTargetDemoServer } from '../demo/withTargetDemoServer.ts'
import { spawnChild } from '../support/spawnChild.ts'
import { assertSiteAnswers } from './assertSiteAnswers.ts'
import { TARGET_VARIABLE } from './constants.ts'
import type { E2eTargetSettings } from './E2eTargetSettings.ts'
import type { PlaywrightRunPlan } from './PlaywrightRunPlan.ts'
import { withSiteRequest } from './withSiteRequest.ts'

// Node runs Playwright's CLI module directly; spawning `npx` fails on Windows, where it is a .cmd shim.
const PLAYWRIGHT_CLI = createRequire(import.meta.url).resolve('@playwright/test/cli')
const REPO_ROOT = path.join(import.meta.dirname, '..')

// One command's whole run against a target, ending the process with the tests' outcome: the demo
// server the target names is served throughout, and the process ends only once it has shut down.
export const runPlaywrightForTarget = async (
  command: string,
  settings: E2eTargetSettings,
  playwrightArgs: readonly string[],
  plan: (
    siteRequest: APIRequestContext,
    log: (message: string) => void
  ) => Promise<PlaywrightRunPlan>
): Promise<never> => {
  const log = (message: string): void => {
    console.log(`${command}: ${message}`)
  }
  try {
    const outcome = await withTargetDemoServer(settings, log, async () => {
      const run = await withSiteRequest(settings, async (siteRequest) => {
        // Asked first, so a site that is down or whose certificate is refused is named as that.
        await assertSiteAnswers(settings, siteRequest)
        return plan(siteRequest, log)
      })
      return spawnChild(
        process.execPath,
        [PLAYWRIGHT_CLI, 'test', ...run.args, ...playwrightArgs],
        {
          cwd: REPO_ROOT,
          stdio: 'inherit',
          env: { ...process.env, [TARGET_VARIABLE]: settings.target, ...run.env }
        }
      )
    })
    if (outcome.kind === 'signalled') process.kill(process.pid, outcome.signal)
    process.exit(outcome.kind === 'exited' ? outcome.code : 1)
  } catch (error) {
    console.error(`${command}: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}
