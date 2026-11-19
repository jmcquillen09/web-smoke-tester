import { test as base } from '@playwright/test'
import { activeE2eTarget } from '../activeE2eTarget.ts'
import type { E2eTargetSettings } from '../E2eTargetSettings.ts'

interface TargetWorkerFixtures {
  readonly targetSettings: E2eTargetSettings
}

// What every spec's `test` is built on: the target the run tests, and nothing that needs a browser.
export const targetTest = base.extend<object, TargetWorkerFixtures>({
  targetSettings: [activeE2eTarget(), { option: true, scope: 'worker' }]
})
