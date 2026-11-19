import { openSitePage } from '../fixtures/openSitePage.ts'
import { E2eStage } from './E2eStage.ts'
import type { E2eStageRuntime } from './E2eStageRuntime.ts'
import { E2eWorkflowState } from './E2eWorkflowState.ts'

// A stage that checks one already-loaded page. Run alone, it opens `path` first; in a workflow it
// checks the page the stage before it left loaded.
export abstract class PageCheckStage extends E2eStage {
  /** The page an isolated run opens, as a path from the site's root. */
  protected readonly path: string

  constructor(runtime: E2eStageRuntime, path: string) {
    super(runtime)
    this.path = path
  }

  public override async setup(): Promise<E2eWorkflowState> {
    return E2eWorkflowState.empty().withLoadedPage(await openSitePage(this.runtime.page, this.path))
  }
}
