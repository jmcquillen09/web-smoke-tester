// The checks an API run makes on each operation's answer.
export type ApiCheck = 'status' | 'contentType'

export const ApiCheck = {
  STATUS: 'status',
  CONTENT_TYPE: 'contentType'
} satisfies Record<string, ApiCheck>
