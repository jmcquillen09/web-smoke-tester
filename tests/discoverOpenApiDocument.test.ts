import assert from 'node:assert/strict'
import test from 'node:test'

import { discoverOpenApiDocument } from '../e2e/discoverOpenApiDocument.ts'
import type { OpenApiDocument } from '../e2e/OpenApiDocument.ts'
import type { OpenApiDocumentSearch } from '../e2e/OpenApiDocumentSearch.ts'

const DOCUMENT: OpenApiDocument = { openapi: '3.1.0', paths: {} }
const SETTINGS = {
  target: 'staging',
  baseUrl: 'https://staging.example.com',
  apiSpecPaths: ['/openapi.json', '/v3/api-docs']
}

const found = (url: string): OpenApiDocumentSearch => ({ kind: 'found', url, document: DOCUMENT })

// A site as a map from address to what it gives the discovery; an address it lacks gives nothing.
// Records each one asked.
const siteOf = (searches: Record<string, OpenApiDocumentSearch>) => {
  const asked: string[] = []
  const fetchOpenApiDocument = async (url: string): Promise<OpenApiDocumentSearch> => {
    asked.push(url)
    return searches[url] ?? { kind: 'absent' }
  }
  return { asked, fetchOpenApiDocument }
}

void test('the first address that leads to a document is the site’s document', async () => {
  const site = siteOf({
    'https://staging.example.com/v3/api-docs': found('https://staging.example.com/v3/api-docs')
  })

  const discovered = await discoverOpenApiDocument(SETTINGS, site.fetchOpenApiDocument)

  assert.deepEqual(discovered, {
    url: 'https://staging.example.com/v3/api-docs',
    document: DOCUMENT
  })
})

void test('a document found after a redirect is the one at the address that answered', async () => {
  const site = siteOf({
    'https://staging.example.com/openapi.json': found(
      'https://staging.example.com/docs/openapi.json'
    )
  })

  const discovered = await discoverOpenApiDocument(SETTINGS, site.fetchOpenApiDocument)

  assert.equal(discovered.url, 'https://staging.example.com/docs/openapi.json')
})

void test('discovery stops asking once it has found a document', async () => {
  const site = siteOf({
    'https://staging.example.com/openapi.json': found('https://staging.example.com/openapi.json')
  })

  await discoverOpenApiDocument(SETTINGS, site.fetchOpenApiDocument)

  assert.deepEqual(site.asked, ['https://staging.example.com/openapi.json'])
})

void test('a docs page that leads to no document does not stop a later address from giving one', async () => {
  const site = siteOf({
    'https://staging.example.com/openapi.json': {
      kind: 'docsPage',
      url: 'https://staging.example.com/openapi.json'
    },
    'https://staging.example.com/v3/api-docs': found('https://staging.example.com/v3/api-docs')
  })

  const discovered = await discoverOpenApiDocument(SETTINGS, site.fetchOpenApiDocument)

  assert.equal(discovered.url, 'https://staging.example.com/v3/api-docs')
})

void test('a site with no document at any address stops the run and lists them', async () => {
  const site = siteOf({})

  await assert.rejects(discoverOpenApiDocument(SETTINGS, site.fetchOpenApiDocument), {
    name: 'E2eApiDocumentError',
    message:
      'The staging target has no OpenAPI or Swagger document at: https://staging.example.com/openapi.json, https://staging.example.com/v3/api-docs. Set the target\'s "apiSpecPath" to where it is.'
  })
})

void test('a site whose docs page leads to no document stops the run with the page and what to set', async () => {
  const site = siteOf({
    'https://staging.example.com/v3/api-docs': {
      kind: 'docsPage',
      url: 'https://staging.example.com/swagger/index.html'
    }
  })

  await assert.rejects(discoverOpenApiDocument(SETTINGS, site.fetchOpenApiDocument), {
    name: 'E2eApiDocumentError',
    message:
      'The staging target has what looks like a Swagger UI or Redoc page at https://staging.example.com/swagger/index.html, but a run could not reach its document from it: the page works the document\'s address out in script, names one on another site, or names one that did not answer with a document. Open the page in a browser to see which document it loads, and set the target\'s "apiSpecPath" to that address.'
  })
})
