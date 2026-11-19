import { writeFile } from 'node:fs/promises'
import type { TestInfo } from '@playwright/test'
import { MAX_ERROR_SCREENSHOTS } from '../constants.ts'
import { E2eUncaughtPageError } from '../errors/E2eUncaughtPageError.ts'

interface ErrorPage {
  url(): string
  screenshot(options: { fullPage: boolean }): Promise<Buffer>
}

interface WebErrorSource {
  on(
    event: 'weberror',
    listener: (webError: { error(): Error; page(): ErrorPage | null }) => void
  ): void
}

interface UncaughtPageError {
  readonly description: string
  count: number
  readonly screenshot: Promise<Buffer | undefined>
}

const screenshotOf = (page: ErrorPage | null): Promise<Buffer | undefined> =>
  page === null
    ? Promise.resolve(undefined)
    : page.screenshot({ fullPage: true }).catch(() => undefined)

// Records every exception and promise rejection the context's pages leave unhandled. The same
// error raised again on the same page is counted, not listed again, and the first
// MAX_ERROR_SCREENSHOTS distinct errors each get a screenshot, taken as the error happens. The
// returned check attaches them to the test as files, then throws.
export const failOnUncaughtPageErrors = (
  context: WebErrorSource,
  testInfo: Pick<TestInfo, 'attach' | 'outputPath'>
): (() => Promise<void>) => {
  const errors = new Map<string, UncaughtPageError>()
  context.on('weberror', (webError) => {
    const error = webError.error()
    const page = webError.page()
    const description = `${page?.url() ?? 'unknown page'}\n${error.stack ?? `${error.name}: ${error.message}`}`
    const known = errors.get(description)
    const isRepeat = known !== undefined
    if (isRepeat) {
      known.count += 1
      return
    }
    const hasScreenshotLeft = errors.size < MAX_ERROR_SCREENSHOTS
    errors.set(description, {
      description,
      count: 1,
      screenshot: hasScreenshotLeft ? screenshotOf(page) : Promise.resolve(undefined)
    })
  })
  return async () => {
    const distinct = [...errors.values()]
    const hasUncaughtErrors = distinct.length > 0
    if (!hasUncaughtErrors) return
    const describe = (error: UncaughtPageError): string =>
      error.count > 1 ? `${String(error.count)} times: ${error.description}` : error.description
    for (const [index, error] of distinct.entries()) {
      const name = `uncaught-page-error-${String(index + 1)}`
      await testInfo.attach(`${name}.txt`, { body: describe(error), contentType: 'text/plain' })
      const screenshot = await error.screenshot
      const hasScreenshot = screenshot !== undefined
      if (hasScreenshot) {
        // A file, not a body: the JSON report inlines every body, and screenshots would swamp it.
        const file = testInfo.outputPath(`${name}.png`)
        await writeFile(file, screenshot)
        await testInfo.attach(`${name}.png`, { path: file, contentType: 'image/png' })
      }
    }
    const total = distinct.reduce((sum, error) => sum + error.count, 0)
    throw new E2eUncaughtPageError(
      `The site left ${String(total)} error(s) unhandled (${String(distinct.length)} distinct):\n\n${distinct.map(describe).join('\n\n')}`
    )
  }
}
