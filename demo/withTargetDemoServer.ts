import type { E2eTargetSettings } from '../e2e/E2eTargetSettings.ts'
import { demoApi } from './demoApi.ts'
import { demoSite } from './demoSite.ts'
import { withDemoServer } from './withDemoServer.ts'

// Runs `work` with the demo server the target names served at its address for the length of the
// run; a target that names none runs `work` against whatever already answers there.
export const withTargetDemoServer = <T>(
  settings: Pick<E2eTargetSettings, 'baseUrl' | 'servesDemoApi' | 'servesDemoSite'>,
  log: (message: string) => void,
  work: () => Promise<T>
): Promise<T> => {
  if (settings.servesDemoApi) return withDemoServer(demoApi, settings.baseUrl, log, work)
  if (settings.servesDemoSite) return withDemoServer(demoSite, settings.baseUrl, log, work)
  return work()
}
