import { expect, test } from '@playwright/test'
import { HTTP_ERROR_STATUS } from '../constants.ts'
import { followFirstSiteLink } from '../fixtures/followFirstSiteLink.ts'
import { openSitePage } from '../fixtures/openSitePage.ts'
import { readUrlStatus } from '../fixtures/readUrlStatus.ts'
import { E2eStage } from './E2eStage.ts'
import { E2eWorkflowState } from './E2eWorkflowState.ts'

// A visitor clicks the first link to another page of the site, from the navigation when it has
// one, and lands on a working page. A page with no such link has nothing to follow, so the test is
// skipped rather than failed.
export class FollowSiteLinkStage extends E2eStage {
  public readonly title = 'Follow a site link'

  public override async setup(): Promise<E2eWorkflowState> {
    const { page, targetSettings } = this.runtime
    const [startPath = '/'] = targetSettings.paths
    return E2eWorkflowState.empty().withLoadedPage(await openSitePage(page, startPath))
  }

  public override async execute(state: E2eWorkflowState): Promise<E2eWorkflowState> {
    const { page, targetSettings, urlStatuses } = this.runtime
    const loadedPage = state.requireLoadedPage()

    const followedLink = await followFirstSiteLink(page, targetSettings.baseUrl)
    const hasFollowedLink = followedLink !== undefined
    test.skip(!hasFollowedLink, `${loadedPage.url} shows no link to another page of the site.`)
    if (!hasFollowedLink) return state

    expect(new URL(followedLink.to).origin, 'the link stays on the site').toBe(
      targetSettings.baseUrl
    )
    expect(
      await readUrlStatus(page, urlStatuses, followedLink.to),
      `${followedLink.to} answers without an error status`
    ).toBeLessThan(HTTP_ERROR_STATUS)
    await expect(page, `${followedLink.to} has a title`).toHaveTitle(/\S/)
    await expect(page.locator('body'), `${followedLink.to} renders content`).not.toBeEmpty()
    return state.withFollowedLink(followedLink)
  }
}
