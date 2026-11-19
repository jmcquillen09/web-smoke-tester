import type { APIRequestContext } from '@playwright/test'
import type { E2eTargetSettings } from '../E2eTargetSettings.ts'

// What a stage that only requests the site runs with. It holds no page, so it needs no browser.
export interface ApiStageRuntime {
  readonly request: APIRequestContext
  readonly targetSettings: E2eTargetSettings
}
