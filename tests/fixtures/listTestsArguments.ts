// Has Playwright name the tests without opening a browser. The list reporter alone keeps a run out of
// the report folders every other run in the repo root shares, which test files running at once race on.
export const listTestsArguments: readonly string[] = ['--list', '--reporter=list']
