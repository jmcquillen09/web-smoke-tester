import { DOCS_PAGE_LINK_LIMIT } from './constants.ts'
import { isApiDocsPage } from './isApiDocsPage.ts'
import { isSafeAddress } from './isSafeAddress.ts'

export interface OpenApiDocumentLinks {
  /** The addresses the text names as its document. */
  readonly documents: readonly string[]
  /** The scripts a Swagger UI page keeps its settings in, which name the document in its place. */
  readonly scripts: readonly string[]
}

// Where a docs page names its document: Redoc's `spec-url` attribute and `Redoc.init` argument,
// and Swagger UI's `url` and `urls` settings.
const DOCUMENT_LINKS: readonly RegExp[] = [
  /\bspec-url\s*=\s*["']([^"']+)["']/gi,
  /\bRedoc\.init\(\s*["']([^"']+)["']/g,
  /["']?\burl["']?\s*:\s*["']([^"']+)["']/g
]
const SETTINGS_SCRIPTS: readonly RegExp[] = [
  /<script\s[^>]*?\bsrc\s*=\s*["']([^"']*swagger-initializer\.js[^"']*)["']/gi
]

// The addresses `patterns` find in `text`, read against `page`, without repeats, up to
// DOCS_PAGE_LINK_LIMIT; one on another site or that a read-only run must not request is dropped.
const linksIn = (text: string, page: URL, patterns: readonly RegExp[]): string[] => {
  const links = new Set<string>()
  for (const pattern of patterns) {
    for (const [, address = ''] of text.matchAll(pattern)) {
      const isResolvable = URL.canParse(address, page)
      if (!isResolvable) continue
      const link = new URL(address, page)
      link.hash = ''
      const isFollowable =
        link.origin === page.origin && link.href !== page.href && isSafeAddress(link)
      if (isFollowable) links.add(link.href)
    }
  }
  return [...links].slice(0, DOCS_PAGE_LINK_LIMIT)
}

// What a Swagger UI or Redoc page, or its settings script, names as its document, each address
// read against `pageUrl` as a browser reads it. Any other text names nothing.
export const extractOpenApiDocumentLinks = (
  text: string,
  pageUrl: string
): OpenApiDocumentLinks => {
  const isDocsPage = isApiDocsPage(text)
  if (!isDocsPage) return { documents: [], scripts: [] }
  const page = new URL(pageUrl)
  return {
    documents: linksIn(text, page, DOCUMENT_LINKS),
    scripts: linksIn(text, page, SETTINGS_SCRIPTS)
  }
}
