import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'

// A port on 127.0.0.1 nothing listens on: one the system just handed out and took back.
export const findFreePort = async (): Promise<number> => {
  const server = createServer()
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  await new Promise<void>((resolve) => server.close(() => resolve()))
  return port
}
