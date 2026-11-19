import { request as playwrightRequest } from '@playwright/test'
import { activeE2eTarget } from './activeE2eTarget.ts'
import { URL_CHECK_TIMEOUT_MS } from './constants.ts'
import { E2eConfigurationError } from './errors/E2eConfigurationError.ts'

// Asks the site for its first page once before any test starts. A site that does not answer at all
// (a wrong address, a server that is down, a VPN that is off) stops the run here with one clear
// reason instead of a timeout in every test. An error status is an answer: the tests report it.
export default async function globalSetup(): Promise<void> {
  const settings = activeE2eTarget()
  const [startPath = '/'] = settings.paths
  const startUrl = new URL(startPath, settings.baseUrl).href
  const request = await playwrightRequest.newContext({
    ignoreHTTPSErrors: settings.ignoreHttpsErrors
  })
  try {
    await request.get(startUrl, { failOnStatusCode: false, timeout: URL_CHECK_TIMEOUT_MS })
  } catch (error) {
    const reason = error instanceof Error ? (error.message.split('\n')[0] ?? '') : String(error)
    throw new E2eConfigurationError(
      `The ${settings.target} target did not answer at ${startUrl}: ${reason}`
    )
  } finally {
    await request.dispose()
  }
}
