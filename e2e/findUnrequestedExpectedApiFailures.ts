import type { ApiOperation } from './ApiOperation.ts'
import type { E2eTargetSettings } from './E2eTargetSettings.ts'

// The paths a target expects a failure on that the run does not request (a misspelled path, an
// operation the document dropped), each once and in the target's order; empty when there are none.
export const findUnrequestedExpectedApiFailures = (
  settings: Pick<E2eTargetSettings, 'expectedApiFailures'>,
  operations: readonly Pick<ApiOperation, 'path'>[]
): readonly string[] => {
  const requestedPaths = operations.map((operation) => operation.path)
  const isRequestedPath = (path: string): boolean => requestedPaths.includes(path)
  const unrequested = settings.expectedApiFailures
    .map((expected) => expected.path)
    .filter((path) => !isRequestedPath(path))
  return [...new Set(unrequested)]
}
