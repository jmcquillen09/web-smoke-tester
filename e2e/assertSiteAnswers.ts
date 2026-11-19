import type { APIRequestContext } from '@playwright/test'
import { URL_CHECK_TIMEOUT_MS } from './constants.ts'
import type { E2eTargetSettings } from './E2eTargetSettings.ts'
import { E2eConfigurationError } from './errors/E2eConfigurationError.ts'

const CERTIFICATE_REASON = /certificate|CERT_/i

// Asks the site for its first page and stops the run, with the reason, when it does not answer at
// all. An error status is an answer, and so is a redirect, which is not followed.
export const assertSiteAnswers = async (
  settings: Pick<E2eTargetSettings, 'target' | 'baseUrl' | 'paths'>,
  siteRequest: APIRequestContext
): Promise<void> => {
  const [startPath = '/'] = settings.paths
  const startUrl = new URL(startPath, settings.baseUrl).href
  try {
    const response = await siteRequest.get(startUrl, {
      failOnStatusCode: false,
      maxRedirects: 0,
      timeout: URL_CHECK_TIMEOUT_MS
    })
    await response.dispose()
  } catch (error) {
    const reason = error instanceof Error ? (error.message.split('\n')[0] ?? '') : String(error)
    const isCertificateRefusal = CERTIFICATE_REASON.test(reason)
    const advice = isCertificateRefusal
      ? ' Set the target\'s "ignoreHttpsErrors" to true to accept the site\'s certificate.'
      : ''
    throw new E2eConfigurationError(
      `The ${settings.target} target did not answer at ${startUrl}: ${reason}.${advice}`
    )
  }
}
