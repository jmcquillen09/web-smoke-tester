import type { DemoAnswer } from './DemoAnswer.ts'

// A demo server's answer with `value` as its JSON body.
export const jsonAnswer = (status: number, value: object): DemoAnswer => ({
  status,
  contentType: 'application/json; charset=utf-8',
  body: JSON.stringify(value)
})
