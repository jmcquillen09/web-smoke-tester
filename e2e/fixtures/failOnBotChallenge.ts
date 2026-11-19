import type { Page } from '@playwright/test'
import { BOT_PROTECTION_FAILURE } from '../constants.ts'
import { E2eBotProtectionError } from '../errors/E2eBotProtectionError.ts'
import { findBotChallenge } from './findBotChallenge.ts'

// Fails the running test when the loaded page is a bot check instead of the site: nothing a check
// finds on that page is about the site, so the test says why it could not judge it.
export const failOnBotChallenge = async (page: Page): Promise<void> => {
  const challenge = await findBotChallenge(page)
  const isBotCheck = challenge !== undefined
  if (isBotCheck) {
    throw new E2eBotProtectionError(
      `${BOT_PROTECTION_FAILURE}: the site answered with a bot check (${challenge}).`
    )
  }
}
