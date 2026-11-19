import { activeE2eTarget } from './activeE2eTarget.ts'
import { assertSiteAnswers } from './assertSiteAnswers.ts'
import { withSiteRequest } from './withSiteRequest.ts'

// Checks once, before any test starts, that the site answers at all, so a site that does not stops
// the run with one clear reason instead of a timeout in every test.
export default async function globalSetup(): Promise<void> {
  const settings = activeE2eTarget()
  await withSiteRequest(settings, (siteRequest) => assertSiteAnswers(settings, siteRequest))
}
