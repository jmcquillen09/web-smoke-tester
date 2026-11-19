import assert from 'node:assert/strict'
import { createServer, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import test from 'node:test'

import { fetchSiteText } from '../e2e/fetchSiteText.ts'

const HOST = '127.0.0.1'
const anyType = (): boolean => true

type Answer = (response: ServerResponse) => void

const redirectTo =
  (location: string): Answer =>
  (response) => {
    response.writeHead(302, { location }).end()
  }

const textOf =
  (body: string, contentType = 'text/plain'): Answer =>
  (response) => {
    response.writeHead(200, { 'content-type': contentType }).end(body)
  }

// Serves a site as a map from path to answer for one test, and records each path requested.
const withSite = async (
  answers: (origin: string) => Record<string, Answer>,
  work: (origin: string, requested: string[]) => Promise<void>
): Promise<void> => {
  const requested: string[] = []
  let routes: Record<string, Answer> = {}
  const server = createServer((request, response) => {
    const path = request.url ?? ''
    requested.push(path)
    const answer = routes[path] ?? ((missing: ServerResponse) => missing.writeHead(404).end())
    answer(response)
  })
  await new Promise<void>((resolve) => server.listen(0, HOST, resolve))
  const origin = `http://${HOST}:${String((server.address() as AddressInfo).port)}`
  routes = answers(origin)
  try {
    await work(origin, requested)
  } finally {
    server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

void test('an OK answer of a wanted content type is read', async () => {
  await withSite(
    () => ({ '/page': textOf('hello', 'text/html; charset=utf-8') }),
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
  await withSite(
    () => ({ '/file': textOf('%PDF', 'application/pdf') }),
    async (origin) => {
      const isHtml = (contentType: string): boolean => contentType.includes('text/html')

      assert.equal(await fetchSiteText(`${origin}/missing`, 'text/html', anyType), undefined)
      assert.equal(await fetchSiteText(`${origin}/file`, 'text/html', isHtml), undefined)
    }
  )
})

void test('a redirect on the same site is followed to the address that answers', async () => {
  await withSite(
    () => ({ '/old': redirectTo('/new'), '/new': textOf('moved here') }),
    async (origin) => {
      assert.deepEqual(await fetchSiteText(`${origin}/old`, 'text/plain', anyType), {
        url: `${origin}/new`,
        text: 'moved here'
      })
    }
  )
})

void test('a redirect to an address that may end a session is never requested', async () => {
  await withSite(
    () => ({ '/docs': redirectTo('/session/logout'), '/session/logout': textOf('signed out') }),
    async (origin, requested) => {
      assert.equal(await fetchSiteText(`${origin}/docs`, 'text/plain', anyType), undefined)
      assert.deepEqual(requested, ['/docs'])
    }
  )
})

void test('a redirect to another site is never requested', async () => {
  await withSite(
    () => ({ '/landing': textOf('another site') }),
    async (otherOrigin, otherRequested) => {
      await withSite(
        () => ({ '/docs': redirectTo(`${otherOrigin}/landing`) }),
        async (origin) => {
          assert.equal(await fetchSiteText(`${origin}/docs`, 'text/plain', anyType), undefined)
          assert.deepEqual(otherRequested, [])
        }
      )
    }
  )
})

void test('a site that only ever redirects is given up on', async () => {
  await withSite(
    () => ({ '/loop': redirectTo('/loop') }),
    async (origin, requested) => {
      assert.equal(await fetchSiteText(`${origin}/loop`, 'text/plain', anyType), undefined)
      assert.equal(requested.length, 6)
    }
  )
})

void test('an address that never answers is no text', async () => {
  let closedOrigin = ''
  await withSite(
    () => ({}),
    async (origin) => {
      closedOrigin = origin
    }
  )

  assert.equal(await fetchSiteText(`${closedOrigin}/page`, 'text/plain', anyType), undefined)
})
