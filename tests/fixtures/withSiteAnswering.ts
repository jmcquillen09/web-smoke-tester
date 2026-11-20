import { createServer, type ServerResponse } from 'node:http'

import { withServerListening } from './withServerListening.ts'

const HOST = '127.0.0.1'

export type SiteAnswer = (response: ServerResponse) => void

// Serves a site as a map from path to answer for one test, and records each path requested. A path
// the map lacks answers 404.
export const withSiteAnswering = async (
  answers: (origin: string) => Record<string, SiteAnswer>,
  work: (origin: string, requested: string[]) => Promise<void>
): Promise<void> => {
  const requested: string[] = []
  let routes: Record<string, SiteAnswer> = {}
  const server = createServer((request, response) => {
    const path = request.url ?? ''
    requested.push(path)
    const answer = routes[path] ?? ((missing: ServerResponse) => missing.writeHead(404).end())
    answer(response)
  })
  await withServerListening(server, 'http', HOST, async (origin) => {
    routes = answers(origin)
    await work(origin, requested)
  })
}
