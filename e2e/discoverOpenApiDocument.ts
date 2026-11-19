import type { E2eTargetSettings } from './E2eTargetSettings.ts'
import { E2eConfigurationError } from './errors/E2eConfigurationError.ts'
import type { OpenApiDocument } from './OpenApiDocument.ts'

export interface DiscoveredOpenApiDocument {
  /** The address that answered with the document, after redirects; its server address is resolved against it. */
  readonly url: string
  readonly document: OpenApiDocument
}

/** The OpenAPI document an address leads to, or undefined when it does not answer with one. */
export type FetchOpenApiDocument = (url: string) => Promise<DiscoveredOpenApiDocument | undefined>

// The site's OpenAPI document: the first of the target's `apiSpecPaths` that answers with one. A
// site that offers none at those addresses stops the run with the addresses it tried.
export const discoverOpenApiDocument = async (
  settings: Pick<E2eTargetSettings, 'target' | 'baseUrl' | 'apiSpecPaths'>,
  fetchOpenApiDocument: FetchOpenApiDocument
): Promise<DiscoveredOpenApiDocument> => {
  const urls = settings.apiSpecPaths.map((path) => new URL(path, settings.baseUrl).href)
  for (const url of urls) {
    const discovered = await fetchOpenApiDocument(url)
    const hasDocument = discovered !== undefined
    if (hasDocument) return discovered
  }
  throw new E2eConfigurationError(
    `The ${settings.target} target has no OpenAPI 3 JSON document at: ${urls.join(', ')}. Set the target's "apiSpecPath" to where it is.`
  )
}
