import type { E2eTargetDefinition } from './E2eTargetsFile.ts'
import { E2eConfigurationError } from './errors/E2eConfigurationError.ts'

// The one check that stops a run against a target that is named but switched off, with its reason.
export const assertRunnableTarget = (name: string, definition: E2eTargetDefinition): void => {
  const reason = definition.disabled ?? ''
  const isDisabled = reason !== ''
  if (isDisabled) {
    throw new E2eConfigurationError(`Refusing the ${name} target: ${reason}.`)
  }
}
