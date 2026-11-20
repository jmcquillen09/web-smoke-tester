import type { SiteAnswer } from './withSiteAnswering.ts'

export const textAnswer =
  (body: string, contentType = 'text/plain'): SiteAnswer =>
  (response) => {
    response.writeHead(200, { 'content-type': contentType }).end(body)
  }
