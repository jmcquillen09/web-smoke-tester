import assert from 'node:assert/strict'
import test from 'node:test'

import {
  type DiscoveredOpenApiDocument,
  discoverOpenApiDocument
} from '../e2e/discoverOpenApiDocument.ts'
import type { OpenApiDocument } from '../e2e/OpenApiDocument.ts'

const DOCUMENT: OpenApiDocument = { openapi: '3.1.0', paths: {} }
const SETTINGS = {
  target: 'staging',
  baseUrl: 'https://staging.example.com',
  apiSpecPaths: ['/openapi.json', '/v3/api-docs']
}

// A site as a map from address to the document it leads to; an address it lacks has none. Records
// each one asked.
const siteOf = (documents: Record<string, DiscoveredOpenApiDocument>) => {
  const asked: string[] = []
  const fetchOpenApiDocument = async (
    url: string
  ): Promise<DiscoveredOpenApiDocument | undefined> => {
    asked.push(url)
    return documents[url]
  }
  return { asked, fetchOpenApiDocument }
}

void test('the first address that answers with a document is the site’s document', async () => {
  const site = siteOf({
    'https://staging.example.com/v3/api-docs': {
      url: 'https://staging.example.com/v3/api-docs',
      document: DOCUMENT
    }
  })

  const discovered = await discoverOpenApiDocument(SETTINGS, site.fetchOpenApiDocument)

  assert.deepEqual(discovered, {
    url: 'https://staging.example.com/v3/api-docs',
    document: DOCUMENT
  })
})

void test('a document found after a redirect is the one at the address that answered', async () => {
  const site = siteOf({
    'https://staging.example.com/openapi.json': {
      url: 'https://staging.example.com/docs/openapi.json',
      document: DOCUMENT
    }
  })

  const discovered = await discoverOpenApiDocument(SETTINGS, site.fetchOpenApiDocument)

  assert.equal(discovered.url, 'https://staging.example.com/docs/openapi.json')
})

void test('discovery stops asking once it has found a document', async () => {
  const site = siteOf({
    'https://staging.example.com/openapi.json': {
      url: 'https://staging.example.com/openapi.json',
      document: DOCUMENT
    }
  })

  await discoverOpenApiDocument(SETTINGS, site.fetchOpenApiDocument)

  assert.deepEqual(site.asked, ['https://staging.example.com/openapi.json'])
})

void test('a site with no document at any address stops the run and lists them', async () => {
  const site = siteOf({})

  await assert.rejects(discoverOpenApiDocument(SETTINGS, site.fetchOpenApiDocument), {
    name: 'E2eApiDocumentError',
    message:
      'The staging target has no OpenAPI or Swagger document at: https://staging.example.com/openapi.json, https://staging.example.com/v3/api-docs. Set the target\'s "apiSpecPath" to where it is.'
  })
})
