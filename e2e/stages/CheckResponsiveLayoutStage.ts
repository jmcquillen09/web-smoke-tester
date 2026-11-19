import { expect } from '@playwright/test'
import { LAYOUT_SETTLE_TIMEOUT_MS, OVERFLOW_TOLERANCE_PX } from '../constants.ts'
import { hasViewportMetaTag } from '../fixtures/hasViewportMetaTag.ts'
import { readHorizontalOverflow } from '../fixtures/readHorizontalOverflow.ts'
import type { E2eStageRuntime } from './E2eStageRuntime.ts'
import type { E2eWorkflowState } from './E2eWorkflowState.ts'
import { PageCheckStage } from './PageCheckStage.ts'
import type { ResponsiveViewport } from './ResponsiveViewport.ts'

// On one screen, the loaded page fits its viewport's width: nothing forces a visitor to scroll
// sideways. On a phone or tablet it also declares a viewport; without one the device lays the page
// out at desktop width and shrinks it, which no width measurement shows.
export class CheckResponsiveLayoutStage extends PageCheckStage {
  public readonly title: string
  readonly #viewport: ResponsiveViewport

  constructor(runtime: E2eStageRuntime, path: string, viewport: ResponsiveViewport) {
    super(runtime, path)
    this.#viewport = viewport
    this.title = `Check the ${viewport.name} layout`
  }

  public override async execute(state: E2eWorkflowState): Promise<E2eWorkflowState> {
    const { page } = this.runtime
    const loadedPage = state.requireLoadedPage()
    const { name, width, height, device } = this.#viewport
    await page.setViewportSize({ width, height })

    const isHandheld = device !== undefined
    if (isHandheld) {
      expect(
        await hasViewportMetaTag(page),
        `${loadedPage.url} has a viewport meta tag for a ${name}`
      ).toBe(true)
    }

    await expect
      .poll(() => readHorizontalOverflow(page), {
        message: `${loadedPage.url} is wider than a ${String(width)}px ${name} screen, in pixels`,
        timeout: LAYOUT_SETTLE_TIMEOUT_MS
      })
      .toBeLessThanOrEqual(OVERFLOW_TOLERANCE_PX)
    return state
  }
}
