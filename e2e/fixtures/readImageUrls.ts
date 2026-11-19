import type { Page } from '@playwright/test'
import { MAX_URLS_PER_PAGE_CHECK, THIRD_PARTY_TRACKING } from '../constants.ts'

const WEB_PROTOCOLS: readonly string[] = ['http:', 'https:']

// The address of every image on the loaded page, on this site or another, without repeats and
// capped at MAX_URLS_PER_PAGE_CHECK: the source the browser chose (`srcset`), else `src`. Inline
// `data:` and `blob:` images have nothing to request, and a tracking pixel the suite blocks
// (THIRD_PARTY_TRACKING) never loads by design.
export const readImageUrls = async (page: Page): Promise<string[]> => {
  const sources = await page
    .locator('img')
    .evaluateAll((images) =>
      images.flatMap((image) =>
        image instanceof HTMLImageElement ? [image.currentSrc || image.src] : []
      )
    )
  const urls = sources.filter(
    (source) =>
      URL.canParse(source) &&
      WEB_PROTOCOLS.includes(new URL(source).protocol) &&
      !THIRD_PARTY_TRACKING.test(source)
  )
  return [...new Set(urls)].slice(0, MAX_URLS_PER_PAGE_CHECK)
}
