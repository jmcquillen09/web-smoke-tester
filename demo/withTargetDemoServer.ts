import type { E2eTargetSettings } from '../e2e/E2eTargetSettings.ts'
import { demoSite } from './demoSite.ts'
import { withDemoServer } from './withDemoServer.ts'

// Runs `work` with the demo site served at the target's address for the length of the run; a
// target that does not serve it runs `work` against whatever already answers there.
export const withTargetDemoServer = <T>(
  settings: Pick<E2eTargetSettings, 'baseUrl' | 'servesDemoSite'>,
  log: (message: string) => void,
  work: () => Promise<T>
): Promise<T> =>
  settings.servesDemoSite ? withDemoServer(demoSite, settings.baseUrl, log, work) : work()
