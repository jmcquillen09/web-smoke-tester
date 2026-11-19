import type { E2eStageRuntime } from './E2eStageRuntime.ts'
import type { E2eWorkflowState } from './E2eWorkflowState.ts'

// One node of the e2e DAG. The workflow engine owns the run's state and hands it to execute, so a
// stage never knows whether it runs isolated or inside a workflow.
export abstract class E2eStage {
  /** The initial config: this test's page, request and target. */
  protected readonly runtime: E2eStageRuntime

  constructor(runtime: E2eStageRuntime) {
    this.runtime = runtime
  }

  /** Names the stage's steps in the Playwright report. */
  public abstract readonly title: string
  /** Builds the state the stage starts from, through the shared state primitives, to run it alone. */
  public abstract setup(): Promise<E2eWorkflowState>
  /** Drives and checks the feature under test from `state`, and returns the new state. */
  public abstract execute(state: E2eWorkflowState): Promise<E2eWorkflowState>
  /** Clears the local side effects of an isolated run; `state` is what setup built. */
  public async teardown(_state: E2eWorkflowState): Promise<void> {}
}
