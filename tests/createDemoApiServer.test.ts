import assert from 'node:assert/strict'
import test from 'node:test'

import { request } from '@playwright/test'
import { DEMO_API_HOST, DEMO_API_PORT } from '../demo/constants.ts'
import { demoApi } from '../demo/demoApi.ts'
import { ApiCheck } from '../e2e/ApiCheck.ts'
import { OPENAPI_DOCUMENT_PATHS } from '../e2e/constants.ts'
import { discoverOpenApiDocument } from '../e2e/discoverOpenApiDocument.ts'
import { fetchApiList } from '../e2e/fetchApiList.ts'
import { fetchOpenApiDocument } from '../e2e/fetchOpenApiDocument.ts'
import type { ApiAnswer } from '../e2e/fixtures/ApiAnswer.ts'
import { findApiAuthProblems } from '../e2e/fixtures/findApiAuthProblems.ts'
import { findApiBodyProblems } from '../e2e/fixtures/findApiBodyProblems.ts'
import { findApiContentTypeProblems } from '../e2e/fixtures/findApiContentTypeProblems.ts'
import { findApiStatusProblems } from '../e2e/fixtures/findApiStatusProblems.ts'
import { requestApiOperation } from '../e2e/fixtures/requestApiOperation.ts'
import { planApiOperationsWithListedValues } from '../e2e/planApiOperationsWithListedValues.ts'
import { readE2eTargets } from '../e2e/readE2eTargets.ts'
import { resolveE2eTarget } from '../e2e/resolveE2eTarget.ts'
import { targetsFilePath } from '../e2e/targetsFilePath.ts'
import { withSiteRequest } from '../e2e/withSiteRequest.ts'
import { withRunningDemoServer } from './fixtures/withRunningDemoServer.ts'

// Every API check's judgment, in the order a target lists an operation's expected failures.
const PROBLEM_FINDERS: Record<ApiCheck, (answer: ApiAnswer) => string[]> = {
  [ApiCheck.BODY]: findApiBodyProblems,
  [ApiCheck.CONTENT_TYPE]: findApiContentTypeProblems,
  [ApiCheck.STATUS]: findApiStatusProblems,
  [ApiCheck.AUTH]: findApiAuthProblems
}

const withDemoApi = (work: (baseUrl: string) => Promise<void>): Promise<void> =>
  withRunningDemoServer(demoApi, work)

const planDemoApi = (baseUrl: string) =>
  withSiteRequest({ ignoreHttpsErrors: false }, async (siteRequest) => {
    const discovered = await discoverOpenApiDocument(
      { target: 'demo-api', baseUrl, apiSpecPaths: OPENAPI_DOCUMENT_PATHS },
      (url) => fetchOpenApiDocument(siteRequest, url)
    )
    const { plan } = await planApiOperationsWithListedValues(
      discovered.document,
      discovered.url,
      (url) => fetchApiList(siteRequest, url)
    )
    return plan
  })

void test('an API run plans the demo API’s operations, one with a listed value, and skips the unsafe one', async () => {
  await withDemoApi(async (baseUrl) => {
    const plan = await planDemoApi(baseUrl)

    assert.deepEqual(
      plan.operations.map((operation) => operation.url.slice(baseUrl.length)),
      [
        '/api/books',
        '/api/books/search?q=tide',
        '/api/books/1',
        '/api/books/1/reviews',
        '/api/books/1/reviews/7',
        '/api/authors',
        '/api/authors/1',
        '/api/stats',
        '/api/account',
        '/api/account/orders'
      ]
    )
    assert.deepEqual(plan.skipped, [
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
        findings[operation.path] = Object.values(PROBLEM_FINDERS).flatMap((findProblems) =>
          findProblems(answer)
        )
      }
    } finally {
      await context.dispose()
    }

    assert.deepEqual(findings, {
      '/books': [],
      '/books/search': ["/0 must have required property 'authorId'"],
      '/books/{bookId}': [],
      '/books/{bookId}/reviews': [],
      '/books/{bookId}/reviews/{reviewId}': [],
      '/authors': ['answered HTTP 200 as text/html; the document declares application/json'],
      '/authors/{authorId}': ['answered HTTP 500, a server error'],
      '/stats': ['answered HTTP 202, which the document does not declare (declared: 200)'],
      '/account': [],
      '/account/orders': [
        'answered HTTP 200 to a request without credentials; the document marks the operation as secured, so it should answer 401 or 403'
      ]
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
        for (const [check, findProblems] of Object.entries(PROBLEM_FINDERS)) {
          const hasProblem = findProblems(answer).length > 0
          if (hasProblem) failures.push({ path: operation.path, check: check as ApiCheck })
        }
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
