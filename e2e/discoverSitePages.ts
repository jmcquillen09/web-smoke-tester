import type { E2eTargetSettings } from './E2eTargetSettings.ts'
import { extractSameSiteLinks } from './extractSameSiteLinks.ts'

/** A page's HTML, or undefined when it did not answer with an HTML document of this site. */
export type FetchPageHtml = (url: string) => Promise<string | undefined>

// The pages a run tests: the target's own paths, then up to `crawlLimit` more found by following
// same-site links breadth-first from them, so pages nearest the start pages come first. A page that
// does not answer adds no links and stays in the list, where its own tests report it.
export const discoverSitePages = async (
  settings: Pick<E2eTargetSettings, 'baseUrl' | 'paths' | 'crawlLimit'>,
  fetchPageHtml: FetchPageHtml
): Promise<readonly string[]> => {
  const pages = [...settings.paths]
  const pageLimit = settings.paths.length + settings.crawlLimit
  for (let index = 0; index < pages.length && pages.length < pageLimit; index += 1) {
    const pageUrl = new URL(pages[index] ?? '/', settings.baseUrl).href
    const html = await fetchPageHtml(pageUrl)
    const hasHtml = html !== undefined
    if (!hasHtml) continue
    for (const path of extractSameSiteLinks(html, pageUrl, settings.baseUrl)) {
      const isNewPage = !pages.includes(path)
      if (isNewPage && pages.length < pageLimit) pages.push(path)
    }
  }
  return pages
}
