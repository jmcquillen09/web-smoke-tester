import type { APIRequestContext } from '@playwright/test'
import {
  CRAWL_FETCH_TIMEOUT_MS,
  FETCH_REDIRECT_LIMIT,
  HTTP_ERROR_STATUS,
  HTTP_FIRST_REDIRECT_STATUS,
  UNSAFE_LINK
} from './constants.ts'

// The body `url` answers with, and the address that answered, when the answer is OK and of a wanted
// content type. A redirect is followed only on the same site, never to an `UNSAFE_LINK` address.
export const fetchSiteText = async (
  siteRequest: APIRequestContext,
  url: string,
  accept: string,
  isWantedType: (contentType: string) => boolean
): Promise<{ readonly url: string; readonly text: string } | undefined> => {
  const { origin } = new URL(url)
  let address = url
  try {
    for (let redirects = 0; redirects <= FETCH_REDIRECT_LIMIT; redirects += 1) {
      const response = await siteRequest.get(address, {
        headers: { accept },
        failOnStatusCode: false,
        maxRedirects: 0,
        timeout: CRAWL_FETCH_TIMEOUT_MS
      })
      try {
        const location = response.headers()['location'] ?? ''
        const isRedirect =
          response.status() >= HTTP_FIRST_REDIRECT_STATUS &&
          response.status() < HTTP_ERROR_STATUS &&
          location !== ''
        if (!isRedirect) {
          const isWanted = response.ok() && isWantedType(response.headers()['content-type'] ?? '')
          return isWanted ? { url: address, text: await response.text() } : undefined
        }
        const next = new URL(location, address)
        const isFollowable =
          next.origin === origin && !UNSAFE_LINK.test(`${next.pathname}${next.search}`)
        if (!isFollowable) return undefined
        address = next.href
      } finally {
        await response.dispose()
      }
    }
    return undefined
  } catch {
    return undefined
  }
}
