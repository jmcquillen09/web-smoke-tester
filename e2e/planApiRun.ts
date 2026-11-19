import type { APIRequestContext } from '@playwright/test'
import type { ApiOperation } from './ApiOperation.ts'
import { assertExpectedApiFailuresPlanned } from './assertExpectedApiFailuresPlanned.ts'
import { discoverOpenApiDocument } from './discoverOpenApiDocument.ts'
import type { E2eTargetSettings } from './E2eTargetSettings.ts'
import { E2eApiDocumentError } from './errors/E2eApiDocumentError.ts'
import { fetchOpenApiDocument } from './fetchOpenApiDocument.ts'
import { planApiOperations } from './planApiOperations.ts'

// The operations the API tests of a run request, from the site's OpenAPI document, announced
// through `log` with every operation left out. A site with no document to test raises E2eApiDocumentError.
export const planApiRun = async (
  settings: Pick<E2eTargetSettings, 'target' | 'baseUrl' | 'apiSpecPaths' | 'expectedApiFailures'>,
  siteRequest: APIRequestContext,
  log: (message: string) => void
): Promise<readonly ApiOperation[]> => {
  const discovered = await discoverOpenApiDocument(settings, (url) =>
    fetchOpenApiDocument(siteRequest, url)
  )
  const plan = planApiOperations(discovered.document, discovered.url)
  log(
    `testing ${String(plan.operations.length)} GET operation(s) from ${discovered.url} (${settings.target})`
  )
  for (const { path, reason } of plan.skipped) log(`skipping GET ${path}: ${reason}`)
  const hasOperations = plan.operations.length > 0
  if (!hasOperations) {
    throw new E2eApiDocumentError(
      `The ${settings.target} target's document at ${discovered.url} has no GET operation a run can request.`
    )
  }
  assertExpectedApiFailuresPlanned(settings, plan.operations)
  return plan.operations
}
