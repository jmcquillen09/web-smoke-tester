// The checks an API run makes on each operation's answer.
export type ApiCheck = 'status' | 'contentType' | 'body'

export const ApiCheck = {
  STATUS: 'status',
  CONTENT_TYPE: 'contentType',
  BODY: 'body'
} satisfies Record<string, ApiCheck>
