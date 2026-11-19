import type { Server } from 'node:http'
import { createDemoApiServer } from './createDemoApiServer.ts'
import { DemoApiError } from './errors/DemoApiError.ts'

// Starts the demo API and resolves once it is listening, so the first request cannot arrive early.
// A port it cannot take (one already in use) rejects with the reason.
export const startDemoApiServer = (port: number, host: string): Promise<Server> =>
  new Promise((resolve, reject) => {
    const server = createDemoApiServer()
    server.once('error', (error) => {
      reject(
        new DemoApiError(
          `The demo API could not start on ${host}:${String(port)}: ${error.message}`,
          { cause: error }
        )
      )
    })
    server.listen(port, host, () => {
      resolve(server)
    })
  })
