import { expect } from '@playwright/test'
import { findAccessibilityProblems } from '../fixtures/findAccessibilityProblems.ts'
import type { E2eWorkflowState } from './E2eWorkflowState.ts'
import { PageCheckStage } from './PageCheckStage.ts'

// The loaded page meets the accessibility basics: a document language, one <h1>, alt text on
// images and a label on every form field.
export class CheckAccessibilityStage extends PageCheckStage {
  public readonly title = 'Check accessibility basics'

  public override async execute(state: E2eWorkflowState): Promise<E2eWorkflowState> {
    const loadedPage = state.requireLoadedPage()

    const problems = await findAccessibilityProblems(this.runtime.page)

    expect(problems, `accessibility problems on ${loadedPage.url}`).toEqual([])
    return state
  }
}
