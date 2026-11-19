import { devices, type PlaywrightTestProject } from '@playwright/test'
import { API_PROJECT } from './constants.ts'

// The one project that holds the API specs under e2e/api/. They request the API directly, so the
// browser is only the suite's shared `test` opening its page; one browser is enough.
export const createApiProject = (): PlaywrightTestProject => ({
  name: API_PROJECT,
  testMatch: 'api/**/*.spec.ts',
  use: devices['Desktop Chrome']
})
