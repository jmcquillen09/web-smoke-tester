import type { Page } from '@playwright/test'
import { HTTP_ERROR_STATUS } from '../constants.ts'
import { E2eFixtureError } from '../errors/E2eFixtureError.ts'
import type { LoadedPage } from './LoadedPage.ts'
import { failOnBotChallenge } from './failOnBotChallenge.ts'

// Opens one of the site's pages and waits for its load event: the state every page check starts
// from. A page that does not open is a setup failure here; LoadPageStage is the test of loading. A
// bot check in the page's place fails the test as bot protection.
export const openSitePage = async (page: Page, path: string): Promise<LoadedPage> => {
  const response = await page.goto(path, { waitUntil: 'load' })
  await failOnBotChallenge(page)
  const status = response?.status()
  const hasOpened = status !== undefined && status < HTTP_ERROR_STATUS
  if (!hasOpened) {
    throw new E2eFixtureError(
      `${path} did not open: ${status === undefined ? 'no response' : `HTTP ${String(status)}`}.`
    )
  }
  return { path, url: page.url(), status, title: await page.title() }
}
