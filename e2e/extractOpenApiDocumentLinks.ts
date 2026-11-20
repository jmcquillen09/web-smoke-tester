import { DOCS_PAGE_LINK_LIMIT } from './constants.ts'
import { isApiDocsPage } from './isApiDocsPage.ts'
import { isSafeAddress } from './isSafeAddress.ts'

// Where a docs page names its document: Redoc's `spec-url` attribute and `Redoc.init` argument,
// Swagger UI's `url` and `urls` settings, and the script Swagger UI keeps them in.
const DOCUMENT_LINKS: readonly RegExp[] = [
  /\bspec-url\s*=\s*["']([^"']+)["']/gi,
  /\bRedoc\.init\(\s*["']([^"']+)["']/g,
  /["']?\burl["']?\s*:\s*["']([^"']+)["']/g,
  /<script\s[^>]*?\bsrc\s*=\s*["']([^"']*swagger-initializer\.js[^"']*)["']/gi
]

// The addresses a Swagger UI or Redoc page names as its document, without repeats, up to
// DOCS_PAGE_LINK_LIMIT; one on another site or that UNSAFE_LINK matches is dropped.
export const extractOpenApiDocumentLinks = (text: string, pageUrl: string): string[] => {
  const isDocsPage = isApiDocsPage(text)
  if (!isDocsPage) return []
  const page = new URL(pageUrl)
  const links = new Set<string>()
  for (const pattern of DOCUMENT_LINKS) {
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
