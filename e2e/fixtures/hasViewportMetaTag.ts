import type { Page } from '@playwright/test'

// Whether the loaded page declares a viewport (`<meta name="viewport" content="…">`). Without one a
// phone lays the page out at desktop width and shrinks it to fit.
export const hasViewportMetaTag = (page: Page): Promise<boolean> =>
  page.evaluate(() => {
    const content = document.querySelector('meta[name="viewport" i]')?.getAttribute('content') ?? ''
    return content.trim() !== ''
  })
