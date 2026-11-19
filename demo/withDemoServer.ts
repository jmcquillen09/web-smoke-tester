import type { DemoServer } from './DemoServer.ts'
import { startDemoServer } from './startDemoServer.ts'
import { stopDemoServer } from './stopDemoServer.ts'

// Serves a demo server at `baseUrl` for as long as `work` runs: `work` starts once the server is
// listening, and this resolves only once the server has shut down, however `work` ended.
export const withDemoServer = async <T>(
  demo: DemoServer,
  baseUrl: string,
  log: (message: string) => void,
  work: () => Promise<T>
): Promise<T> => {
  const { hostname, port } = new URL(baseUrl)
  const server = await startDemoServer(demo, Number(port), hostname)
  try {
    log(`the ${demo.label} is running at ${baseUrl}`)
    return await work()
  } finally {
    await stopDemoServer(demo, server)
    log(`the ${demo.label} has shut down`)
  }
}
