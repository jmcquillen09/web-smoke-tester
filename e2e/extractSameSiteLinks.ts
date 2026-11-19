import { NON_PAGE_EXTENSION, UNSAFE_LINK } from './constants.ts'

const ANCHOR_HREF = /<a\s[^>]*?href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/gi
const HTML_ENTITY_AMPERSAND = /&amp;/g

// The same-site pages an HTML document links to, as paths from the site's root, in document order
// and without repeats. Fragments are dropped (`/about#team` is `/about`), as are other sites, files
// (NON_PAGE_EXTENSION), non-web schemes and links a read-only run must not follow (UNSAFE_LINK).
export const extractSameSiteLinks = (html: string, pageUrl: string, baseUrl: string): string[] => {
  const siteOrigin = new URL(baseUrl).origin
  const paths = new Set<string>()
  for (const match of html.matchAll(ANCHOR_HREF)) {
    const href = (match[1] ?? match[2] ?? match[3] ?? '').replace(HTML_ENTITY_AMPERSAND, '&').trim()
    const isResolvable = href !== '' && URL.canParse(href, pageUrl)
    if (!isResolvable) continue
    const link = new URL(href, pageUrl)
    const isSameSitePage =
      link.origin === siteOrigin &&
      !NON_PAGE_EXTENSION.test(link.pathname) &&
      !UNSAFE_LINK.test(`${link.pathname}${link.search}`)
    if (!isSameSitePage) continue
    paths.add(`${link.pathname}${link.search}`)
  }
  return [...paths]
}
