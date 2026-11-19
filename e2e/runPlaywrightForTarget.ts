import type { APIRequestContext } from '@playwright/test'
import { mkdtempSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { withTargetDemoServer } from '../demo/withTargetDemoServer.ts'
import type { ChildOutcome } from '../support/ChildOutcome.ts'
import { spawnChild } from '../support/spawnChild.ts'
import { assertSiteAnswers } from './assertSiteAnswers.ts'
import { API_OPERATIONS_FILE_VARIABLE, TARGET_VARIABLE } from './constants.ts'
import type { E2eTargetSettings } from './E2eTargetSettings.ts'
import type { PlaywrightRunPlan } from './PlaywrightRunPlan.ts'
import { withSiteRequest } from './withSiteRequest.ts'
import { writeApiOperationsFile } from './writeApiOperationsFile.ts'

// Node runs Playwright's CLI module directly; spawning `npx` fails on Windows, where it is a .cmd shim.
const PLAYWRIGHT_CLI = createRequire(import.meta.url).resolve('@playwright/test/cli')
const REPO_ROOT = path.join(import.meta.dirname, '..')

type PlanRun = (
  siteRequest: APIRequestContext,
  log: (message: string) => void
) => Promise<PlaywrightRunPlan>

// Plans the run on the site, hands Playwright what it found and waits for the tests to end. The
// operations file lives in a scratch folder that is removed however the run ended.
const runPlaywright = async (
  settings: E2eTargetSettings,
  playwrightArgs: readonly string[],
  plan: PlanRun,
  log: (message: string) => void
): Promise<ChildOutcome> => {
  const run = await withSiteRequest(settings, async (siteRequest) => {
    // Asked first, so a site that is down or whose certificate is refused is named as that.
    await assertSiteAnswers(settings, siteRequest)
    return plan(siteRequest, log)
  })
  const scratchFolder = mkdtempSync(path.join(tmpdir(), 'web-smoke-tester-run-'))
  try {
    return await spawnChild(
      process.execPath,
      [PLAYWRIGHT_CLI, 'test', ...run.args, ...playwrightArgs],
      {
        cwd: REPO_ROOT,
        stdio: 'inherit',
        env: {
          ...process.env,
          [TARGET_VARIABLE]: settings.target,
          [API_OPERATIONS_FILE_VARIABLE]: writeApiOperationsFile(scratchFolder, run.apiOperations),
          ...run.env
        }
      }
    )
  } finally {
    rmSync(scratchFolder, { recursive: true, force: true })
  }
}

// One command's whole run against a target, ending the process with the tests' outcome: the demo
// server the target names is served throughout, and the process ends only once it has shut down.
export const runPlaywrightForTarget = async (
  command: string,
  settings: E2eTargetSettings,
  playwrightArgs: readonly string[],
  plan: PlanRun
): Promise<never> => {
  const log = (message: string): void => {
    console.log(`${command}: ${message}`)
  }
  try {
    const outcome = await withTargetDemoServer(settings, log, () =>
      runPlaywright(settings, playwrightArgs, plan, log)
    )
    if (outcome.kind === 'signalled') process.kill(process.pid, outcome.signal)
    process.exit(outcome.kind === 'exited' ? outcome.code : 1)
  } catch (error) {
    console.error(`${command}: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}
