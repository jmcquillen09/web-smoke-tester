import type { Server as HttpServer } from 'node:http'
import type { Server as HttpsServer } from 'node:https'
import type { AddressInfo } from 'node:net'

// Has `server` listen on a free port of `host` for one test, hands the test the server's origin,
// and shuts the server down once the test is done, closing connections still open.
export const withServerListening = async (
  server: HttpServer | HttpsServer,
  protocol: 'http' | 'https',
  host: string,
  work: (origin: string) => Promise<void>
): Promise<void> => {
  await new Promise<void>((resolve) => server.listen(0, host, resolve))
  try {
    await work(`${protocol}://${host}:${String((server.address() as AddressInfo).port)}`)
  } finally {
    server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}
