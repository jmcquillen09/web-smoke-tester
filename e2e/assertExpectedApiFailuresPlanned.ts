import type { ApiOperation } from './ApiOperation.ts'
import type { E2eTargetSettings } from './E2eTargetSettings.ts'
import { E2eConfigurationError } from './errors/E2eConfigurationError.ts'

// Stops a run whose target expects a failure on an operation the run does not request (a misspelled
// path, an operation the document dropped), so an expectation is never silently unused.
export const assertExpectedApiFailuresPlanned = (
  settings: Pick<E2eTargetSettings, 'target' | 'expectedApiFailures'>,
  operations: readonly Pick<ApiOperation, 'path'>[]
): void => {
  const plannedPaths = operations.map((operation) => operation.path)
  const unplanned = settings.expectedApiFailures
    .map((expected) => expected.path)
    .filter((path) => !plannedPaths.includes(path))
  const areAllPlanned = unplanned.length === 0
  if (!areAllPlanned) {
    throw new E2eConfigurationError(
      `The ${settings.target} target expects a failure on ${[...new Set(unplanned)].map((path) => `GET ${path}`).join(', ')}, which this run does not request. Requested: ${plannedPaths.map((path) => `GET ${path}`).join(', ')}.`
    )
  }
}
