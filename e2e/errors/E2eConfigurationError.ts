// Raised when the suite cannot run because its own inputs are wrong (an unknown target name, a
// malformed targets file), as opposed to a failure of the site that a spec is meant to catch.
export class E2eConfigurationError extends Error {
  override readonly name = 'E2eConfigurationError'
}
