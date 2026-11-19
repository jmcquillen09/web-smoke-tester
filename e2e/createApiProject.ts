import type { PlaywrightTestProject } from '@playwright/test'
import { API_PROJECT } from './constants.ts'

// The one project that holds the API specs under e2e/api/. They request the API directly, so the
// project names no browser and a run of it launches none.
export const createApiProject = (): PlaywrightTestProject => ({
  name: API_PROJECT,
  testMatch: 'api/**/*.spec.ts'
})
