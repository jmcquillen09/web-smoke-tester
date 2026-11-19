import type { APIRequestContext } from '@playwright/test'
import { fetchSiteText } from './fetchSiteText.ts'

const JSON_TYPE = 'json'

// Fetches a list operation's answer for a path parameter's value. Anything but JSON that ended on
// the operation's own site (an error status, a redirect elsewhere, HTML) is no list.
export const fetchApiList = async (
  siteRequest: APIRequestContext,
  url: string
): Promise<string | undefined> => {
  const list = await fetchSiteText(siteRequest, url, 'application/json', (contentType) =>
    contentType.includes(JSON_TYPE)
  )
  return list?.text
}
