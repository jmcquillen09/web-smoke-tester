// Raised when the bundled demo API cannot start or does not shut down cleanly.
export class DemoApiError extends Error {
  override readonly name = 'DemoApiError'
}
