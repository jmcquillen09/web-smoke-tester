// The checks an API run makes on each operation's answer.
export type ApiCheck = 'status' | 'contentType' | 'body' | 'auth'

export const ApiCheck = {
  STATUS: 'status',
  CONTENT_TYPE: 'contentType',
  BODY: 'body',
  AUTH: 'auth'
} satisfies Record<string, ApiCheck>
