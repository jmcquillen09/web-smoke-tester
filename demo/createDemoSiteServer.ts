import type { Server } from 'node:http'
import { createFixedAnswerServer } from './createFixedAnswerServer.ts'
import type { DemoAnswer } from './DemoAnswer.ts'

interface DemoPage {
  readonly title: string
  readonly description: string
  readonly heading: string
  /** The page's own content, as HTML placed under its heading. */
  readonly content: string
}

const HTML_TYPE = 'text/html; charset=utf-8'
const SVG_TYPE = 'image/svg+xml'

const NAVIGATION = [
  { path: '/', label: 'Home' },
  { path: '/books', label: 'Books' },
  { path: '/about', label: 'About' }
]

// Every page's layout fits a phone: the content column is capped, and images and the menu shrink.
const STYLES = `
:root { color-scheme: light dark; font: 16px/1.6 system-ui, sans-serif; }
body { margin: 0 auto; max-width: 42rem; padding: 1rem; }
nav ul { display: flex; flex-wrap: wrap; gap: 1rem; list-style: none; padding: 0; }
img { display: block; height: auto; max-width: 100%; }
input { box-sizing: border-box; font: inherit; max-width: 100%; }
footer { border-top: 1px solid; margin-top: 2rem; }
`

const cover = (title: string, colour: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="320" viewBox="0 0 240 320"><rect width="240" height="320" fill="${colour}"/><text x="120" y="160" fill="#fff" font-family="sans-serif" font-size="20" text-anchor="middle">${title}</text></svg>`

const html = (status: number, page: DemoPage): DemoAnswer => ({
  status,
  contentType: HTML_TYPE,
  body: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="${page.description}">
    <title>${page.title}</title>
    <link rel="icon" href="/favicon.svg" type="${SVG_TYPE}">
    <link rel="stylesheet" href="/styles.css">
  </head>
  <body>
    <header>
      <nav aria-label="Main">
        <ul>
          ${NAVIGATION.map(({ path, label }) => `<li><a href="${path}">${label}</a></li>`).join('')}
        </ul>
      </nav>
    </header>
    <main>
      <h1>${page.heading}</h1>
      ${page.content}
    </main>
    <footer><p>The Tide Library is a demo site: fixed pages, nothing to sign in to.</p></footer>
  </body>
</html>
`
})

const NOT_FOUND = html(404, {
  title: 'Page not found | The Tide Library',
  description: 'The Tide Library has no page at this address.',
  heading: 'Page not found',
  content: '<p>Nothing is at this address. <a href="/">Return to the home page</a>.</p>'
})

// What each address answers: three pages that link to one another, and the files they load.
const ANSWERS: Readonly<Record<string, DemoAnswer>> = {
  '/': html(200, {
    title: 'The Tide Library',
    description: 'A small library by the sea, with a short shelf of books about weather and water.',
    heading: 'The Tide Library',
    content: `<p>A small library by the sea. Browse <a href="/books">the books on the shelf</a> or
      read <a href="/about">about the library</a>.</p>
      <img src="/images/tide-tables.svg" alt="Cover of The Tide Tables" width="240" height="320">`
  }),
  '/books': html(200, {
    title: 'Books | The Tide Library',
    description: 'The books on the shelf at the Tide Library, each with its cover.',
    heading: 'Books',
    content: `<form action="/books" method="get" role="search">
        <label for="title">Find a book by title</label>
        <input id="title" name="title" type="search">
      </form>
      <h2>The Tide Tables</h2>
      <img src="/images/tide-tables.svg" alt="Cover of The Tide Tables" width="240" height="320">
      <h2>A Field Guide to Fog</h2>
      <img src="/images/field-guide-to-fog.svg" alt="Cover of A Field Guide to Fog" width="240" height="320">`
  }),
  '/about': html(200, {
    title: 'About | The Tide Library',
    description: 'What the Tide Library is, and where to find its books.',
    heading: 'About the library',
    content: `<p>The Tide Library keeps a short shelf of books about weather and water. See
      <a href="/books">the books</a>, or go back to <a href="/">the home page</a>.</p>`
  }),
  '/styles.css': { status: 200, contentType: 'text/css; charset=utf-8', body: STYLES },
  '/favicon.svg': { status: 200, contentType: SVG_TYPE, body: cover('T', '#1d4e6b') },
  '/images/tide-tables.svg': {
    status: 200,
    contentType: SVG_TYPE,
    body: cover('The Tide Tables', '#1d4e6b')
  },
  '/images/field-guide-to-fog.svg': {
    status: 200,
    contentType: SVG_TYPE,
    body: cover('A Field Guide to Fog', '#5b6770')
  }
}

const READ_ONLY: DemoAnswer = {
  status: 405,
  contentType: 'text/plain; charset=utf-8',
  body: 'The demo site is read-only.'
}

// The demo library site: fixed pages that pass every page check, read-only, and no state between
// requests. The caller chooses the port with `listen`.
export const createDemoSiteServer = (): Server =>
  createFixedAnswerServer(ANSWERS, NOT_FOUND, READ_ONLY)
