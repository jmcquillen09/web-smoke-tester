const PROBE_ORIGIN = 'http://site.invalid'

// Whether `path` is a path from a site's root: it starts with "/" and, read as a URL does (which
// drops tabs and takes a backslash for a slash), stays on the site it is resolved against.
export const isSitePath = (path: string): boolean =>
  path.startsWith('/') &&
  URL.canParse(path, PROBE_ORIGIN) &&
  new URL(path, PROBE_ORIGIN).origin === PROBE_ORIGIN
