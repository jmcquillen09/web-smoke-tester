import { createDemoApiServer } from './createDemoApiServer.ts'
import type { DemoServer } from './DemoServer.ts'

// The demo API as a server a run can start: what the API checks are proven against.
export const demoApi: DemoServer = {
  label: 'demo API',
  create: createDemoApiServer,
  script: 'scripts/serveDemoApi.ts'
}
