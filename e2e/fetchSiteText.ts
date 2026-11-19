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
  url: string,
  accept: string,
  isWantedType: (contentType: string) => boolean
): Promise<{ readonly url: string; readonly text: string } | undefined> => {
  const signal = AbortSignal.timeout(CRAWL_FETCH_TIMEOUT_MS)
  const { origin } = new URL(url)
  let address = url
  try {
    for (let redirects = 0; redirects <= FETCH_REDIRECT_LIMIT; redirects += 1) {
      const response = await fetch(address, { headers: { accept }, redirect: 'manual', signal })
      const location = response.headers.get('location') ?? ''
      const isRedirect =
        response.status >= HTTP_FIRST_REDIRECT_STATUS &&
        response.status < HTTP_ERROR_STATUS &&
        location !== ''
      if (!isRedirect) {
        const isWanted = response.ok && isWantedType(response.headers.get('content-type') ?? '')
        if (isWanted) return { url: address, text: await response.text() }
        await response.body?.cancel()
        return undefined
      }
      await response.body?.cancel()
      const next = new URL(location, address)
      const isFollowable =
        next.origin === origin && !UNSAFE_LINK.test(`${next.pathname}${next.search}`)
      if (!isFollowable) return undefined
      address = next.href
    }
    return undefined
  } catch {
    return undefined
  }
}
