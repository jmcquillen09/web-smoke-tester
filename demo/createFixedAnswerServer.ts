import { createServer, type Server } from 'node:http'
import type { DemoAnswer } from './DemoAnswer.ts'

const READ_METHODS: readonly string[] = ['GET', 'HEAD']

// A read-only server with no state between requests: each path has one fixed answer, a path it
// does not know gets `notFound`, and any method but GET and HEAD gets `readOnly`.
export const createFixedAnswerServer = (
  answers: Readonly<Record<string, DemoAnswer>>,
  notFound: DemoAnswer,
  readOnly: DemoAnswer
): Server =>
  createServer((request, response) => {
    const isReadRequest = READ_METHODS.includes(request.method ?? '')
    const { pathname } = new URL(request.url ?? '/', 'http://demo.invalid')
    const hasAnswer = Object.hasOwn(answers, pathname)
    const known = hasAnswer ? answers[pathname] : undefined
    const isHeadRequest = request.method === 'HEAD'
    const answer = isReadRequest ? (known ?? notFound) : readOnly
    response.writeHead(answer.status, { 'content-type': answer.contentType })
    response.end(isHeadRequest ? undefined : answer.body)
  })
