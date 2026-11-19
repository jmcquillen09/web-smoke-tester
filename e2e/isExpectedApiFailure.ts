import type { ApiCheck } from './ApiCheck.ts'
import type { ApiOperation } from './ApiOperation.ts'
import type { E2eTargetSettings } from './E2eTargetSettings.ts'

// Whether the target expects this check to fail on this operation: a known defect of the API, which
// the report then shows as an expected failure and which fails the run once it stops failing.
export const isExpectedApiFailure = (
  settings: Pick<E2eTargetSettings, 'expectedApiFailures'>,
  operation: Pick<ApiOperation, 'path'>,
  check: ApiCheck
): boolean =>
  settings.expectedApiFailures.some(
    (expected) => expected.path === operation.path && expected.check === check
  )
