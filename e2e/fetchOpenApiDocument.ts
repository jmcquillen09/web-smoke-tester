import { CRAWL_FETCH_TIMEOUT_MS } from './constants.ts'
import type { FetchOpenApiDocument } from './discoverOpenApiDocument.ts'
import { OpenApiDocumentSchema } from './OpenApiDocument.ts'

// Fetches one address for the document discovery. Anything but an OpenAPI 3 JSON document that
// ended on the address's own site (an error status, a redirect elsewhere, HTML, YAML) is no document.
export const fetchOpenApiDocument: FetchOpenApiDocument = async (url) => {
  try {
    const response = await fetch(url, {
      headers: { accept: 'application/json' },
      redirect: 'follow',
      signal: AbortSignal.timeout(CRAWL_FETCH_TIMEOUT_MS)
    })
    const isSiteAnswer = response.ok && new URL(response.url).origin === new URL(url).origin
    if (!isSiteAnswer) {
      await response.body?.cancel()
      return undefined
    }
    const content: unknown = JSON.parse(await response.text())
    const parsed = OpenApiDocumentSchema.safeParse(content)
    return parsed.success ? parsed.data : undefined
  } catch {
    return undefined
  }
}
