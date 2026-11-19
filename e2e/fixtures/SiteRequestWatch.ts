import type { Page, Request, Response } from '@playwright/test'
import { ABORTED_REQUEST, BOT_PROTECTION_REQUEST, HTTP_ERROR_STATUS } from '../constants.ts'

interface FailedRequest {
  readonly url: string
  readonly description: string
}

// Records the same-site requests a page makes that fail (an error status, or no answer at all)
// from construction until `stop()`. Other sites' requests are theirs to keep working, and a request
// the page itself abandoned is not a failure. A bot-protection product's own request is kept
// apart from the site's own, since it says nothing about the site's pages.
export class SiteRequestWatch {
  readonly #failed: FailedRequest[] = []
  readonly #page: Page
  readonly #siteOrigin: string
  readonly #onResponse: (response: Response) => void
  readonly #onRequestFailed: (request: Request) => void

  constructor(page: Page, baseUrl: string) {
    this.#page = page
    this.#siteOrigin = new URL(baseUrl).origin
    this.#onResponse = (response) => {
      const isSiteFailure =
        this.#isSameSite(response.url()) && response.status() >= HTTP_ERROR_STATUS
      if (!isSiteFailure) return
      this.#failed.push({
        url: response.url(),
        description: `${String(response.status())} ${response.request().method()} ${response.url()}`
      })
    }
    this.#onRequestFailed = (request) => {
      const reason = request.failure()?.errorText ?? 'no response'
      const isSiteFailure = this.#isSameSite(request.url()) && !ABORTED_REQUEST.test(reason)
      if (!isSiteFailure) return
      this.#failed.push({
        url: request.url(),
        description: `failed ${request.method()} ${request.url()} (${reason})`
      })
    }
    page.on('response', this.#onResponse)
    page.on('requestfailed', this.#onRequestFailed)
  }

  /** The site's own failed requests, as a visitor would meet them too. */
  get failures(): readonly string[] {
    return this.#describe((failed) => !BOT_PROTECTION_REQUEST.test(failed.url))
  }

  /** The failed requests that belong to a bot-protection product. */
  get botProtectionFailures(): readonly string[] {
    return this.#describe((failed) => BOT_PROTECTION_REQUEST.test(failed.url))
  }

  stop(): void {
    this.#page.off('response', this.#onResponse)
    this.#page.off('requestfailed', this.#onRequestFailed)
  }

  #describe(isWanted: (failed: FailedRequest) => boolean): readonly string[] {
    return this.#failed.filter(isWanted).map((failed) => failed.description)
  }

  #isSameSite(url: string): boolean {
    return URL.canParse(url) && new URL(url).origin === this.#siteOrigin
  }
}
