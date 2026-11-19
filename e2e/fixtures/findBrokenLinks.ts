import type { Page } from '@playwright/test'
import { HTTP_ERROR_STATUS, NO_RESPONSE_STATUS, URL_CHECK_CONCURRENCY } from '../constants.ts'
import { readUrlStatus } from './readUrlStatus.ts'
import type { UrlStatuses } from './UrlStatuses.ts'

// Requests each same-site address from the loaded page, a few at a time, and describes the ones
// that fail: `404 https://…` for an error status and `no response https://…` for one that never
// answered.
export const findBrokenLinks = async (
  page: Page,
  statuses: UrlStatuses,
  urls: readonly string[]
): Promise<string[]> => {
  const broken: string[] = []
  for (let start = 0; start < urls.length; start += URL_CHECK_CONCURRENCY) {
    const batch = urls.slice(start, start + URL_CHECK_CONCURRENCY)
    const checked = await Promise.all(
      batch.map(async (url) => ({ url, status: await readUrlStatus(page, statuses, url) }))
    )
    for (const { url, status } of checked) {
      const isBroken = status === NO_RESPONSE_STATUS || status >= HTTP_ERROR_STATUS
      if (isBroken) {
        broken.push(`${status === NO_RESPONSE_STATUS ? 'no response' : String(status)} ${url}`)
      }
    }
  }
  return broken
}
