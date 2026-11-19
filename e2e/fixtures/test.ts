import type { E2eStageRuntime } from '../stages/E2eStageRuntime.ts'
import { blockThirdPartyTracking } from './blockThirdPartyTracking.ts'
import { failOnUncaughtPageErrors } from './failOnUncaughtPageErrors.ts'
import { targetTest } from './targetTest.ts'
import type { UrlStatuses } from './UrlStatuses.ts'

interface E2eTestFixtures {
  readonly pageHandlersInstalled: true
  /**
   * Whether an error the site leaves unhandled on one of the test's pages fails the test. Off unless
   * a spec turns it on with `test.use`: the page-load specs report these errors, so a script error
   * fails one test per page instead of every check on that page.
   */
  readonly reportUncaughtPageErrors: boolean
  /** Applies `reportUncaughtPageErrors` to the test's own browser context. */
  readonly uncaughtPageErrorsFail: boolean
  /** The initial config every stage is constructed with: this test's page, request and target. */
  readonly stageRuntime: E2eStageRuntime
}

interface E2eWorkerFixtures {
  /** The link and image statuses this worker's tests have read, so each URL is requested once. */
  readonly urlStatuses: UrlStatuses
}

// The suite's `test`: every spec gets the same target, third-party blocking and stage runtime.
export const test = targetTest.extend<E2eTestFixtures, E2eWorkerFixtures>({
  urlStatuses: [
    async ({}, use) => {
      await use(new Map())
    },
    { scope: 'worker' }
  ],
  pageHandlersInstalled: [
    async ({ page, targetSettings }, use) => {
      if (targetSettings.blockTracking) await blockThirdPartyTracking(page)
      await use(true)
    },
    { auto: true }
  ],
  reportUncaughtPageErrors: [false, { option: true }],
  uncaughtPageErrorsFail: [
    async ({ context, reportUncaughtPageErrors }, use, testInfo) => {
      const assertNoUncaughtErrors = reportUncaughtPageErrors
        ? failOnUncaughtPageErrors(context, testInfo)
        : async (): Promise<void> => {}
      await use(reportUncaughtPageErrors)
      await assertNoUncaughtErrors()
    },
    { auto: true }
  ],
  stageRuntime: async (
    { browser, page, request, targetSettings, urlStatuses, reportUncaughtPageErrors },
    use,
    testInfo
  ) => {
    const withIsolatedRuntime: E2eStageRuntime['withIsolatedRuntime'] = async (work) => {
      const context = await browser.newContext({
        baseURL: targetSettings.baseUrl,
        ignoreHTTPSErrors: targetSettings.ignoreHttpsErrors
      })
      try {
        const assertNoUncaughtErrors = reportUncaughtPageErrors
          ? failOnUncaughtPageErrors(context, testInfo)
          : async (): Promise<void> => {}
        const visitorPage = await context.newPage()
        if (targetSettings.blockTracking) await blockThirdPartyTracking(visitorPage)
        let result
        try {
          result = await work({
            page: visitorPage,
            request,
            targetSettings,
            urlStatuses,
            withIsolatedRuntime
          })
        } catch (stageError) {
          await assertNoUncaughtErrors().catch((diagnosticError: unknown) => {
            throw new AggregateError(
              [stageError, diagnosticError],
              'The isolated browser stage failed and reported browser diagnostics.'
            )
          })
          throw stageError
        }
        await assertNoUncaughtErrors()
        return result
      } finally {
        await context.close()
      }
    }
    await use({ page, request, targetSettings, urlStatuses, withIsolatedRuntime })
  }
})
