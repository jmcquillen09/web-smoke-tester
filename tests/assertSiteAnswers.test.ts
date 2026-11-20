import assert from 'node:assert/strict'
import { createServer } from 'node:https'
import test from 'node:test'

import { assertSiteAnswers } from '../e2e/assertSiteAnswers.ts'
import { withSiteRequest } from '../e2e/withSiteRequest.ts'
import { createSelfSignedCertificate } from './fixtures/createSelfSignedCertificate.ts'
import { withServerListening } from './fixtures/withServerListening.ts'

const HOST = 'localhost'

// Serves a site behind a self-signed certificate for one test: every address answers `status`.
const withSelfSignedSite = async (
  status: number,
  work: (baseUrl: string) => Promise<void>
): Promise<void> => {
  const server = createServer(createSelfSignedCertificate(HOST), (_request, response) => {
    response.writeHead(status, { 'content-type': 'text/plain' }).end('answered')
  })
  await withServerListening(server, 'https', HOST, work)
}

const settingsFor = (baseUrl: string) => ({ target: 'staging', baseUrl, paths: ['/start'] })

void test('a self-signed site answers a run whose target accepts its certificate', async () => {
  await withSelfSignedSite(200, async (baseUrl) => {
    await withSiteRequest({ ignoreHttpsErrors: true }, async (siteRequest) => {
      const response = await siteRequest.get(`${baseUrl}/start`)

      assert.equal(await response.text(), 'answered')
      await assertSiteAnswers(settingsFor(baseUrl), siteRequest)
    })
  })
})

void test('a self-signed site stops a run that does not accept it, naming the certificate and the setting', async () => {
  await withSelfSignedSite(200, async (baseUrl) => {
    await withSiteRequest({ ignoreHttpsErrors: false }, async (siteRequest) => {
      await assert.rejects(
        assertSiteAnswers(settingsFor(baseUrl), siteRequest),
        (error: unknown) =>
          error instanceof Error &&
          error.name === 'E2eConfigurationError' &&
          error.message.startsWith(`The staging target did not answer at ${baseUrl}/start: `) &&
          /certificate/i.test(error.message) &&
          error.message.endsWith(
            'Set the target\'s "ignoreHttpsErrors" to true to accept the site\'s certificate.'
          )
      )
    })
  })
})

void test('an error status is an answer', async () => {
  await withSelfSignedSite(500, async (baseUrl) => {
    await withSiteRequest({ ignoreHttpsErrors: true }, (siteRequest) =>
      assertSiteAnswers(settingsFor(baseUrl), siteRequest)
    )
  })
})

void test('a site nothing serves stops the run without advice about certificates', async () => {
  let closedUrl = ''
  await withSelfSignedSite(200, async (baseUrl) => {
    closedUrl = baseUrl
  })

  await withSiteRequest({ ignoreHttpsErrors: true }, async (siteRequest) => {
    await assert.rejects(
      assertSiteAnswers(settingsFor(closedUrl), siteRequest),
      (error: unknown) =>
        error instanceof Error &&
        error.name === 'E2eConfigurationError' &&
        !error.message.includes('ignoreHttpsErrors')
    )
  })
})

void test('a redirect is an answer, and where it leads is never requested', async () => {
  const requested: string[] = []
  const server = createServer(createSelfSignedCertificate(HOST), (request, response) => {
    requested.push(request.url ?? '')
    response.writeHead(302, { location: '/session/logout' }).end()
  })

  await withServerListening(server, 'https', HOST, async (baseUrl) => {
    await withSiteRequest({ ignoreHttpsErrors: true }, (siteRequest) =>
      assertSiteAnswers(settingsFor(baseUrl), siteRequest)
    )

    assert.deepEqual(requested, ['/start'])
  })
})
