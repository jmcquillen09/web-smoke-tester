import { createDemoSiteServer } from './createDemoSiteServer.ts'
import type { DemoServer } from './DemoServer.ts'

// The demo site as a server a run can start: what the page checks are proven against.
export const demoSite: DemoServer = { label: 'demo site', create: createDemoSiteServer }
