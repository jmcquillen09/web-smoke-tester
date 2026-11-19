import { expect } from '@playwright/test'
import { findBrokenImages } from '../fixtures/findBrokenImages.ts'
import { readImageUrls } from '../fixtures/readImageUrls.ts'
import type { E2eWorkflowState } from './E2eWorkflowState.ts'
import { PageCheckStage } from './PageCheckStage.ts'

// Every image on the loaded page, lazy-loaded ones included, loads in the visitor's browser.
export class CheckImagesStage extends PageCheckStage {
  public readonly title = 'Check images'

  public override async execute(state: E2eWorkflowState): Promise<E2eWorkflowState> {
    const { page } = this.runtime
    const loadedPage = state.requireLoadedPage()
    const images = await readImageUrls(page)

    const broken = await findBrokenImages(page, images)

    expect(broken, `broken images on ${loadedPage.url}`).toEqual([])
    return state
  }
}
