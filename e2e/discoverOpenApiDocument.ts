import type { E2eTargetSettings } from './E2eTargetSettings.ts'
import { E2eApiDocumentError } from './errors/E2eApiDocumentError.ts'
import type { OpenApiDocument } from './OpenApiDocument.ts'
import type { OpenApiDocumentSearch } from './OpenApiDocumentSearch.ts'

export interface DiscoveredOpenApiDocument {
  /** The address that answered with the document, after redirects; its server address is resolved against it. */
  readonly url: string
  readonly document: OpenApiDocument
}

/** What an address gives the discovery: a document, a docs page a run cannot read one from, or neither. */
export type FetchOpenApiDocument = (url: string) => Promise<OpenApiDocumentSearch>

// The site's OpenAPI document: the first of the target's `apiSpecPaths` that leads to one. A site
// that offers none stops the run: with the docs pages it found but could not read a document's
// address from, when there are any, else with the addresses it tried.
export const discoverOpenApiDocument = async (
  settings: Pick<E2eTargetSettings, 'target' | 'baseUrl' | 'apiSpecPaths'>,
  fetchOpenApiDocument: FetchOpenApiDocument
): Promise<DiscoveredOpenApiDocument> => {
  const urls = settings.apiSpecPaths.map((path) => new URL(path, settings.baseUrl).href)
  const unreadDocsPages: string[] = []
  for (const url of urls) {
    const search = await fetchOpenApiDocument(url)
    const isFound = search.kind === 'found'
    if (isFound) return { url: search.url, document: search.document }
    const isUnreadDocsPage = search.kind === 'docsPage'
    if (isUnreadDocsPage) unreadDocsPages.push(search.url)
  }
  const hasUnreadDocsPage = unreadDocsPages.length > 0
  if (hasUnreadDocsPage) {
    throw new E2eApiDocumentError(
      `The ${settings.target} target has what looks like a Swagger UI or Redoc page at ${unreadDocsPages.join(', ')}, but a run could not reach its document from it: the page works the document's address out in script, names one on another site, or names one that did not answer with a document. Open the page in a browser to see which document it loads, and set the target's "apiSpecPath" to that address.`
    )
  }
  throw new E2eApiDocumentError(
    `The ${settings.target} target has no OpenAPI or Swagger document at: ${urls.join(', ')}. Set the target's "apiSpecPath" to where it is.`
  )
}
