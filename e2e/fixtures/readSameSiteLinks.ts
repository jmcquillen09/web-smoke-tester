import type { Page } from '@playwright/test'
import { MAX_URLS_PER_PAGE_CHECK, UNSAFE_LINK } from '../constants.ts'

// The same-site addresses the loaded page links to, without fragments or repeats, in page order and
// capped at MAX_URLS_PER_PAGE_CHECK. Links a read-only run must not request (UNSAFE_LINK) are left out.
export const readSameSiteLinks = async (page: Page, baseUrl: string): Promise<string[]> => {
  const hrefs = await page
    .locator('a[href]')
    .evaluateAll((anchors) =>
      anchors.flatMap((anchor) => (anchor instanceof HTMLAnchorElement ? [anchor.href] : []))
    )
  const siteOrigin = new URL(baseUrl).origin
  const links = new Set<string>()
  for (const href of hrefs) {
    const isUrl = URL.canParse(href)
    if (!isUrl) continue
    const link = new URL(href)
    link.hash = ''
    const isSafeSiteLink = link.origin === siteOrigin && !UNSAFE_LINK.test(link.href)
    if (isSafeSiteLink) links.add(link.href)
  }
  return [...links].slice(0, MAX_URLS_PER_PAGE_CHECK)
}
