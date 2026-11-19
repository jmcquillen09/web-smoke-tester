// The status each same-site address answered a link check with, shared by a worker's tests so a link
// in every page's navigation is requested once, not once per page.
export type UrlStatuses = Map<string, Promise<number>>
