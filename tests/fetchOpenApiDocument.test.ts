import assert from 'node:assert/strict'
import test from 'node:test'

import type { DiscoveredOpenApiDocument } from '../e2e/discoverOpenApiDocument.ts'
import { fetchOpenApiDocument as fetchOpenApiDocumentWith } from '../e2e/fetchOpenApiDocument.ts'
import { withSiteRequest } from '../e2e/withSiteRequest.ts'
import { redirectAnswer } from './fixtures/redirectAnswer.ts'
import { textAnswer } from './fixtures/textAnswer.ts'
import { withSiteAnswering } from './fixtures/withSiteAnswering.ts'

const HTML = 'text/html; charset=utf-8'
const JSON_TYPE = 'application/json'
const DOCUMENT = { openapi: '3.1.0', paths: { '/pets': { get: {} } } }
const DOCUMENT_JSON = JSON.stringify(DOCUMENT)
const SWAGGER_UI = `<div id="swagger-ui"></div><script src="./swagger-initializer.js"></script>`

const fetchOpenApiDocument = (url: string): Promise<DiscoveredOpenApiDocument | undefined> =>
  withSiteRequest({ ignoreHttpsErrors: false }, (siteRequest) =>
    fetchOpenApiDocumentWith(siteRequest, url)
  )

void test('a document is read, whatever content type it is served as', async () => {
  await withSiteAnswering(
    () => ({ '/openapi': textAnswer(DOCUMENT_JSON) }),
    async (origin) => {
      assert.deepEqual(await fetchOpenApiDocument(`${origin}/openapi`), {
        url: `${origin}/openapi`,
        document: DOCUMENT
      })
    }
  )
})

void test('a Swagger 2.0 document is read as an OpenAPI 3 one served from its base path', async () => {
  const swagger = { swagger: '2.0', basePath: '/v2', paths: { '/pets': { get: {} } } }

  await withSiteAnswering(
    () => ({ '/swagger.json': textAnswer(JSON.stringify(swagger), JSON_TYPE) }),
    async (origin) => {
      const discovered = await fetchOpenApiDocument(`${origin}/swagger.json`)

      assert.equal(discovered?.url, `${origin}/swagger.json`)
      assert.deepEqual(discovered?.document.servers, [{ url: `${origin}/v2` }])
      assert.deepEqual(Object.keys(discovered?.document.paths ?? {}), ['/pets'])
    }
  )
})

void test('a Redoc page leads to the document it names', async () => {
  await withSiteAnswering(
    () => ({
      '/redoc': textAnswer('<redoc spec-url="/api/openapi.json"></redoc>', HTML),
      '/api/openapi.json': textAnswer(DOCUMENT_JSON, JSON_TYPE)
    }),
    async (origin) => {
      assert.deepEqual(await fetchOpenApiDocument(`${origin}/redoc`), {
        url: `${origin}/api/openapi.json`,
        document: DOCUMENT
      })
    }
  )
})

void test('a Swagger UI page leads to its document through its settings script, after a redirect', async () => {
  await withSiteAnswering(
    () => ({
      '/swagger': redirectAnswer('/swagger/index.html'),
      '/swagger/index.html': textAnswer(SWAGGER_UI, HTML),
      '/swagger/swagger-initializer.js': textAnswer(
        'window.ui = SwaggerUIBundle({ url: "v1/swagger.json" })',
        'application/javascript'
      ),
      '/swagger/v1/swagger.json': textAnswer(DOCUMENT_JSON, JSON_TYPE)
    }),
    async (origin, requested) => {
      assert.deepEqual(await fetchOpenApiDocument(`${origin}/swagger`), {
        url: `${origin}/swagger/v1/swagger.json`,
        document: DOCUMENT
      })
      assert.deepEqual(requested, [
        '/swagger',
        '/swagger/index.html',
        '/swagger/swagger-initializer.js',
        '/swagger/v1/swagger.json'
      ])
    }
  )
})

void test('an address in a settings script is read against the page that loads the script', async () => {
  const page = `<div id="swagger-ui"></div><script src="/assets/swagger-initializer.js"></script>`

  await withSiteAnswering(
    () => ({
      '/docs/index.html': textAnswer(page, HTML),
      '/assets/swagger-initializer.js': textAnswer(
        'window.ui = SwaggerUIBundle({ url: "./openapi.json" })',
        'application/javascript'
      ),
      '/docs/openapi.json': textAnswer(DOCUMENT_JSON, JSON_TYPE)
    }),
    async (origin) => {
      assert.equal(
        (await fetchOpenApiDocument(`${origin}/docs/index.html`))?.url,
        `${origin}/docs/openapi.json`
      )
    }
  )
})

void test('the first address a page names that answers with a document is the document', async () => {
  const page = `<script>SwaggerUIBundle({ urls: [{ url: "/missing.json" }, { url: "/openapi.json" }] })</script>`

  await withSiteAnswering(
    () => ({
      '/docs': textAnswer(page, HTML),
      '/openapi.json': textAnswer(DOCUMENT_JSON, JSON_TYPE)
    }),
    async (origin) => {
      assert.equal((await fetchOpenApiDocument(`${origin}/docs`))?.url, `${origin}/openapi.json`)
    }
  )
})

void test('a document on another site is never requested', async () => {
  await withSiteAnswering(
    () => ({ '/openapi.json': textAnswer(DOCUMENT_JSON, JSON_TYPE) }),
    async (otherOrigin, otherRequested) => {
      await withSiteAnswering(
        () => ({
          '/docs': textAnswer(`<redoc spec-url="${otherOrigin}/openapi.json"></redoc>`, HTML)
        }),
        async (origin, requested) => {
          assert.equal(await fetchOpenApiDocument(`${origin}/docs`), undefined)
          assert.deepEqual(requested, ['/docs'])
          assert.deepEqual(otherRequested, [])
        }
      )
    }
  )
})

void test('pages that only ever name another page are given up on', async () => {
  const pageNaming = (path: string): string =>
    `<script>SwaggerUIBundle({ url: "${path}" })</script>`

  await withSiteAnswering(
    () => ({
      '/docs': textAnswer(pageNaming('/docs/a'), HTML),
      '/docs/a': textAnswer(pageNaming('/docs/b'), HTML),
      '/docs/b': textAnswer(pageNaming('/openapi.json'), HTML),
      '/openapi.json': textAnswer(DOCUMENT_JSON, JSON_TYPE)
    }),
    async (origin, requested) => {
      assert.equal(await fetchOpenApiDocument(`${origin}/docs`), undefined)
      assert.deepEqual(requested, ['/docs', '/docs/a', '/docs/b'])
    }
  )
})

void test('a page that is no docs page, and an address that answers with an error, is no document', async () => {
  await withSiteAnswering(
    () => ({
      '/': textAnswer('<h1>A site</h1><script>go({ url: "/openapi.json" })</script>', HTML)
    }),
    async (origin, requested) => {
      assert.equal(await fetchOpenApiDocument(`${origin}/`), undefined)
      assert.equal(await fetchOpenApiDocument(`${origin}/openapi.json`), undefined)
      assert.deepEqual(requested, ['/', '/openapi.json'])
    }
  )
})
