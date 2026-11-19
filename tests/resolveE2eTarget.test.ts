import assert from 'node:assert/strict'
import test from 'node:test'

import { OPENAPI_DOCUMENT_PATHS } from '../e2e/constants.ts'
import type { E2eTargetsFile } from '../e2e/E2eTargetsFile.ts'
import { resolveE2eTarget } from '../e2e/resolveE2eTarget.ts'

const targetsWith = (targets: E2eTargetsFile['targets']): E2eTargetsFile => ({
  defaultTarget: 'staging',
  targets
})

void test('a target with only a base URL tests its start page and crawls by default', () => {
  const targets = targetsWith({ staging: { baseUrl: 'https://staging.example.com' } })

  assert.deepEqual(resolveE2eTarget('staging', targets), {
    target: 'staging',
    baseUrl: 'https://staging.example.com',
    paths: ['/'],
    crawlLimit: 10,
    ignoreHttpsErrors: false,
    blockTracking: true,
    apiSpecPaths: [...OPENAPI_DOCUMENT_PATHS],
    servesDemoApi: false,
    servesDemoSite: false,
    expectedApiFailures: []
  })
})

void test('a base URL with a path starts there, and the site is its origin', () => {
  const targets = targetsWith({ docs: { baseUrl: 'https://example.com/docs/?lang=en' } })

  const settings = resolveE2eTarget('docs', targets)

  assert.equal(settings.baseUrl, 'https://example.com')
  assert.deepEqual(settings.paths, ['/docs/?lang=en'])
})

void test('a target keeps the paths, crawl limit and certificate setting it names', () => {
  const targets = targetsWith({
    local: {
      baseUrl: 'https://localhost:3000',
      paths: ['/', '/pricing', '/'],
      crawlLimit: 0,
      ignoreHttpsErrors: true
    }
  })

  assert.deepEqual(resolveE2eTarget('local', targets), {
    target: 'local',
    baseUrl: 'https://localhost:3000',
    paths: ['/', '/pricing'],
    crawlLimit: 0,
    ignoreHttpsErrors: true,
    blockTracking: true,
    apiSpecPaths: [...OPENAPI_DOCUMENT_PATHS],
    servesDemoApi: false,
    servesDemoSite: false,
    expectedApiFailures: []
  })
})

void test('an unknown target name lists the names the file holds', () => {
  const targets = targetsWith({
    staging: { baseUrl: 'https://staging.example.com' },
    production: { baseUrl: 'https://www.example.com' }
  })

  assert.throws(() => resolveE2eTarget('nowhere', targets), {
    name: 'E2eConfigurationError',
    message: 'Unknown e2e target "nowhere". Expected one of: staging, production.'
  })
})

void test('a name that is only an object built-in is not a target', () => {
  const targets = targetsWith({ staging: { baseUrl: 'https://staging.example.com' } })

  assert.throws(() => resolveE2eTarget('constructor', targets), /Unknown e2e target "constructor"/)
})

void test('a disabled target refuses to run and gives its reason', () => {
  const targets = targetsWith({
    production: { baseUrl: 'https://www.example.com', disabled: 'waiting for sign-off' }
  })

  assert.throws(() => resolveE2eTarget('production', targets), {
    name: 'E2eConfigurationError',
    message: 'Refusing the production target: waiting for sign-off.'
  })
})

void test('a base URL that is not a web address is refused by name', () => {
  for (const baseUrl of ['staging.example.com', 'ftp://example.com', '']) {
    const targets = targetsWith({ staging: { baseUrl } })

    assert.throws(() => resolveE2eTarget('staging', targets), {
      name: 'E2eConfigurationError',
      message: `The staging target's baseUrl "${baseUrl}" is not an http or https URL.`
    })
  }
})

void test('a path must start from the root of the site', () => {
  for (const path of ['pricing', 'https://other.example/', '//other.example/']) {
    const targets = targetsWith({
      staging: { baseUrl: 'https://staging.example.com', paths: [path] }
    })

    assert.throws(
      () => resolveE2eTarget('staging', targets),
      (error: unknown) => error instanceof Error && error.message.includes(`path "${path}"`)
    )
  }
})

void test('an empty paths list is refused rather than testing nothing', () => {
  const targets = targetsWith({ staging: { baseUrl: 'https://staging.example.com', paths: [] } })

  assert.throws(() => resolveE2eTarget('staging', targets), /paths list is empty/)
})

void test('a target can leave analytics unblocked and size its own desktop window', () => {
  const targets = targetsWith({
    staging: {
      baseUrl: 'https://staging.example.com',
      blockTracking: false,
      viewport: { width: 1920, height: 1080 }
    }
  })

  const settings = resolveE2eTarget('staging', targets)

  assert.equal(settings.blockTracking, false)
  assert.deepEqual(settings.viewport, { width: 1920, height: 1080 })
})

void test('a target without a window size has none, so the browser keeps its own', () => {
  const targets = targetsWith({ staging: { baseUrl: 'https://staging.example.com' } })

  assert.equal('viewport' in resolveE2eTarget('staging', targets), false)
})

void test('a target that names its OpenAPI document is looked for there only', () => {
  const targets = targetsWith({
    staging: { baseUrl: 'https://staging.example.com', apiSpecPath: '/api/v3/openapi.json' }
  })

  assert.deepEqual(resolveE2eTarget('staging', targets).apiSpecPaths, ['/api/v3/openapi.json'])
})

void test('an OpenAPI document path must start from the root of the site', () => {
  const targets = targetsWith({
    staging: { baseUrl: 'https://staging.example.com', apiSpecPath: 'https://other.example/api' }
  })

  assert.throws(() => resolveE2eTarget('staging', targets), {
    name: 'E2eConfigurationError'
  })
})

void test('an OpenAPI document path cannot name another site through URL normalisation', () => {
  for (const apiSpecPath of [
    '//other.example/api',
    '/\\other.example/api',
    '/\t/other.example/api'
  ]) {
    const targets = targetsWith({
      staging: { baseUrl: 'https://staging.example.com', apiSpecPath }
    })

    assert.throws(() => resolveE2eTarget('staging', targets), { name: 'E2eConfigurationError' })
  }
})

void test('an OpenAPI document path is judged for safety as a URL reads it', () => {
  const targets = targetsWith({
    staging: { baseUrl: 'https://staging.example.com', apiSpecPath: '/session/log\tout' }
  })

  assert.throws(() => resolveE2eTarget('staging', targets), { name: 'E2eConfigurationError' })
})

void test('an OpenAPI document path a read-only run may not request is refused', () => {
  const targets = targetsWith({
    staging: { baseUrl: 'https://staging.example.com', apiSpecPath: '/session/logout' }
  })

  assert.throws(() => resolveE2eTarget('staging', targets), {
    name: 'E2eConfigurationError',
    message:
      'The staging target\'s apiSpecPath "/session/logout" looks like an address that ends a session or changes data, which a run never requests.'
  })
})

void test('a target can have an API run serve the demo API at its local address', () => {
  const targets = targetsWith({
    demo: { baseUrl: 'http://localhost:4010', servesDemoApi: true }
  })

  assert.equal(resolveE2eTarget('demo', targets).servesDemoApi, true)
})

void test('the demo API is served only at a local http address with a port', () => {
  for (const baseUrl of ['https://www.example.com', 'http://localhost', 'https://localhost:4010']) {
    const targets = targetsWith({ demo: { baseUrl, servesDemoApi: true } })

    assert.throws(() => resolveE2eTarget('demo', targets), {
      name: 'E2eConfigurationError',
      message: `The demo target serves the demo API, so its baseUrl must be http://localhost:<port>; "${baseUrl}" is not.`
    })
  }
})

void test('a target keeps the API checks it expects to fail', () => {
  const targets = targetsWith({
    staging: {
      baseUrl: 'https://staging.example.com',
      expectedApiFailures: [{ path: '/stats', check: 'status' }]
    }
  })

  assert.deepEqual(resolveE2eTarget('staging', targets).expectedApiFailures, [
    { path: '/stats', check: 'status' }
  ])
})

void test('a target can have a site run serve the demo site at its local address', () => {
  const targets = targetsWith({
    demo: { baseUrl: 'http://localhost:4020', servesDemoSite: true }
  })

  assert.equal(resolveE2eTarget('demo', targets).servesDemoSite, true)
})

void test('the demo site is served only at a local http address with a port', () => {
  const targets = targetsWith({
    demo: { baseUrl: 'https://www.example.com', servesDemoSite: true }
  })

  assert.throws(() => resolveE2eTarget('demo', targets), {
    name: 'E2eConfigurationError',
    message:
      'The demo target serves the demo site, so its baseUrl must be http://localhost:<port>; "https://www.example.com" is not.'
  })
})

void test('one target cannot serve both demo servers', () => {
  const targets = targetsWith({
    demo: { baseUrl: 'http://localhost:4020', servesDemoApi: true, servesDemoSite: true }
  })

  assert.throws(() => resolveE2eTarget('demo', targets), {
    name: 'E2eConfigurationError',
    message:
      'The demo target sets both servesDemoApi and servesDemoSite; one address serves one of them.'
  })
})
