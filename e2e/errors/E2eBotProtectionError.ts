// The site's bot protection stood between the test and the site: it served a bot check in a page's
// place, or its own request failed. Reported apart from failures of the site's own pages.
export class E2eBotProtectionError extends Error {
  override readonly name = 'E2eBotProtectionError'
}
