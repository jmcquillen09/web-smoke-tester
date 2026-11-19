#!/usr/bin/env node
// `npm run test:api-playwright [target] [args...]`: runs only the API tests, the `api` project of
// `playwright test`, on the GET operations of the target's OpenAPI document.

import { API_PROJECT } from '../e2e/constants.ts'
import { planApiRun } from '../e2e/planApiRun.ts'
import { readE2eTargets } from '../e2e/readE2eTargets.ts'
import { runPlaywrightForTarget } from '../e2e/runPlaywrightForTarget.ts'
import { takeE2eTarget } from '../e2e/takeE2eTarget.ts'
import { targetsFilePath } from '../e2e/targetsFilePath.ts'
import { stopOnConfigurationError } from '../support/stopOnConfigurationError.ts'

const COMMAND = 'test:api-playwright'

const { settings, rest: playwrightArgs } = stopOnConfigurationError(COMMAND, () =>
  takeE2eTarget(process.argv.slice(2), readE2eTargets(targetsFilePath(process.env)))
)

await runPlaywrightForTarget(COMMAND, settings, playwrightArgs, async (siteRequest, log) => ({
  env: {},
  apiOperations: await planApiRun(settings, siteRequest, log),
  args: [`--project=${API_PROJECT}`]
}))
