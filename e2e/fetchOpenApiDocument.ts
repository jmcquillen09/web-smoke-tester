import type { APIRequestContext } from '@playwright/test'
import { DOCS_PAGE_FOLLOW_LIMIT } from './constants.ts'
import type { DiscoveredOpenApiDocument } from './discoverOpenApiDocument.ts'
import { extractOpenApiDocumentLinks } from './extractOpenApiDocumentLinks.ts'
import { fetchSiteText } from './fetchSiteText.ts'
import { parseOpenApiDocument } from './parseOpenApiDocument.ts'

// A document first, then the page that names one.
const DOCUMENT_TYPES = 'application/json, text/html;q=0.8, */*;q=0.5'

const findOpenApiDocument = async (
  siteRequest: APIRequestContext,
  url: string,
  followsLeft: number
): Promise<DiscoveredOpenApiDocument | undefined> => {
  const answer = await fetchSiteText(siteRequest, url, DOCUMENT_TYPES, () => true)
  const hasAnswer = answer !== undefined
  if (!hasAnswer) return undefined
  const document = parseOpenApiDocument(answer.text)
  const hasDocument = document !== undefined
  if (hasDocument) return { url: answer.url, document }
  const mayFollow = followsLeft > 0
  if (!mayFollow) return undefined
  for (const link of extractOpenApiDocumentLinks(answer.text, answer.url)) {
    const linked = await findOpenApiDocument(siteRequest, link, followsLeft - 1)
    const hasLinkedDocument = linked !== undefined
    if (hasLinkedDocument) return linked
  }
  return undefined
}

// Fetches one address for the document discovery: an OpenAPI 3 or Swagger 2.0 document in JSON, or
// the document a Swagger UI or Redoc page there names. Only an answer that ended on the
// address's own site is read; an error status and a redirect elsewhere are no document.
export const fetchOpenApiDocument = (
  siteRequest: APIRequestContext,
  url: string
): Promise<DiscoveredOpenApiDocument | undefined> =>
  findOpenApiDocument(siteRequest, url, DOCS_PAGE_FOLLOW_LIMIT)
