import { expect } from '@playwright/test'
import { findSeoProblems } from '../fixtures/findSeoProblems.ts'
import type { E2eWorkflowState } from './E2eWorkflowState.ts'
import { PageCheckStage } from './PageCheckStage.ts'

// The loaded page has what search engines and link previews read: a title and a meta description.
export class CheckSeoStage extends PageCheckStage {
  public readonly title = 'Check SEO basics'

  public override async execute(state: E2eWorkflowState): Promise<E2eWorkflowState> {
    const loadedPage = state.requireLoadedPage()

    const problems = await findSeoProblems(this.runtime.page)

    expect(problems, `SEO problems on ${loadedPage.url}`).toEqual([])
    return state
  }
}
