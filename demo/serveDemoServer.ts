import type { DemoServer } from './DemoServer.ts'
import { DemoServerError } from './errors/DemoServerError.ts'
import { startDemoServer } from './startDemoServer.ts'

// The host and port to listen on. A demo server speaks plain http on a port the address names.
const listenAddressOf = (demo: DemoServer, baseUrl: string): { host: string; port: number } => {
  const isUrl = URL.canParse(baseUrl)
  const isServable = isUrl && new URL(baseUrl).protocol === 'http:' && new URL(baseUrl).port !== ''
  if (!isServable) {
    throw new DemoServerError(
      `The ${demo.label} is served at an address like http://localhost:<port>; "${baseUrl}" is not one.`
    )
  }
  const { hostname, port } = new URL(baseUrl)
  return { host: hostname, port: Number(port) }
}

// Serves a demo server at `baseUrl` until the process is stopped, and says where it is. A port it
// cannot take ends the process with the reason.
export const serveDemoServer = async (
  command: string,
  demo: DemoServer,
  baseUrl: string
): Promise<void> => {
  try {
    const { host, port } = listenAddressOf(demo, baseUrl)
    await startDemoServer(demo, port, host)
    console.log(`${command}: the ${demo.label} is at ${baseUrl}. Ctrl+C stops it.`)
  } catch (error) {
    console.error(`${command}: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}
