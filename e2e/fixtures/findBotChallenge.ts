import type { Page } from '@playwright/test'
import { BOT_CHALLENGE_TEXT, BOT_CHALLENGE_URL } from '../constants.ts'

// What marks the loaded page as a bot check standing in for the site (its address, its title or
// its first heading), or undefined when it looks like the site itself.
export const findBotChallenge = async (page: Page): Promise<string | undefined> => {
  const isChallengeUrl = BOT_CHALLENGE_URL.test(page.url())
  if (isChallengeUrl) return `the address ${page.url()}`

  const title = await page.title()
  const hasChallengeTitle = BOT_CHALLENGE_TEXT.test(title)
  if (hasChallengeTitle) return `the page title "${title}"`

  const headings = await page.locator('h1, h2').allTextContents()
  const [firstHeading = ''] = headings.map((heading) => heading.trim())
  const hasChallengeHeading = BOT_CHALLENGE_TEXT.test(firstHeading)
  return hasChallengeHeading ? `the heading "${firstHeading}"` : undefined
}
