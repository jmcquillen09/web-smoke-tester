import type { Page } from '@playwright/test'
import { NON_PAGE_EXTENSION, UNSAFE_LINK } from '../constants.ts'
import type { FollowedLink } from './FollowedLink.ts'

const NAVIGATION_LINKS = 'nav a[href], header a[href]'
const ANY_LINKS = 'a[href]'

interface PageLink {
  readonly index: number
  readonly href: string
}

// The links under `selector` that open another page of this site in the same tab, in page order.
const readSiteLinks = async (
  page: Page,
  selector: string,
  baseUrl: string
): Promise<PageLink[]> => {
  const anchors = await page.locator(selector).evaluateAll((elements) =>
    elements.flatMap((element, index) => {
      const isSameTabAnchor =
        element instanceof HTMLAnchorElement &&
        element.target !== '_blank' &&
        !element.hasAttribute('download')
      return isSameTabAnchor ? [{ index, href: element.href }] : []
    })
  )
  const here = new URL(page.url())
  const siteOrigin = new URL(baseUrl).origin
  return anchors.filter(({ href }) => {
    const isUrl = URL.canParse(href)
    if (!isUrl) return false
    const link = new URL(href)
    const isAnotherPage = link.pathname !== here.pathname || link.search !== here.search
    return (
      link.origin === siteOrigin &&
      isAnotherPage &&
      !NON_PAGE_EXTENSION.test(link.pathname) &&
      !UNSAFE_LINK.test(link.href)
    )
  })
}

// Clicks the first visible link on the loaded page that leads to another page of this site,
// preferring the site's navigation, and waits for that page to load. Returns undefined when the
// page shows no such link: a one-page site has nothing to follow.
export const followFirstSiteLink = async (
  page: Page,
  baseUrl: string
): Promise<FollowedLink | undefined> => {
  const from = page.url()
  for (const selector of [NAVIGATION_LINKS, ANY_LINKS]) {
    for (const link of await readSiteLinks(page, selector, baseUrl)) {
      const anchor = page.locator(selector).nth(link.index)
      const isVisible = await anchor.isVisible()
      if (!isVisible) continue
      await anchor.click()
      await page.waitForURL((url) => url.href !== from, { waitUntil: 'load' })
      return { from, to: page.url(), href: link.href }
    }
  }
  return undefined
}
