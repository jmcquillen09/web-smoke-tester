// Runs one titled step of a test and returns what its body returns; Playwright's `test.step` in a
// spec.
export type E2eStepRunner = <T>(title: string, body: () => Promise<T>) => Promise<T>
