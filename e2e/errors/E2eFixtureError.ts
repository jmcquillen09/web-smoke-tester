// A fixture could not reach the state a spec starts from (a page that would not open, a run state
// with no value to read): a setup failure, distinct from an assertion failure.
export class E2eFixtureError extends Error {
  override readonly name = 'E2eFixtureError'
}
