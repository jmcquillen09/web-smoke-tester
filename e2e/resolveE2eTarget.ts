import { DEFAULT_CRAWL_LIMIT, OPENAPI_DOCUMENT_PATHS } from './constants.ts'
import { assertRunnableTarget } from './assertRunnableTarget.ts'
import type { E2eTargetSettings } from './E2eTargetSettings.ts'
import { isSafeAddress } from './isSafeAddress.ts'
import { isSitePath } from './isSitePath.ts'
import type { E2eTargetsFile } from './E2eTargetsFile.ts'
import { E2eConfigurationError } from './errors/E2eConfigurationError.ts'

const WEB_PROTOCOLS: readonly string[] = ['http:', 'https:']

const siteUrlOf = (name: string, baseUrl: string): URL => {
  const isUrl = URL.canParse(baseUrl)
  const isWebUrl = isUrl && WEB_PROTOCOLS.includes(new URL(baseUrl).protocol)
  if (!isWebUrl) {
    throw new E2eConfigurationError(
      `The ${name} target's baseUrl "${baseUrl}" is not an http or https URL.`
    )
  }
  return new URL(baseUrl)
}

const LOCAL_HOSTS: readonly string[] = ['localhost', '127.0.0.1']

// A run can serve the demo site only at an address on this machine, on a port it can listen on.
const assertDemoSiteUrl = (name: string, siteUrl: URL): void => {
  const isLocalAddress =
    siteUrl.protocol === 'http:' && LOCAL_HOSTS.includes(siteUrl.hostname) && siteUrl.port !== ''
  if (!isLocalAddress) {
    throw new E2eConfigurationError(
      `The ${name} target serves the demo site, so its baseUrl must be http://localhost:<port>; "${siteUrl.origin}" is not.`
    )
  }
}

const assertSitePath = (name: string, path: string): void => {
  const hasSitePath = isSitePath(path)
  if (!hasSitePath) {
    throw new E2eConfigurationError(
      `The ${name} target's path "${path}" must start with one "/", as a path from the site's root.`
    )
  }
}

// A run requests the document's address, so it must be one a read-only run may request.
const assertSafeApiSpecPath = (name: string, path: string, siteUrl: URL): void => {
  const hasSafeAddress = isSafeAddress(new URL(path, siteUrl))
  if (!hasSafeAddress) {
    throw new E2eConfigurationError(
      `The ${name} target's apiSpecPath "${path}" looks like an address that ends a session or changes data, which a run never requests.`
    )
  }
}

// The one place a target name becomes a site. Every name comes from the targets file; a name it
// does not hold, a target it switches off and a malformed entry each stop the run with the reason.
export const resolveE2eTarget = (name: string, targets: E2eTargetsFile): E2eTargetSettings => {
  const definition = Object.hasOwn(targets.targets, name) ? targets.targets[name] : undefined
  const isKnownTarget = definition !== undefined
  if (!isKnownTarget) {
    throw new E2eConfigurationError(
      `Unknown e2e target "${name}". Expected one of: ${Object.keys(targets.targets).join(', ')}.`
    )
  }
  assertRunnableTarget(name, definition)

  const siteUrl = siteUrlOf(name, definition.baseUrl)
  const paths = definition.paths ?? [`${siteUrl.pathname}${siteUrl.search}`]
  const hasPaths = paths.length > 0
  if (!hasPaths) {
    throw new E2eConfigurationError(`The ${name} target's paths list is empty; name at least "/".`)
  }
  for (const path of paths) assertSitePath(name, path)
  const apiSpecPaths =
    definition.apiSpecPath === undefined ? OPENAPI_DOCUMENT_PATHS : [definition.apiSpecPath]
  for (const path of apiSpecPaths) {
    assertSitePath(name, path)
    assertSafeApiSpecPath(name, path, siteUrl)
  }
  const servesDemoSite = definition.servesDemoSite ?? false
  if (servesDemoSite) assertDemoSiteUrl(name, siteUrl)

  return {
    target: name,
    baseUrl: siteUrl.origin,
    paths: [...new Set(paths)],
    crawlLimit: definition.crawlLimit ?? DEFAULT_CRAWL_LIMIT,
    ignoreHttpsErrors: definition.ignoreHttpsErrors ?? false,
    blockTracking: definition.blockTracking ?? true,
    apiSpecPaths: [...apiSpecPaths],
    servesDemoSite,
    expectedApiFailures: definition.expectedApiFailures ?? [],
    ...(definition.viewport === undefined ? {} : { viewport: definition.viewport })
  }
}
