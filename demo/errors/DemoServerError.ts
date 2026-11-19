// Raised when a bundled demo server cannot start or does not shut down cleanly.
export class DemoServerError extends Error {
  override readonly name = 'DemoServerError'
}
