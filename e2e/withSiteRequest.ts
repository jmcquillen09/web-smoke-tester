import { type APIRequestContext, request } from '@playwright/test'
import type { E2eTargetSettings } from './E2eTargetSettings.ts'

// Runs `work` with a request context for the target's site, which accepts an invalid certificate
// when the target's `ignoreHttpsErrors` says so, and closes the context afterwards.
export const withSiteRequest = async <T>(
  settings: Pick<E2eTargetSettings, 'ignoreHttpsErrors'>,
  work: (siteRequest: APIRequestContext) => Promise<T>
): Promise<T> => {
  const siteRequest = await request.newContext({ ignoreHTTPSErrors: settings.ignoreHttpsErrors })
  try {
    return await work(siteRequest)
  } finally {
    await siteRequest.dispose()
  }
}
