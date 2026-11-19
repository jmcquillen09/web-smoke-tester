import type { DemoServer } from './DemoServer.ts'
import { DemoServerError } from './errors/DemoServerError.ts'
import { startDemoServer } from './startDemoServer.ts'

// Where to listen. A demo server speaks plain http on a port the address names; the address given
// is never printed back, since it may carry a password.
const listenAddressOf = (demo: DemoServer, baseUrl: string): URL => {
  const isUrl = URL.canParse(baseUrl)
  const address = isUrl ? new URL(baseUrl) : new URL('about:blank')
  const isServable =
    address.protocol === 'http:' &&
    address.port !== '' &&
    address.username === '' &&
    address.password === ''
  if (!isServable) {
    throw new DemoServerError(
      `The ${demo.label} is served at an address like http://localhost:<port>, with no user name or password; the address given is not one.`
    )
  }
  return address
}

// Serves a demo server at `baseUrl` until the process is stopped, and says where it is. A port it
// cannot take ends the process with the reason.
export const serveDemoServer = async (
  command: string,
  demo: DemoServer,
  baseUrl: string
): Promise<void> => {
  try {
    const address = listenAddressOf(demo, baseUrl)
    await startDemoServer(demo, Number(address.port), address.hostname)
    console.log(`${command}: the ${demo.label} is at ${address.origin}. Ctrl+C stops it.`)
  } catch (error) {
    console.error(`${command}: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}
