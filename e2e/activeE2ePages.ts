import { z } from 'zod'
import { SITE_PAGES_VARIABLE } from './constants.ts'
import type { E2eTargetSettings } from './E2eTargetSettings.ts'
import { E2eConfigurationError } from './errors/E2eConfigurationError.ts'

const SitePagesSchema = z.array(z.string().startsWith('/')).min(1)

// The pages this run tests, one test per page per check. The runner (e2e/planWebRun.ts) hands over the
// target's own paths plus the pages its crawl found; a run started without it (the VS Code
// Playwright extension) tests the target's own paths.
export const activeE2ePages = (
  settings: E2eTargetSettings,
  env: Readonly<Record<string, string | undefined>> = process.env
): readonly string[] => {
  const handedOver = env[SITE_PAGES_VARIABLE] ?? ''
  const hasHandedOverPages = handedOver !== ''
  if (!hasHandedOverPages) return settings.paths

  let content: unknown
  try {
    content = JSON.parse(handedOver)
  } catch {
    throw new E2eConfigurationError(`${SITE_PAGES_VARIABLE} is not valid JSON.`)
  }
  const parsed = SitePagesSchema.safeParse(content)
  if (!parsed.success) {
    throw new E2eConfigurationError(
      `${SITE_PAGES_VARIABLE} must be a JSON array of paths that each start with "/".`
    )
  }
  return [...new Set(parsed.data)]
}
