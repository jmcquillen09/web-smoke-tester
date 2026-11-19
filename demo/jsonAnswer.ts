import type { DemoAnswer } from './DemoAnswer.ts'

export const jsonAnswer = (status: number, value: object): DemoAnswer => ({
  status,
  contentType: 'application/json; charset=utf-8',
  body: JSON.stringify(value)
})
