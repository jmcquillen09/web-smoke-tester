import type { Page } from '@playwright/test'

// How many pixels wider than the viewport the loaded page's content is; 0 when it fits.
export const readHorizontalOverflow = (page: Page): Promise<number> =>
  page.evaluate(() => {
    const root = document.documentElement
    return Math.max(0, root.scrollWidth - root.clientWidth)
  })
