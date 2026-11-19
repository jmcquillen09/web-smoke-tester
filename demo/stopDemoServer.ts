import type { Server } from 'node:http'
import type { DemoServer } from './DemoServer.ts'
import { DemoServerError } from './errors/DemoServerError.ts'

// Stops a demo server and resolves only once it has shut down completely: it no longer listens and
// every connection to it has ended. Idle keep-alive connections are closed rather than waited for.
export const stopDemoServer = (demo: DemoServer, server: Server): Promise<void> =>
  new Promise((resolve, reject) => {
    server.close((error) => {
      const hasShutDown = error === undefined && !server.listening
      if (hasShutDown) resolve()
      else {
        reject(
          new DemoServerError(
            `The ${demo.label} did not shut down cleanly: ${error?.message ?? 'it is still listening'}`
          )
        )
      }
    })
    server.closeAllConnections()
  })
