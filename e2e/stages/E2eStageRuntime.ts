import type { Page } from '@playwright/test'
import type { UrlStatuses } from '../fixtures/UrlStatuses.ts'
import type { ApiStageRuntime } from './ApiStageRuntime.ts'

// Stages share the primary page and can scope a second visitor to an isolated browser context.
export interface E2eStageRuntime extends ApiStageRuntime {
  readonly page: Page
  /** The link and image statuses this worker has already read. */
  readonly urlStatuses: UrlStatuses
  readonly withIsolatedRuntime: <T>(work: (runtime: E2eStageRuntime) => Promise<T>) => Promise<T>
}
