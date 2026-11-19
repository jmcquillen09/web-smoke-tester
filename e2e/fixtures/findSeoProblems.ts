import type { Page } from '@playwright/test'

// The basic search and sharing problems on the loaded page, one line each, empty when there are
// none: no `<title>` and no meta description.
export const findSeoProblems = (page: Page): Promise<string[]> =>
  page.evaluate(() => {
    const metaContent = (name: string): string =>
      (document.querySelector(`meta[name="${name}" i]`)?.getAttribute('content') ?? '').trim()

    const problems: string[] = []
    if (document.title.trim() === '') problems.push('the page has no <title>')
    if (metaContent('description') === '') problems.push('the page has no meta description')
    return problems
  })
