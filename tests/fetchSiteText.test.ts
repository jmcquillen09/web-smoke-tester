import assert from 'node:assert/strict'
import test from 'node:test'

import { fetchSiteText as fetchSiteTextWith } from '../e2e/fetchSiteText.ts'
import { withSiteRequest } from '../e2e/withSiteRequest.ts'
import { redirectAnswer } from './fixtures/redirectAnswer.ts'
import { textAnswer } from './fixtures/textAnswer.ts'
import { withSiteAnswering } from './fixtures/withSiteAnswering.ts'

const anyType = (): boolean => true

const fetchSiteText = (
  url: string,
  accept: string,
  isWantedType: (contentType: string) => boolean
): ReturnType<typeof fetchSiteTextWith> =>
  withSiteRequest({ ignoreHttpsErrors: false }, (siteRequest) =>
    fetchSiteTextWith(siteRequest, url, accept, isWantedType)
  )

void test('an OK answer of a wanted content type is read', async () => {
  await withSiteAnswering(
    () => ({ '/page': textAnswer('hello', 'text/html; charset=utf-8') }),
    async (origin) => {
      const isHtml = (contentType: string): boolean => contentType.includes('text/html')

      assert.deepEqual(await fetchSiteText(`${origin}/page`, 'text/html', isHtml), {
        url: `${origin}/page`,
        text: 'hello'
      })
    }
  )
})

void test('an error status and an unwanted content type are no text', async () => {
  await withSiteAnswering(
    () => ({ '/file': textAnswer('%PDF', 'application/pdf') }),
    async (origin) => {
      const isHtml = (contentType: string): boolean => contentType.includes('text/html')

      assert.equal(await fetchSiteText(`${origin}/missing`, 'text/html', anyType), undefined)
      assert.equal(await fetchSiteText(`${origin}/file`, 'text/html', isHtml), undefined)
    }
  )
})

void test('a redirect on the same site is followed to the address that answers', async () => {
  await withSiteAnswering(
    () => ({ '/old': redirectAnswer('/new'), '/new': textAnswer('moved here') }),
    async (origin) => {
      assert.deepEqual(await fetchSiteText(`${origin}/old`, 'text/plain', anyType), {
        url: `${origin}/new`,
        text: 'moved here'
      })
    }
  )
})

void test('a redirect to an address that may end a session is never requested', async () => {
  await withSiteAnswering(
    () => ({
      '/docs': redirectAnswer('/session/logout'),
      '/session/logout': textAnswer('signed out')
    }),
    async (origin, requested) => {
      assert.equal(await fetchSiteText(`${origin}/docs`, 'text/plain', anyType), undefined)
      assert.deepEqual(requested, ['/docs'])
    }
  )
})

void test('a redirect to another site is never requested', async () => {
  await withSiteAnswering(
    () => ({ '/landing': textAnswer('another site') }),
    async (otherOrigin, otherRequested) => {
      await withSiteAnswering(
        () => ({ '/docs': redirectAnswer(`${otherOrigin}/landing`) }),
        async (origin) => {
          assert.equal(await fetchSiteText(`${origin}/docs`, 'text/plain', anyType), undefined)
          assert.deepEqual(otherRequested, [])
        }
      )
    }
  )
})

void test('a site that only ever redirects is given up on', async () => {
  await withSiteAnswering(
    () => ({ '/loop': redirectAnswer('/loop') }),
    async (origin, requested) => {
      assert.equal(await fetchSiteText(`${origin}/loop`, 'text/plain', anyType), undefined)
      assert.equal(requested.length, 6)
    }
  )
})

void test('an address that never answers is no text', async () => {
  let closedOrigin = ''
  await withSiteAnswering(
    () => ({}),
    async (origin) => {
      closedOrigin = origin
    }
  )

  assert.equal(await fetchSiteText(`${closedOrigin}/page`, 'text/plain', anyType), undefined)
})
