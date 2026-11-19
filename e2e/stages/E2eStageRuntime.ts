import type { APIRequestContext, Page } from '@playwright/test'
import type { E2eTargetSettings } from '../E2eTargetSettings.ts'
import type { UrlStatuses } from '../fixtures/UrlStatuses.ts'

// Stages share the primary page and can scope a second visitor to an isolated browser context.
export interface E2eStageRuntime {
  readonly page: Page
  readonly request: APIRequestContext
  readonly targetSettings: E2eTargetSettings
  /** The link and image statuses this worker has already read. */
  readonly urlStatuses: UrlStatuses
  readonly withIsolatedRuntime: <T>(work: (runtime: E2eStageRuntime) => Promise<T>) => Promise<T>
}
