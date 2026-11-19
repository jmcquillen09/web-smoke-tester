import type { APIRequestContext } from '@playwright/test'
import { fetchSiteText } from './fetchSiteText.ts'

const HTML_TYPE = 'text/html'

// Fetches one page for the crawl. Anything but an HTML document that ended on the page's own site
// (an error status, a redirect elsewhere, a download, a timeout) is no page to read links from.
export const fetchPageHtml = async (
  siteRequest: APIRequestContext,
  url: string
): Promise<string | undefined> => {
  const page = await fetchSiteText(siteRequest, url, HTML_TYPE, (contentType) =>
    contentType.includes(HTML_TYPE)
  )
  return page?.text
}
