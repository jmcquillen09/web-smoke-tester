import type { APIRequestContext } from '@playwright/test'
import { DOCS_PAGE_FOLLOW_LIMIT } from './constants.ts'
import type { DiscoveredOpenApiDocument } from './discoverOpenApiDocument.ts'
import { extractOpenApiDocumentLinks } from './extractOpenApiDocumentLinks.ts'
import { fetchSiteText } from './fetchSiteText.ts'
import { isApiDocsPage } from './isApiDocsPage.ts'
import type { OpenApiDocument } from './OpenApiDocument.ts'
import type { OpenApiDocumentSearch } from './OpenApiDocumentSearch.ts'
import { parseOpenApiDocument } from './parseOpenApiDocument.ts'

// A document first, then the page that names one.
const DOCUMENT_TYPES = 'application/json, text/html;q=0.8, */*;q=0.5'
const ABSENT: OpenApiDocumentSearch = { kind: 'absent' }

interface AddressAnswer {
  /** The address that answered, after redirects. */
  readonly url: string
  readonly text: string
  /** The document the text holds; absent when it holds none. */
  readonly document?: OpenApiDocument
}

const readAddress = async (
  siteRequest: APIRequestContext,
  url: string
): Promise<AddressAnswer | undefined> => {
  const answer = await fetchSiteText(siteRequest, url, DOCUMENT_TYPES, () => true)
  const hasAnswer = answer !== undefined
  if (!hasAnswer) return undefined
  const document = parseOpenApiDocument(answer.text, answer.url)
  const hasDocument = document !== undefined
  return hasDocument ? { ...answer, document } : answer
}

// The first document the addresses `text` names lead to. An address is read against `pageUrl`, as
// a browser reads one in a script the page loads, wherever that script is served from.
const findLinkedDocument = async (
  siteRequest: APIRequestContext,
  text: string,
  pageUrl: string,
  followsLeft: number
): Promise<DiscoveredOpenApiDocument | undefined> => {
  const mayFollow = followsLeft > 0
  if (!mayFollow) return undefined
  for (const link of extractOpenApiDocumentLinks(text, pageUrl)) {
    const answer = await readAddress(siteRequest, link)
    const hasAnswer = answer !== undefined
    if (!hasAnswer) continue
    const { url, document } = answer
    const hasDocument = document !== undefined
    if (hasDocument) return { url, document }
    const linked = await findLinkedDocument(siteRequest, answer.text, pageUrl, followsLeft - 1)
    const hasLinkedDocument = linked !== undefined
    if (hasLinkedDocument) return linked
  }
  return undefined
}

// What one address gives the document discovery: an OpenAPI 3 or Swagger 2.0 document in JSON, the
// document a Swagger UI or Redoc page there names, or that page when it leads to none.
export const fetchOpenApiDocument = async (
  siteRequest: APIRequestContext,
  url: string
): Promise<OpenApiDocumentSearch> => {
  const answer = await readAddress(siteRequest, url)
  const hasAnswer = answer !== undefined
  if (!hasAnswer) return ABSENT
  const { document } = answer
  const hasDocument = document !== undefined
  if (hasDocument) return { kind: 'found', url: answer.url, document }
  const linked = await findLinkedDocument(
    siteRequest,
    answer.text,
    answer.url,
    DOCS_PAGE_FOLLOW_LIMIT
  )
  const hasLinkedDocument = linked !== undefined
  if (hasLinkedDocument) return { kind: 'found', ...linked }
  return isApiDocsPage(answer.text) ? { kind: 'docsPage', url: answer.url } : ABSENT
}
