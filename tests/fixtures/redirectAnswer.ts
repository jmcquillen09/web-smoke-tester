import type { SiteAnswer } from './withSiteAnswering.ts'

export const redirectAnswer =
  (location: string): SiteAnswer =>
  (response) => {
    response.writeHead(302, { location }).end()
  }
