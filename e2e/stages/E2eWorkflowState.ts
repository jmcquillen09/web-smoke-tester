import { E2eFixtureError } from '../errors/E2eFixtureError.ts'
import type { ApiAnswer } from '../fixtures/ApiAnswer.ts'
import type { FollowedLink } from '../fixtures/FollowedLink.ts'
import type { LoadedPage } from '../fixtures/LoadedPage.ts'

interface E2eWorkflowStateValues {
  readonly loadedPage?: LoadedPage
  readonly followedLink?: FollowedLink
  readonly apiAnswer?: ApiAnswer
}

// One run's state, owned by the workflow engine and threaded through its stages. Each with* call
// returns a copy, and a require* call fails when the state has no such value.
export class E2eWorkflowState {
  readonly #values: E2eWorkflowStateValues

  private constructor(values: E2eWorkflowStateValues) {
    this.#values = values
  }

  static empty(): E2eWorkflowState {
    return new E2eWorkflowState({})
  }

  withLoadedPage(loadedPage: LoadedPage): E2eWorkflowState {
    return new E2eWorkflowState({ ...this.#values, loadedPage })
  }

  requireLoadedPage(): LoadedPage {
    const loadedPage = this.#values.loadedPage
    const hasLoadedPage = loadedPage !== undefined
    if (!hasLoadedPage) throw new E2eFixtureError('The run state has no loaded page.')
    return loadedPage
  }

  withFollowedLink(followedLink: FollowedLink): E2eWorkflowState {
    return new E2eWorkflowState({ ...this.#values, followedLink })
  }

  requireFollowedLink(): FollowedLink {
    const followedLink = this.#values.followedLink
    const hasFollowedLink = followedLink !== undefined
    if (!hasFollowedLink) throw new E2eFixtureError('The run state has no followed link.')
    return followedLink
  }

  withApiAnswer(apiAnswer: ApiAnswer): E2eWorkflowState {
    return new E2eWorkflowState({ ...this.#values, apiAnswer })
  }

  requireApiAnswer(): ApiAnswer {
    const apiAnswer = this.#values.apiAnswer
    const hasApiAnswer = apiAnswer !== undefined
    if (!hasApiAnswer) throw new E2eFixtureError('The run state has no API answer.')
    return apiAnswer
  }
}
