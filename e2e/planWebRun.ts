import type { APIRequestContext } from '@playwright/test'
import { discoverSitePages } from './discoverSitePages.ts'
import type { E2eTargetSettings } from './E2eTargetSettings.ts'
import { fetchPageHtml } from './fetchPageHtml.ts'

// The pages the web tests of a run cover: the target's own and the ones a crawl finds, announced
// through `log` before the tests start.
export const planWebRun = async (
  settings: Pick<E2eTargetSettings, 'target' | 'baseUrl' | 'paths' | 'crawlLimit'>,
  siteRequest: APIRequestContext,
  log: (message: string) => void
): Promise<readonly string[]> => {
  const pages = await discoverSitePages(settings, (url) => fetchPageHtml(siteRequest, url))
  log(
    `testing ${String(pages.length)} page(s) on ${settings.baseUrl} (${settings.target}): ${pages.join(', ')}`
  )
  return pages
}
