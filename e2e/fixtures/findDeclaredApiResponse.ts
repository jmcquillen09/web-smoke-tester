import type { ApiOperation } from '../ApiOperation.ts'

const DEFAULT_RESPONSE = 'default'

// The response the document declares for a status: its exact code first, then its range (`2XX`),
// then `default`; undefined when the operation declares none of them.
export const findDeclaredApiResponse = (
  operation: ApiOperation,
  status: number
): ApiOperation['responses'][number] | undefined => {
  const code = String(status)
  const range = `${code.charAt(0)}XX`
  const declared = (key: string): ApiOperation['responses'][number] | undefined =>
    operation.responses.find((response) => response.status.toUpperCase() === key.toUpperCase())
  return declared(code) ?? declared(range) ?? declared(DEFAULT_RESPONSE)
}
