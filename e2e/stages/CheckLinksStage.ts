import { expect } from '@playwright/test'
import { findBrokenLinks } from '../fixtures/findBrokenLinks.ts'
import { readSameSiteLinks } from '../fixtures/readSameSiteLinks.ts'
import type { E2eWorkflowState } from './E2eWorkflowState.ts'
import { PageCheckStage } from './PageCheckStage.ts'

// Every same-site link on the loaded page answers the visitor's browser without an error status.
export class CheckLinksStage extends PageCheckStage {
  public readonly title = 'Check links'

  public override async execute(state: E2eWorkflowState): Promise<E2eWorkflowState> {
    const { page, targetSettings, urlStatuses } = this.runtime
    const loadedPage = state.requireLoadedPage()
    const links = await readSameSiteLinks(page, targetSettings.baseUrl)

    const broken = await findBrokenLinks(page, urlStatuses, links)

    expect(broken, `broken links on ${loadedPage.url}`).toEqual([])
    return state
  }
}
