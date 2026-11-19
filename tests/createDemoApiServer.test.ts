import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import test from 'node:test'

import { request } from '@playwright/test'
import { DEMO_API_HOST, DEMO_API_PORT } from '../demo/constants.ts'
import { startDemoApiServer } from '../demo/startDemoApiServer.ts'
import { stopDemoApiServer } from '../demo/stopDemoApiServer.ts'
import { ApiCheck } from '../e2e/ApiCheck.ts'
import { OPENAPI_DOCUMENT_PATHS } from '../e2e/constants.ts'
import { discoverOpenApiDocument } from '../e2e/discoverOpenApiDocument.ts'
import { fetchOpenApiDocument } from '../e2e/fetchOpenApiDocument.ts'
import { findApiContentTypeProblems } from '../e2e/fixtures/findApiContentTypeProblems.ts'
import { findApiStatusProblems } from '../e2e/fixtures/findApiStatusProblems.ts'
import { requestApiOperation } from '../e2e/fixtures/requestApiOperation.ts'
import { planApiOperations } from '../e2e/planApiOperations.ts'
import { readE2eTargets } from '../e2e/readE2eTargets.ts'
import { resolveE2eTarget } from '../e2e/resolveE2eTarget.ts'
import { targetsFilePath } from '../e2e/targetsFilePath.ts'
import { withSiteRequest } from '../e2e/withSiteRequest.ts'

// Serves the demo API on a free port for one test and hands it the API's address.
const withDemoApi = async (work: (baseUrl: string) => Promise<void>): Promise<void> => {
  const server = await startDemoApiServer(0, '127.0.0.1')
  const { port } = server.address() as AddressInfo
  try {
    await work(`http://127.0.0.1:${String(port)}`)
  } finally {
    await stopDemoApiServer(server)
  }
}

const planDemoApi = async (baseUrl: string) => {
  const discovered = await withSiteRequest({ ignoreHttpsErrors: false }, (siteRequest) =>
    discoverOpenApiDocument(
      { target: 'demo-api', baseUrl, apiSpecPaths: OPENAPI_DOCUMENT_PATHS },
      (url) => fetchOpenApiDocument(siteRequest, url)
    )
  )
  return planApiOperations(discovered.document, discovered.url)
}

void test('an API run finds the demo API’s document and skips what it cannot request', async () => {
  await withDemoApi(async (baseUrl) => {
    const plan = await planDemoApi(baseUrl)

    assert.deepEqual(
      plan.operations.map((operation) => operation.url.slice(baseUrl.length)),
      [
        '/api/books',
        '/api/books/search?q=tide',
        '/api/books/1',
        '/api/authors',
        '/api/authors/1',
        '/api/stats',
        '/api/account'
      ]
    )
    assert.deepEqual(plan.skipped, [
      {
        path: '/books/{bookId}/reviews/{reviewId}',
        reason: 'the document gives no example value for its path parameter "reviewId"'
      },
      { path: '/session/logout', reason: 'its path suggests it ends a session or changes data' }
    ])
  })
})

void test('the checks find each bug seeded in the demo API, and nothing else', async () => {
  await withDemoApi(async (baseUrl) => {
    const plan = await planDemoApi(baseUrl)
    const context = await request.newContext()
    const findings: Record<string, string[]> = {}
    try {
      for (const operation of plan.operations) {
        const answer = await requestApiOperation(context, operation)
        findings[operation.path] = [
          ...findApiStatusProblems(answer),
          ...findApiContentTypeProblems(answer)
        ]
      }
    } finally {
      await context.dispose()
    }

    assert.deepEqual(findings, {
      '/books': [],
      '/books/search': [],
      '/books/{bookId}': [],
      '/authors': ['answered HTTP 200 as text/html; the document declares application/json'],
      '/authors/{authorId}': ['answered HTTP 500, a server error'],
      '/stats': ['answered HTTP 202, which the document does not declare (declared: 200)'],
      '/account': []
    })
  })
})

void test('the repo’s demo-api target expects exactly the failures the checks find', async () => {
  const settings = resolveE2eTarget('demo-api', readE2eTargets(targetsFilePath({})))

  await withDemoApi(async (baseUrl) => {
    const plan = await planDemoApi(baseUrl)
    const context = await request.newContext()
    const failures: { path: string; check: ApiCheck }[] = []
    try {
      for (const operation of plan.operations) {
        const answer = await requestApiOperation(context, operation)
        const hasContentTypeProblem = findApiContentTypeProblems(answer).length > 0
        const hasStatusProblem = findApiStatusProblems(answer).length > 0
        if (hasContentTypeProblem)
          failures.push({ path: operation.path, check: ApiCheck.CONTENT_TYPE })
        if (hasStatusProblem) failures.push({ path: operation.path, check: ApiCheck.STATUS })
      }
    } finally {
      await context.dispose()
    }

    assert.deepEqual(failures, settings.expectedApiFailures)
  })
})

void test('the demo API refuses a request that would change its data', async () => {
  await withDemoApi(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/books`, { method: 'POST' })

    assert.equal(response.status, 405)
  })
})

void test('the repo’s demo-api target has an API run serve the demo API where serve:demo-api does', () => {
  const settings = resolveE2eTarget('demo-api', readE2eTargets(targetsFilePath({})))

  assert.equal(settings.servesDemoApi, true)
  assert.equal(settings.baseUrl, `http://${DEMO_API_HOST}:${String(DEMO_API_PORT)}`)
})
