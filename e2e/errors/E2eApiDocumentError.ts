// Raised when a site offers no OpenAPI document an API run can test: none at the addresses tried, or
// one with no operation a run can request.
export class E2eApiDocumentError extends Error {
  override readonly name = 'E2eApiDocumentError'
}
