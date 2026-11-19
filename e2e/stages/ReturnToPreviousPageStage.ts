import { expect, test } from '@playwright/test'
import { followFirstSiteLink } from '../fixtures/followFirstSiteLink.ts'
import { openSitePage } from '../fixtures/openSitePage.ts'
import { E2eStage } from './E2eStage.ts'
import { E2eWorkflowState } from './E2eWorkflowState.ts'

// After following a link, a visitor presses Back and is on the page they came from, rendered again.
export class ReturnToPreviousPageStage extends E2eStage {
  public readonly title = 'Return to the previous page'

  public override async setup(): Promise<E2eWorkflowState> {
    const { page, targetSettings } = this.runtime
    const [startPath = '/'] = targetSettings.paths
    const loadedPage = await openSitePage(page, startPath)
    const followedLink = await followFirstSiteLink(page, targetSettings.baseUrl)
    const hasFollowedLink = followedLink !== undefined
    test.skip(!hasFollowedLink, `${loadedPage.url} shows no link to another page of the site.`)
    const state = E2eWorkflowState.empty().withLoadedPage(loadedPage)
    return hasFollowedLink ? state.withFollowedLink(followedLink) : state
  }

  public override async execute(state: E2eWorkflowState): Promise<E2eWorkflowState> {
    const { page } = this.runtime
    const followedLink = state.requireFollowedLink()

    await page.goBack({ waitUntil: 'load' })

    await expect(page, 'Back returns to the page the link was on').toHaveURL(followedLink.from)
    await expect(page.locator('body'), `${followedLink.from} renders content`).not.toBeEmpty()
    return state
  }
}
