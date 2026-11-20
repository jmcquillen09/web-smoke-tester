import assert from 'node:assert/strict'
import test from 'node:test'

import { DOCS_PAGE_LINK_LIMIT } from '../e2e/constants.ts'
import { extractOpenApiDocumentLinks } from '../e2e/extractOpenApiDocumentLinks.ts'

const PAGE_URL = 'https://api.example/docs/index.html'

const documentsIn = (text: string): readonly string[] =>
  extractOpenApiDocumentLinks(text, PAGE_URL).documents

void test('a Redoc page names its document in spec-url or in Redoc.init', () => {
  const element = '<body><redoc spec-url="/openapi.yaml"></redoc><script src="redoc.js"></script>'
  const script = `<div id="redoc"></div><script>Redoc.init('../v1/openapi.json', {}, el)</script>`

  assert.deepEqual(extractOpenApiDocumentLinks(element, PAGE_URL), {
    documents: ['https://api.example/openapi.yaml'],
    scripts: []
  })
  assert.deepEqual(documentsIn(script), ['https://api.example/v1/openapi.json'])
})

void test('a Swagger UI page names its document in url, or several in urls', () => {
  const one = `<div id="swagger-ui"></div><script>SwaggerUIBundle({ url: '/openapi.json', dom_id: '#swagger-ui' })</script>`
  const several = `<div id="swagger-ui"></div><script>var configObject = JSON.parse('{"urls":[{"url":"v1/swagger.json","name":"V1"},{"url":"v2/swagger.json","name":"V2"}],"validatorUrl":"https://validator.example"}');</script>`

  assert.deepEqual(documentsIn(one), ['https://api.example/openapi.json'])
  assert.deepEqual(documentsIn(several), [
    'https://api.example/docs/v1/swagger.json',
    'https://api.example/docs/v2/swagger.json'
  ])
})

void test('a Swagger UI page that keeps its settings in a script names that script, not a document', () => {
  const page = `<div id="swagger-ui"></div><script src="./swagger-ui-bundle.js"></script><script src="./swagger-initializer.js" charset="UTF-8"></script>`

  assert.deepEqual(extractOpenApiDocumentLinks(page, PAGE_URL), {
    documents: [],
    scripts: ['https://api.example/docs/swagger-initializer.js']
  })
})

void test('an address on another site, and one a read-only run must not request, is dropped', () => {
  const page = `<script>SwaggerUIBundle({ urls: [
    { url: "https://other.example/openapi.json" },
    { url: "//other.example/openapi.json" },
    { url: "/session/logout?next=/openapi.json" },
    { url: "https://user:secret@api.example/openapi.json" },
    { url: "http://[not-an-address" },
    { url: "/openapi.json#/pets" },
    { url: "/openapi.json" }
  ] })</script><script src="https://other.example/swagger-initializer.js"></script>`

  assert.deepEqual(extractOpenApiDocumentLinks(page, PAGE_URL), {
    documents: ['https://api.example/openapi.json'],
    scripts: []
  })
})

void test('a page never names itself, and a text that is no docs page names nothing', () => {
  const itself = `<script>SwaggerUIBundle({ url: "index.html" })</script>`
  const settings = `<script>const settings = { url: "/openapi.json" }</script>`

  assert.deepEqual(documentsIn(itself), [])
  assert.deepEqual(extractOpenApiDocumentLinks(settings, PAGE_URL), { documents: [], scripts: [] })
})

void test('a page names no more documents than the limit', () => {
  const urls = Array.from(
    { length: DOCS_PAGE_LINK_LIMIT + 3 },
    (_, index) => `{ url: "/v${String(index)}.json" }`
  )
  const page = `<script>SwaggerUIBundle({ urls: [${urls.join(',')}] })</script>`

  const documents = documentsIn(page)

  assert.equal(documents.length, DOCS_PAGE_LINK_LIMIT)
  assert.equal(documents[0], 'https://api.example/v0.json')
})
