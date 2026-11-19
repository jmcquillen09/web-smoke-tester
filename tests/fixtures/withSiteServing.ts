import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'

const HOST = '127.0.0.1'
const PAGE = '<!doctype html><title>A site</title><h1>A site</h1>'

// Serves a one-page site for one test and hands it the site's address. Each path in `documents`
// answers with its value as JSON; every other path answers with the page.
export const withSiteServing = async (
  documents: Readonly<Record<string, object>>,
  work: (baseUrl: string) => Promise<void>
): Promise<void> => {
  const server = createServer((request, response) => {
    const path = request.url ?? ''
    const hasDocument = Object.hasOwn(documents, path)
    if (hasDocument) {
      response
        .writeHead(200, { 'content-type': 'application/json' })
        .end(JSON.stringify(documents[path]))
    } else {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(PAGE)
    }
  })
  await new Promise<void>((resolve) => server.listen(0, HOST, resolve))
  try {
    await work(`http://${HOST}:${String((server.address() as AddressInfo).port)}`)
  } finally {
    server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}
