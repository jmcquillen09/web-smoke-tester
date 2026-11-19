import type { ApiStageRuntime } from '../stages/ApiStageRuntime.ts'
import { targetTest } from './targetTest.ts'

interface ApiTestFixtures {
  /** The initial config every API stage is constructed with: this test's request and target. */
  readonly stageRuntime: ApiStageRuntime
}

// The API specs' `test`. It opens no page, so an API run needs no browser installed.
export const apiTest = targetTest.extend<ApiTestFixtures>({
  stageRuntime: async ({ request, targetSettings }, use) => {
    await use({ request, targetSettings })
  }
})
