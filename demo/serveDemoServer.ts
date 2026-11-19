import type { DemoServer } from './DemoServer.ts'
import { startDemoServer } from './startDemoServer.ts'

// Serves a demo server until the process is stopped, for exploring it by hand, and says where it is.
// A port it cannot take ends the process with the reason.
export const serveDemoServer = async (
  command: string,
  demo: DemoServer,
  host: string,
  port: number
): Promise<void> => {
  try {
    await startDemoServer(demo, port, host)
    console.log(
      `${command}: the ${demo.label} is at http://${host}:${String(port)}. Ctrl+C stops it.`
    )
  } catch (error) {
    console.error(`${command}: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}
