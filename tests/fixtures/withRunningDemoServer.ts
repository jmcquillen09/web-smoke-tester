import type { AddressInfo } from 'node:net'
import type { DemoServer } from '../../demo/DemoServer.ts'
import { startDemoServer } from '../../demo/startDemoServer.ts'
import { stopDemoServer } from '../../demo/stopDemoServer.ts'

const HOST = '127.0.0.1'

// Serves a demo server on a free port for one test and hands it the server's address.
export const withRunningDemoServer = async (
  demo: DemoServer,
  work: (baseUrl: string) => Promise<void>
): Promise<void> => {
  const server = await startDemoServer(demo, 0, HOST)
  const { port } = server.address() as AddressInfo
  try {
    await work(`http://${HOST}:${String(port)}`)
  } finally {
    await stopDemoServer(demo, server)
  }
}
