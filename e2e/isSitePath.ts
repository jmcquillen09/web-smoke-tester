// Whether `path` is a path from a site's root: one leading "/", so it can name no other host.
export const isSitePath = (path: string): boolean => path.startsWith('/') && !path.startsWith('//')
