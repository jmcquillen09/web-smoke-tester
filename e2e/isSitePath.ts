// A second slash, or the backslash a URL reads as one, would make the next part a host name.
const HOST_PREFIX = /^\/[/\\]/

// Whether `path` is a path from a site's root: one leading "/", so it can name no other host.
export const isSitePath = (path: string): boolean => path.startsWith('/') && !HOST_PREFIX.test(path)
