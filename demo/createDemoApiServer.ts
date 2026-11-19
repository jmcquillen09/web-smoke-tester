import { readFileSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import path from 'node:path'
import { DEMO_OPENAPI_FILE } from './constants.ts'

interface DemoAnswer {
  readonly status: number
  readonly contentType: string
  readonly body: string
}

const JSON_TYPE = 'application/json; charset=utf-8'
const HTML_TYPE = 'text/html; charset=utf-8'

const json = (status: number, value: object): DemoAnswer => ({
  status,
  contentType: JSON_TYPE,
  body: JSON.stringify(value)
})

const BOOKS = [
  { id: 1, title: 'The Tide Tables', authorId: 1 },
  { id: 2, title: 'A Field Guide to Fog', authorId: 2 }
]
const AUTHORS = [
  { id: 1, name: 'Ines Marlow' },
  { id: 2, name: 'Tomas Reed' }
]
const NOT_FOUND = json(404, { error: 'Nothing has that id.' })

// What each address answers a reader who sent no credentials. Three answers break the document on
// purpose: /api/authors, /api/authors/1 and /api/stats.
const ANSWERS: Readonly<Record<string, DemoAnswer>> = {
  '/openapi.json': {
    status: 200,
    contentType: JSON_TYPE,
    body: readFileSync(path.join(import.meta.dirname, DEMO_OPENAPI_FILE), 'utf8')
  },
  '/api/books': json(200, BOOKS),
  '/api/books/search': json(200, BOOKS.slice(0, 1)),
  '/api/books/1': json(200, { id: 1, title: 'The Tide Tables', authorId: 1 }),
  '/api/books/2': json(200, { id: 2, title: 'A Field Guide to Fog', authorId: 2 }),
  // Seeded bug: the document declares application/json for this answer.
  '/api/authors': {
    status: 200,
    contentType: HTML_TYPE,
    body: `<ul>${AUTHORS.map((author) => `<li>${author.name}</li>`).join('')}</ul>`
  },
  // Seeded bug: a server error for the id the document itself gives as its example.
  '/api/authors/1': json(500, { error: 'The author could not be read.' }),
  // Seeded bug: the document declares only 200 for this operation.
  '/api/stats': json(202, { books: BOOKS.length, authors: AUTHORS.length }),
  '/api/account': json(401, { error: 'Sign in to read your account.' })
}

const READ_METHODS: readonly string[] = ['GET', 'HEAD']

// The demo library API: fixed data, read-only, and no state between requests, so every run against
// it gets the same answers. The caller chooses the port with `listen`.
export const createDemoApiServer = (): Server =>
  createServer((request, response) => {
    const isReadRequest = READ_METHODS.includes(request.method ?? '')
    const { pathname } = new URL(request.url ?? '/', 'http://demo-api.invalid')
    const known = Object.hasOwn(ANSWERS, pathname) ? ANSWERS[pathname] : undefined
    const answer = isReadRequest
      ? (known ?? NOT_FOUND)
      : json(405, { error: 'The demo API is read-only.' })
    response.writeHead(answer.status, { 'content-type': answer.contentType })
    response.end(request.method === 'HEAD' ? undefined : answer.body)
  })
