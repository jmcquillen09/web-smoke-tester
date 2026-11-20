import type { APIRequestContext } from '@playwright/test'
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

const fetchText = (siteRequest: APIRequestContext, url: string): ReturnType<typeof fetchSiteText> =>
  fetchSiteText(siteRequest, url, DOCUMENT_TYPES, () => true)

const readAddress = async (
  siteRequest: APIRequestContext,
  url: string
): Promise<AddressAnswer | undefined> => {
  const answer = await fetchText(siteRequest, url)
  const hasAnswer = answer !== undefined
  if (!hasAnswer) return undefined
  const document = parseOpenApiDocument(answer.text, answer.url)
  const hasDocument = document !== undefined
  return hasDocument ? { ...answer, document } : answer
}

// The first of `urls` that answers with a document. One that answers with anything else, another
// page included, is passed over.
const findDocumentAt = async (
  siteRequest: APIRequestContext,
  urls: readonly string[]
): Promise<DiscoveredOpenApiDocument | undefined> => {
  for (const url of urls) {
    const answer = await readAddress(siteRequest, url)
    const document = answer?.document
    const hasDocument = answer !== undefined && document !== undefined
    if (hasDocument) return { url: answer.url, document }
  }
  return undefined
}

// The document a docs page names: in the page itself, else in a settings script it loads. An
// address in such a script is read against the page, as a browser reads it.
const findLinkedDocument = async (
  siteRequest: APIRequestContext,
  page: Pick<AddressAnswer, 'url' | 'text'>
): Promise<DiscoveredOpenApiDocument | undefined> => {
  const links = extractOpenApiDocumentLinks(page.text, page.url)
  const named = await findDocumentAt(siteRequest, links.documents)
  const hasNamedDocument = named !== undefined
  if (hasNamedDocument) return named
  for (const scriptUrl of links.scripts) {
    const script = await fetchText(siteRequest, scriptUrl)
    const hasScript = script !== undefined
    if (!hasScript) continue
    const inScript = await findDocumentAt(
      siteRequest,
      extractOpenApiDocumentLinks(script.text, page.url).documents
    )
    const hasScriptDocument = inScript !== undefined
    if (hasScriptDocument) return inScript
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
  const linked = await findLinkedDocument(siteRequest, answer)
  const hasLinkedDocument = linked !== undefined
  if (hasLinkedDocument) return { kind: 'found', ...linked }
  return isApiDocsPage(answer.text) ? { kind: 'docsPage', url: answer.url } : ABSENT
}
