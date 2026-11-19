import type { Server } from 'node:http'
import { createFixedAnswerServer } from './createFixedAnswerServer.ts'
import { demoApiAnswers } from './demoApiAnswers.ts'
import { jsonAnswer } from './jsonAnswer.ts'

// The demo library API: fixed data, read-only, and no state between requests, so every run against
// it gets the same answers. The caller chooses the port with `listen`.
export const createDemoApiServer = (): Server =>
  createFixedAnswerServer(
    demoApiAnswers,
    jsonAnswer(404, { error: 'Nothing has that id.' }),
    jsonAnswer(405, { error: 'The demo API is read-only.' })
  )
