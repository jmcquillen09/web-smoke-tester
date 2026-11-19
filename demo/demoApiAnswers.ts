import { readFileSync } from 'node:fs'
import path from 'node:path'
import { DEMO_OPENAPI_FILE, DEMO_OPENAPI_PATH } from './constants.ts'
import type { DemoAnswer } from './DemoAnswer.ts'
import { jsonAnswer } from './jsonAnswer.ts'

const JSON_TYPE = 'application/json; charset=utf-8'
const HTML_TYPE = 'text/html; charset=utf-8'

const BOOKS = [
  { id: 1, title: 'The Tide Tables', authorId: 1 },
  { id: 2, title: 'A Field Guide to Fog', authorId: 2 }
]
const AUTHORS = [
  { id: 1, name: 'Ines Marlow' },
  { id: 2, name: 'Tomas Reed' }
]

// What each address answers a reader who sent no credentials. Three answers break the document on
// purpose: /api/authors, /api/authors/1 and /api/stats.
export const demoApiAnswers: Readonly<Record<string, DemoAnswer>> = {
  [DEMO_OPENAPI_PATH]: {
    status: 200,
    contentType: JSON_TYPE,
    body: readFileSync(path.join(import.meta.dirname, DEMO_OPENAPI_FILE), 'utf8')
  },
  '/api/books': jsonAnswer(200, BOOKS),
  '/api/books/search': jsonAnswer(200, BOOKS.slice(0, 1)),
  '/api/books/1': jsonAnswer(200, { id: 1, title: 'The Tide Tables', authorId: 1 }),
  '/api/books/2': jsonAnswer(200, { id: 2, title: 'A Field Guide to Fog', authorId: 2 }),
  // Seeded bug: the document declares application/json for this answer.
  '/api/authors': {
    status: 200,
    contentType: HTML_TYPE,
    body: `<ul>${AUTHORS.map((author) => `<li>${author.name}</li>`).join('')}</ul>`
  },
  // Seeded bug: a server error for the id the document itself gives as its example.
  '/api/authors/1': jsonAnswer(500, { error: 'The author could not be read.' }),
  // Seeded bug: the document declares only 200 for this operation.
  '/api/stats': jsonAnswer(202, { books: BOOKS.length, authors: AUTHORS.length }),
  '/api/account': jsonAnswer(401, { error: 'Sign in to read your account.' })
}
