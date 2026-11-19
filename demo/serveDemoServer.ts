import type { DemoServer } from './DemoServer.ts'
import { startDemoServer } from './startDemoServer.ts'

// Serves a demo server at `baseUrl` until the process is stopped, and says where it is. A port it
// cannot take ends the process with the reason.
export const serveDemoServer = async (
  command: string,
  demo: DemoServer,
  baseUrl: string
): Promise<void> => {
  try {
    const { hostname, port } = new URL(baseUrl)
    await startDemoServer(demo, Number(port), hostname)
    console.log(`${command}: the ${demo.label} is at ${baseUrl}. Ctrl+C stops it.`)
  } catch (error) {
    console.error(`${command}: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}
