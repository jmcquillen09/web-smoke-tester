import type { Page } from '@playwright/test'
import { THIRD_PARTY_TRACKING } from '../constants.ts'

export const blockThirdPartyTracking = async (page: Page): Promise<void> => {
  await page.route(THIRD_PARTY_TRACKING, (route) => route.abort())
}
