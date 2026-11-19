// The site threw an error nothing handled (an uncaught exception or an unhandled promise rejection)
// on a page the test drove: a defect in the site, reported even when the test's own steps passed.
export class E2eUncaughtPageError extends Error {
  override readonly name = 'E2eUncaughtPageError'
}
