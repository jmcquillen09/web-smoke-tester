import { CRAWL_FETCH_TIMEOUT_MS } from './constants.ts'
import type { FetchPageHtml } from './discoverSitePages.ts'

// Fetches one page for the crawl. Anything but an HTML document that ended on the page's own site
// (an error status, a redirect elsewhere, a download, a timeout) is no page to read links from.
export const fetchPageHtml: FetchPageHtml = async (url) => {
  try {
    const response = await fetch(url, {
      headers: { accept: 'text/html' },
      redirect: 'follow',
      signal: AbortSignal.timeout(CRAWL_FETCH_TIMEOUT_MS)
    })
    const isSitePage =
      response.ok &&
      new URL(response.url).origin === new URL(url).origin &&
      (response.headers.get('content-type') ?? '').includes('text/html')
    if (!isSitePage) {
      await response.body?.cancel()
      return undefined
    }
    return await response.text()
  } catch {
    return undefined
  }
}
