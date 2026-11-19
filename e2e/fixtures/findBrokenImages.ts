import type { Page } from '@playwright/test'
import { URL_CHECK_TIMEOUT_MS } from '../constants.ts'

// Has the loaded page's browser load each image address, as an `<img>` does, and returns the
// addresses that fail to load or to decode as an image. The browser reuses the copies the page
// already fetched, so an image the visitor sees costs no second request.
export const findBrokenImages = (page: Page, urls: readonly string[]): Promise<string[]> =>
  page.evaluate(
    async ({ addresses, timeoutMs }) => {
      const loads = (address: string): Promise<boolean> =>
        new Promise((resolve) => {
          const image = new Image()
          const timer = setTimeout(() => {
            resolve(false)
          }, timeoutMs)
          const settle = (hasLoaded: boolean) => (): void => {
            clearTimeout(timer)
            resolve(hasLoaded)
          }
          image.onload = settle(true)
          image.onerror = settle(false)
          image.src = address
        })
      const results = await Promise.all(
        addresses.map(async (address) => ({ address, hasLoaded: await loads(address) }))
      )
      return results.flatMap(({ address, hasLoaded }) => (hasLoaded ? [] : [address]))
    },
    { addresses: [...urls], timeoutMs: URL_CHECK_TIMEOUT_MS }
  )
