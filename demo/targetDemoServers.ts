import type { E2eTargetSettings } from '../e2e/E2eTargetSettings.ts'
import { demoSite } from './demoSite.ts'
import type { DemoServer } from './DemoServer.ts'

// The demo server a target has served at its address for a run: one, or none for a site that is
// already running somewhere.
export const targetDemoServers = (
  settings: Pick<E2eTargetSettings, 'servesDemoSite'>
): readonly DemoServer[] => (settings.servesDemoSite ? [demoSite] : [])
