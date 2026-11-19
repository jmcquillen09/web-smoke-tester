import assert from 'node:assert/strict'
import test from 'node:test'

import { discoverSitePages } from '../e2e/discoverSitePages.ts'

const SITE = 'https://site.example'

const linkTo = (...paths: string[]): string =>
  paths.map((path) => `<a href="${path}">${path}</a>`).join('')

// A site as a map from path to HTML; a path it lacks does not answer. Records each page fetched.
const siteOf = (pages: Record<string, string>) => {
  const fetched: string[] = []
  const fetchPageHtml = async (url: string): Promise<string | undefined> => {
    const path = new URL(url).pathname
    fetched.push(path)
    return pages[path]
  }
  return { fetched, fetchPageHtml }
}

void test('the target’s own paths come first, then the pages they link to', async () => {
  const site = siteOf({ '/': linkTo('/pricing', '/about'), '/pricing': '', '/about': '' })

  const pages = await discoverSitePages(
    { baseUrl: SITE, paths: ['/'], crawlLimit: 10 },
    site.fetchPageHtml
  )

  assert.deepEqual(pages, ['/', '/pricing', '/about'])
})

void test('pages nearest the start are found before pages deeper in the site', async () => {
  const site = siteOf({
    '/': linkTo('/a', '/b'),
    '/a': linkTo('/a/deep'),
    '/b': linkTo('/b/deep'),
    '/a/deep': '',
    '/b/deep': ''
  })

  const pages = await discoverSitePages(
    { baseUrl: SITE, paths: ['/'], crawlLimit: 3 },
    site.fetchPageHtml
  )

  assert.deepEqual(pages, ['/', '/a', '/b', '/a/deep'])
})

void test('the crawl stops fetching once it has found its limit of pages', async () => {
  const site = siteOf({ '/': linkTo('/a', '/b', '/c'), '/a': linkTo('/d'), '/b': '', '/c': '' })

  const pages = await discoverSitePages(
    { baseUrl: SITE, paths: ['/'], crawlLimit: 2 },
    site.fetchPageHtml
  )

  assert.deepEqual(pages, ['/', '/a', '/b'])
  assert.deepEqual(site.fetched, ['/'])
})

void test('a crawl limit of zero tests only the target’s own paths and fetches nothing', async () => {
  const site = siteOf({ '/': linkTo('/a') })

  const pages = await discoverSitePages(
    { baseUrl: SITE, paths: ['/', '/pricing'], crawlLimit: 0 },
    site.fetchPageHtml
  )

  assert.deepEqual(pages, ['/', '/pricing'])
  assert.deepEqual(site.fetched, [])
})

void test('a page that does not answer stays in the list for its own tests to report', async () => {
  const site = siteOf({ '/': linkTo('/gone', '/about'), '/about': linkTo('/team'), '/team': '' })

  const pages = await discoverSitePages(
    { baseUrl: SITE, paths: ['/'], crawlLimit: 10 },
    site.fetchPageHtml
  )

  assert.deepEqual(pages, ['/', '/gone', '/about', '/team'])
})

void test('a page reached from several pages is listed and fetched once', async () => {
  const site = siteOf({ '/': linkTo('/a', '/b'), '/a': linkTo('/', '/b'), '/b': linkTo('/a') })

  const pages = await discoverSitePages(
    { baseUrl: SITE, paths: ['/'], crawlLimit: 10 },
    site.fetchPageHtml
  )

  assert.deepEqual(pages, ['/', '/a', '/b'])
  assert.deepEqual(site.fetched, ['/', '/a', '/b'])
})
