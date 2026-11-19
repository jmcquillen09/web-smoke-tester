import type { LoadedPage } from '../../e2e/fixtures/LoadedPage.ts'
import { E2eStage } from '../../e2e/stages/E2eStage.ts'
import type { E2eStageRuntime } from '../../e2e/stages/E2eStageRuntime.ts'
import { E2eWorkflowState } from '../../e2e/stages/E2eWorkflowState.ts'

type StagePhase = 'setup' | 'execute' | 'teardown'

export interface StageCall {
  readonly stage: string
  readonly phase: StagePhase
  /** The state the runner handed the phase; undefined for setup, which takes none. */
  readonly received: E2eWorkflowState | undefined
}

const pageAt = (path: string): LoadedPage => ({
  path,
  url: `https://site.example${path}`,
  status: 200,
  title: ''
})

// A stage that records each method call into `calls` and throws from each of `failingPhases`.
// Setup returns a state whose loaded page is at `/<title>:setup`; execute returns the state it
// received with the page at `/<title>:execute`. No runner test touches the Playwright runtime.
export const createRecordingStage = (
  title: string,
  calls: StageCall[],
  failingPhases: readonly StagePhase[] = []
): E2eStage => {
  const record = (phase: StagePhase, received?: E2eWorkflowState): void => {
    calls.push({ stage: title, phase, received })
    const isFailingPhase = failingPhases.includes(phase)
    if (isFailingPhase) throw new Error(`${title} ${phase} failed`)
  }

  class RecordingStage extends E2eStage {
    public readonly title = title

    public override async setup(): Promise<E2eWorkflowState> {
      record('setup')
      return E2eWorkflowState.empty().withLoadedPage(pageAt(`/${title}:setup`))
    }

    public override async execute(state: E2eWorkflowState): Promise<E2eWorkflowState> {
      record('execute', state)
      return state.withLoadedPage(pageAt(`/${title}:execute`))
    }

    public override async teardown(state: E2eWorkflowState): Promise<void> {
      record('teardown', state)
    }
  }

  return new RecordingStage({} as E2eStageRuntime)
}
