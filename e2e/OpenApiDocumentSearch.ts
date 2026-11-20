import type { OpenApiDocument } from './OpenApiDocument.ts'

// What one address gave the document discovery.
export type OpenApiDocumentSearch =
  | {
      readonly kind: 'found'
      /** The address that answered with the document, after redirects. */
      readonly url: string
      readonly document: OpenApiDocument
    }
  | {
      /** A Swagger UI or Redoc page answered, and no address a run could read from it led to a document. */
      readonly kind: 'docsPage'
      readonly url: string
    }
  | { readonly kind: 'absent' }
