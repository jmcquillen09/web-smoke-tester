import { UNSAFE_LINK } from './constants.ts'

// Whether a read-only run may request `address`: its path and query, as a URL reads them, do not
// look like something that ends a session or changes data.
export const isSafeAddress = (address: URL): boolean =>
  !UNSAFE_LINK.test(`${address.pathname}${address.search}`)
