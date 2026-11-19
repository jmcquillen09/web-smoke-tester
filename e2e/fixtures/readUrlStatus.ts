import type { Page } from '@playwright/test'
import {
  HTTP_ERROR_STATUS,
  HTTP_REDIRECT_STATUS,
  NO_RESPONSE_STATUS,
  URL_CHECK_TIMEOUT_MS
} from '../constants.ts'
import type { UrlStatuses } from './UrlStatuses.ts'

// Requests a same-site address from inside the loaded page, so the request goes out as the
// visitor's browser sends it: same protocol, cookies and headers. A server can answer another HTTP
// client differently, or not at all, which says nothing about what a visitor gets.
const requestStatus = (page: Page, url: string): Promise<number> =>
  page
    .evaluate(
      async ({ address, timeoutMs, errorStatus, redirectStatus, noResponseStatus }) => {
        const statusOf = async (method: string, redirect: RequestRedirect): Promise<number> => {
          const response = await fetch(address, {
            method,
            redirect,
            signal: AbortSignal.timeout(timeoutMs)
          })
          await response.body?.cancel()
          return response.type === 'opaqueredirect' ? redirectStatus : response.status
        }
        // A redirect to another site cannot be followed from a page; it is read as a redirect.
        const read = (method: string): Promise<number> =>
          statusOf(method, 'follow').catch(() => statusOf(method, 'manual'))
        try {
          const head = await read('HEAD').catch(() => errorStatus)
          // Some servers refuse HEAD, or answer it with an error they would not give a GET.
          const needsGet = head >= errorStatus
          return needsGet ? await read('GET') : head
        } catch {
          return noResponseStatus
        }
      },
      {
        address: url,
        timeoutMs: URL_CHECK_TIMEOUT_MS,
        errorStatus: HTTP_ERROR_STATUS,
        redirectStatus: HTTP_REDIRECT_STATUS,
        noResponseStatus: NO_RESPONSE_STATUS
      }
    )
    .catch(() => NO_RESPONSE_STATUS)

// The status the same-site `url` answers the loaded page's browser with after redirects, or
// NO_RESPONSE_STATUS when it never answers. Each address is requested once per worker; later reads
// share the first one's answer.
export const readUrlStatus = (page: Page, statuses: UrlStatuses, url: string): Promise<number> => {
  const known = statuses.get(url)
  const isKnown = known !== undefined
  if (isKnown) return known
  const status = requestStatus(page, url)
  statuses.set(url, status)
  return status
}
