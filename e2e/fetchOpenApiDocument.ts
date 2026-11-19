import type { FetchOpenApiDocument } from './discoverOpenApiDocument.ts'
import { fetchSiteText } from './fetchSiteText.ts'
import { OpenApiDocumentSchema } from './OpenApiDocument.ts'

// Fetches one address for the document discovery. Anything but an OpenAPI 3 JSON document that
// ended on the address's own site (an error status, a redirect elsewhere, HTML, YAML) is no document.
export const fetchOpenApiDocument: FetchOpenApiDocument = async (url) => {
  const answer = await fetchSiteText(url, 'application/json', () => true)
  const hasAnswer = answer !== undefined
  if (!hasAnswer) return undefined
  try {
    const content: unknown = JSON.parse(answer.text)
    const parsed = OpenApiDocumentSchema.safeParse(content)
    return parsed.success ? { url: answer.url, document: parsed.data } : undefined
  } catch {
    return undefined
  }
}
