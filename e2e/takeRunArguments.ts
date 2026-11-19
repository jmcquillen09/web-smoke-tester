import { stopOnConfigurationError } from '../support/stopOnConfigurationError.ts'
import type { E2eTargetSettings } from './E2eTargetSettings.ts'
import { readE2eTargets } from './readE2eTargets.ts'
import { resolveE2eBrowsers } from './resolveE2eBrowsers.ts'
import { takeBrowserArgument } from './takeBrowserArgument.ts'
import { takeE2eTarget } from './takeE2eTarget.ts'
import { targetsFilePath } from './targetsFilePath.ts'

// What a command that runs web tests was asked for: `--browser` and the target come out of its
// arguments and the rest goes to `playwright test`. A bad choice ends the process as a refused run.
export const takeRunArguments = (
  command: string,
  argv: readonly string[],
  env: Readonly<Record<string, string | undefined>>
): {
  readonly browser: string
  readonly settings: E2eTargetSettings
  readonly playwrightArgs: readonly string[]
} => {
  const { choice: browser, rest: args } = takeBrowserArgument(argv)
  // Checked here so a bad choice stops the run before the crawl; playwright.config.ts resolves the
  // same E2E_BROWSER and E2E_TARGET values again through the same functions.
  stopOnConfigurationError(command, () => resolveE2eBrowsers(browser))
  const { settings, rest: playwrightArgs } = stopOnConfigurationError(command, () =>
    takeE2eTarget(args, readE2eTargets(targetsFilePath(env)))
  )
  return { browser, settings, playwrightArgs }
}
