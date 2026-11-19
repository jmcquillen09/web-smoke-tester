import type { FetchOpenApiDocument } from './discoverOpenApiDocument.ts'
import { fetchSiteText } from './fetchSiteText.ts'
import { OpenApiDocumentSchema } from './OpenApiDocument.ts'

// Fetches one address for the document discovery. Anything but an OpenAPI 3 JSON document that
// ended on the address's own site (an error status, a redirect elsewhere, HTML, YAML) is no document.
export const fetchOpenApiDocument: FetchOpenApiDocument = async (url) => {
  const text = await fetchSiteText(url, 'application/json', () => true)
  const hasAnswer = text !== undefined
  if (!hasAnswer) return undefined
  try {
    const content: unknown = JSON.parse(text)
    const parsed = OpenApiDocumentSchema.safeParse(content)
    return parsed.success ? parsed.data : undefined
  } catch {
    return undefined
  }
}
