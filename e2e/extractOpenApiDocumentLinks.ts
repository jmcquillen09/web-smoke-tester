import { DOCS_PAGE_LINK_LIMIT } from './constants.ts'
import { isSafeAddress } from './isSafeAddress.ts'

// What marks a text as a Swagger UI or Redoc page, or as the script that sets one up.
const DOCS_PAGE = /swagger-?ui|redoc/i
// Where such a page names the document it shows: Redoc's `spec-url` attribute and `Redoc.init`
// argument, Swagger UI's `url` and `urls` settings, and the script Swagger UI keeps them in.
const DOCUMENT_LINKS: readonly RegExp[] = [
  /\bspec-url\s*=\s*["']([^"']+)["']/gi,
  /\bRedoc\.init\(\s*["']([^"']+)["']/g,
  /["']?\burl["']?\s*:\s*["']([^"']+)["']/g,
  /<script\s[^>]*?\bsrc\s*=\s*["']([^"']*swagger-initializer\.js[^"']*)["']/gi
]

// The addresses a Swagger UI or Redoc page names as its document, in the page's order within each
// way of naming one and without repeats, up to DOCS_PAGE_LINK_LIMIT. Any other text names none. An
// address on another site, and one a read-only run must not request (UNSAFE_LINK), is dropped.
export const extractOpenApiDocumentLinks = (text: string, pageUrl: string): string[] => {
  const isDocsPage = DOCS_PAGE.test(text)
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
