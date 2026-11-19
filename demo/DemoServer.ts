import type { Server } from 'node:http'

// One of the bundled demo servers a run can start for itself and shut down again.
export interface DemoServer {
  /** What the server is called in a run's output and in an error: `demo API`. */
  readonly label: string
  /** Builds the server without starting it; the caller chooses the port with `listen`. */
  readonly create: () => Server
  /** The script that serves it until stopped, as a path from the repo root; it takes an address. */
  readonly script: string
}
