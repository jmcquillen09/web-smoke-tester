import type { Server } from 'node:http'
import { DemoApiError } from './errors/DemoApiError.ts'

// Stops the demo API and resolves only once it has shut down completely: it no longer listens and
// every connection to it has ended. Idle keep-alive connections are closed rather than waited for.
export const stopDemoApiServer = (server: Server): Promise<void> =>
  new Promise((resolve, reject) => {
    server.close((error) => {
      const hasShutDown = error === undefined && !server.listening
      if (hasShutDown) resolve()
      else {
        reject(
          new DemoApiError(
            `The demo API did not shut down cleanly: ${error?.message ?? 'it is still listening'}`
          )
        )
      }
    })
    server.closeAllConnections()
  })
