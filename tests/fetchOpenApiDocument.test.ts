import assert from 'node:assert/strict'
import test from 'node:test'

import { fetchOpenApiDocument as fetchOpenApiDocumentWith } from '../e2e/fetchOpenApiDocument.ts'
import type { OpenApiDocumentSearch } from '../e2e/OpenApiDocumentSearch.ts'
import { withSiteRequest } from '../e2e/withSiteRequest.ts'
import { redirectAnswer } from './fixtures/redirectAnswer.ts'
import { textAnswer } from './fixtures/textAnswer.ts'
import { withSiteAnswering } from './fixtures/withSiteAnswering.ts'

const HTML = 'text/html; charset=utf-8'
const JSON_TYPE = 'application/json'
const DOCUMENT = { openapi: '3.1.0', paths: { '/pets': { get: {} } } }
const DOCUMENT_JSON = JSON.stringify(DOCUMENT)
const SWAGGER_UI = `<div id="swagger-ui"></div><script src="./swagger-initializer.js"></script>`

const ABSENT = { kind: 'absent' }

const fetchOpenApiDocument = (url: string): Promise<OpenApiDocumentSearch> =>
  withSiteRequest({ ignoreHttpsErrors: false }, (siteRequest) =>
    fetchOpenApiDocumentWith(siteRequest, url)
  )

void test('a document is read, whatever content type it is served as', async () => {
  await withSiteAnswering(
    () => ({ '/openapi': textAnswer(DOCUMENT_JSON) }),
    async (origin) => {
      assert.deepEqual(await fetchOpenApiDocument(`${origin}/openapi`), {
        kind: 'found',
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
      assert.deepEqual(await fetchOpenApiDocument(`${origin}/swagger.json`), {
        kind: 'found',
        url: `${origin}/swagger.json`,
        document: {
          openapi: '3.0.3',
          servers: [{ url: `${origin}/v2` }],
          security: [],
          paths: { '/pets': { get: { parameters: [], responses: {} }, parameters: [] } },
          components: { parameters: {}, schemas: {}, securitySchemes: {} }
        }
      })
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
        kind: 'found',
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
        kind: 'found',
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
      assert.deepEqual(await fetchOpenApiDocument(`${origin}/docs/index.html`), {
        kind: 'found',
        url: `${origin}/docs/openapi.json`,
        document: DOCUMENT
      })
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
      assert.deepEqual(await fetchOpenApiDocument(`${origin}/docs`), {
        kind: 'found',
        url: `${origin}/openapi.json`,
        document: DOCUMENT
      })
    }
  )
})

void test('a docs page that names a document on another site is reported, and that site never requested', async () => {
  await withSiteAnswering(
    () => ({ '/openapi.json': textAnswer(DOCUMENT_JSON, JSON_TYPE) }),
    async (otherOrigin, otherRequested) => {
      await withSiteAnswering(
        () => ({
          '/docs': textAnswer(`<redoc spec-url="${otherOrigin}/openapi.json"></redoc>`, HTML)
        }),
        async (origin, requested) => {
          assert.deepEqual(await fetchOpenApiDocument(`${origin}/docs`), {
            kind: 'docsPage',
            url: `${origin}/docs`
          })
          assert.deepEqual(requested, ['/docs'])
          assert.deepEqual(otherRequested, [])
        }
      )
    }
  )
})

void test('an address that answers with another page is not read as a docs page in turn', async () => {
  const pageNaming = (path: string): string =>
    `<script>SwaggerUIBundle({ url: "${path}" })</script>`

  await withSiteAnswering(
    () => ({
      '/docs': textAnswer(pageNaming('/docs/a'), HTML),
      '/docs/a': textAnswer(pageNaming('/openapi.json'), HTML),
      '/openapi.json': textAnswer(DOCUMENT_JSON, JSON_TYPE)
    }),
    async (origin, requested) => {
      assert.deepEqual(await fetchOpenApiDocument(`${origin}/docs`), {
        kind: 'docsPage',
        url: `${origin}/docs`
      })
      assert.deepEqual(requested, ['/docs', '/docs/a'])
    }
  )
})

void test('a page that is no docs page, and an address that answers with an error, is no document', async () => {
  await withSiteAnswering(
    () => ({
      '/': textAnswer('<h1>A site</h1><script>go({ url: "/openapi.json" })</script>', HTML)
    }),
    async (origin, requested) => {
      assert.deepEqual(await fetchOpenApiDocument(`${origin}/`), ABSENT)
      assert.deepEqual(await fetchOpenApiDocument(`${origin}/openapi.json`), ABSENT)
      assert.deepEqual(requested, ['/', '/openapi.json'])
    }
  )
})

void test('a docs page that works its document’s address out in script is reported, after a redirect', async () => {
  const settings =
    'const address = location.origin + "/openapi.json"; window.ui = SwaggerUIBundle({ url: address })'

  await withSiteAnswering(
    () => ({
      '/swagger': redirectAnswer('/swagger/index.html'),
      '/swagger/index.html': textAnswer(SWAGGER_UI, HTML),
      '/swagger/swagger-initializer.js': textAnswer(settings, 'application/javascript'),
      '/openapi.json': textAnswer(DOCUMENT_JSON, JSON_TYPE)
    }),
    async (origin) => {
      assert.deepEqual(await fetchOpenApiDocument(`${origin}/swagger`), {
        kind: 'docsPage',
        url: `${origin}/swagger/index.html`
      })
    }
  )
})
