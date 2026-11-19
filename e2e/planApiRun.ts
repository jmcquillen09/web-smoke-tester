import type { APIRequestContext } from '@playwright/test'
import type { ApiOperation } from './ApiOperation.ts'
import { discoverOpenApiDocument } from './discoverOpenApiDocument.ts'
import type { E2eTargetSettings } from './E2eTargetSettings.ts'
import { E2eApiDocumentError } from './errors/E2eApiDocumentError.ts'
import { fetchOpenApiDocument } from './fetchOpenApiDocument.ts'
import { findUnrequestedExpectedApiFailures } from './findUnrequestedExpectedApiFailures.ts'
import { planApiOperations } from './planApiOperations.ts'

// The operations the API tests of a run request, from the site's OpenAPI document. `log` is told
// them, each operation left out, and each expected failure that names none of them.
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
  for (const path of findUnrequestedExpectedApiFailures(settings, plan.operations)) {
    log(
      `ignoring the expected failure on GET ${path}: the ${settings.target} target names it in expectedApiFailures, but this run does not request it`
    )
  }
  return plan.operations
}
