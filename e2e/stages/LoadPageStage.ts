import { expect } from '@playwright/test'
import { BOT_PROTECTION_FAILURE, HTTP_ERROR_STATUS, PAGE_SETTLE_TIMEOUT_MS } from '../constants.ts'
import { SiteRequestWatch } from '../fixtures/SiteRequestWatch.ts'
import { E2eBotProtectionError } from '../errors/E2eBotProtectionError.ts'
import { failOnBotChallenge } from '../fixtures/failOnBotChallenge.ts'
import { E2eStage } from './E2eStage.ts'
import type { E2eStageRuntime } from './E2eStageRuntime.ts'
import { E2eWorkflowState } from './E2eWorkflowState.ts'

// A visitor opens one page of the site: it answers without an error status, has a title, renders
// content, and none of the site's own requests behind it (scripts, styles, images, API calls) fails.
// Its spec also turns on `reportUncaughtPageErrors`, so a script error on the page fails it too;
// the page is given time to go quiet first, so a late script's error is caught. When the only thing
// wrong is a failed request of the site's bot-protection product, the test fails saying so.
export class LoadPageStage extends E2eStage {
  public readonly title: string
  readonly #path: string

  constructor(runtime: E2eStageRuntime, path: string) {
    super(runtime)
    this.#path = path
    this.title = `Load ${path}`
  }

  public override async setup(): Promise<E2eWorkflowState> {
    return E2eWorkflowState.empty()
  }

  public override async execute(state: E2eWorkflowState): Promise<E2eWorkflowState> {
    const { page, targetSettings } = this.runtime
    const watch = new SiteRequestWatch(page, targetSettings.baseUrl)
    try {
      const response = await page.goto(this.#path, { waitUntil: 'load' })
      await failOnBotChallenge(page)
      // A page that polls or streams never goes quiet; it is judged once the time is up.
      await page
        .waitForLoadState('networkidle', { timeout: PAGE_SETTLE_TIMEOUT_MS })
        .catch(() => {})
      const status = response?.status() ?? 0

      expect(status, `${this.#path} answers`).toBeGreaterThan(0)
      expect(status, `${this.#path} answers without an error status`).toBeLessThan(
        HTTP_ERROR_STATUS
      )
      await expect(page, `${this.#path} has a title`).toHaveTitle(/\S/)
      await expect(page.locator('body'), `${this.#path} renders content`).not.toBeEmpty()
      expect(watch.failures, `failed same-site requests on ${this.#path}`).toEqual([])

      const blocked = watch.botProtectionFailures
      const isBlockedByBotProtection = blocked.length > 0
      if (isBlockedByBotProtection) {
        throw new E2eBotProtectionError(
          `${BOT_PROTECTION_FAILURE}: a request of the site's bot-protection product failed (${blocked.join(', ')}).`
        )
      }

      return state.withLoadedPage({
        path: this.#path,
        url: page.url(),
        status,
        title: await page.title()
      })
    } finally {
      watch.stop()
    }
  }
}
