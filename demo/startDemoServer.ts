import type { Server } from 'node:http'
import type { DemoServer } from './DemoServer.ts'
import { DemoServerError } from './errors/DemoServerError.ts'

// Starts a demo server and resolves once it is listening, so the first request cannot arrive early.
// A port it cannot take (one already in use) rejects with the reason.
export const startDemoServer = (demo: DemoServer, port: number, host: string): Promise<Server> =>
  new Promise((resolve, reject) => {
    const server = demo.create()
    server.once('error', (error) => {
      reject(
        new DemoServerError(
          `The ${demo.label} could not start on ${host}:${String(port)}: ${error.message}`,
          { cause: error }
        )
      )
    })
    server.listen(port, host, () => {
      resolve(server)
    })
  })
