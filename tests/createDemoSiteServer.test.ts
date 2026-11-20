import assert from 'node:assert/strict'
import test from 'node:test'

import { DEMO_SITE_HOST, DEMO_SITE_PORT } from '../demo/constants.ts'
import { demoSite } from '../demo/demoSite.ts'
import { discoverSitePages } from '../e2e/discoverSitePages.ts'
import { fetchPageHtml } from '../e2e/fetchPageHtml.ts'
import { readE2eTargets } from '../e2e/readE2eTargets.ts'
import { resolveE2eTarget } from '../e2e/resolveE2eTarget.ts'
import { targetsFilePath } from '../e2e/targetsFilePath.ts'
import { withSiteRequest } from '../e2e/withSiteRequest.ts'
import { withRunningDemoServer } from './fixtures/withRunningDemoServer.ts'

const PAGES = ['/', '/books', '/about']
const FILES = [
  '/styles.css',
  '/favicon.svg',
  '/images/tide-tables.svg',
  '/images/field-guide-to-fog.svg'
]

const withDemoSite = (work: (baseUrl: string) => Promise<void>): Promise<void> =>
  withRunningDemoServer(demoSite, work)

void test('a crawl from the demo site’s home page finds every page', async () => {
  await withDemoSite(async (baseUrl) => {
    const pages = await withSiteRequest({ ignoreHttpsErrors: false }, (siteRequest) =>
      discoverSitePages({ baseUrl, paths: ['/'], crawlLimit: 10 }, (url) =>
        fetchPageHtml(siteRequest, url)
      )
    )

    assert.deepEqual(pages, PAGES)
  })
})

void test('every page of the demo site answers as HTML with what the page checks look for', async () => {
  await withDemoSite(async (baseUrl) => {
    for (const path of PAGES) {
      const response = await fetch(`${baseUrl}${path}`)
      const html = await response.text()

      assert.equal(response.status, 200, path)
      assert.equal(response.headers.get('content-type'), 'text/html; charset=utf-8', path)
      assert.match(html, /<html lang="en">/, path)
      assert.match(html, /<title>[^<]+<\/title>/, path)
      assert.match(html, /<meta name="description" content="[^"]+">/, path)
      assert.match(html, /<meta name="viewport" content="[^"]+">/, path)
      assert.equal(html.match(/<h1>/g)?.length, 1, path)
      assert.equal(/<img(?![^>]*\salt=")/.test(html), false, path)
    }
  })
})

void test('every file a demo page loads, and every link it shows, answers', async () => {
  await withDemoSite(async (baseUrl) => {
    for (const path of [...PAGES, ...FILES]) {
      const response = await fetch(`${baseUrl}${path}`, { method: 'HEAD' })

      assert.equal(response.status, 200, path)
      assert.equal(await response.text(), '', path)
    }
    for (const path of PAGES) {
      const html = await (await fetch(`${baseUrl}${path}`)).text()
      const addresses = [...html.matchAll(/(?:href|src|action)="([^"]+)"/g)].map(
        (match) => match[1] ?? ''
      )

      for (const address of addresses) {
        const response = await fetch(new URL(address, baseUrl))
        await response.body?.cancel()

        assert.equal(response.status, 200, `${address} on ${path}`)
      }
    }
  })
})

void test('an address the demo site does not have is a not-found page', async () => {
  await withDemoSite(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/no-such-page`)

    assert.equal(response.status, 404)
    assert.match(await response.text(), /<h1>Page not found<\/h1>/)
  })
})

void test('the demo site refuses a request that would change it', async () => {
  await withDemoSite(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/books`, { method: 'POST' })
    await response.body?.cancel()

    assert.equal(response.status, 405)
  })
})

void test('the repo’s demo-site target has a site run serve the demo site where serve:demo-site does', () => {
  const settings = resolveE2eTarget('demo-site', readE2eTargets(targetsFilePath({})))

  assert.equal(settings.servesDemoSite, true)
  assert.equal(settings.baseUrl, `http://${DEMO_SITE_HOST}:${String(DEMO_SITE_PORT)}`)
})

void test('a run without a target name tests the demo site', () => {
  assert.equal(readE2eTargets(targetsFilePath({})).defaultTarget, 'demo-site')
})
