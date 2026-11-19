import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { createRequire } from 'node:module'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { demoApi } from '../demo/demoApi.ts'
import { startDemoServer } from '../demo/startDemoServer.ts'
import { stopDemoServer } from '../demo/stopDemoServer.ts'
import {
  API_OPERATIONS_VARIABLE,
  API_PROJECT,
  TARGET_VARIABLE,
  TARGETS_FILE_VARIABLE
} from '../e2e/constants.ts'
import { runNodeScript } from './fixtures/runNodeScript.ts'
import { writeTargetsFile } from './fixtures/writeTargetsFile.ts'

const HOST = '127.0.0.1'
const PLAYWRIGHT_CLI = createRequire(import.meta.url).resolve('@playwright/test/cli')

void test('Playwright started without a runner serves the target’s demo server and shuts it down', async () => {
  const free = await startDemoServer(demoApi, 0, HOST)
  const baseUrl = `http://${HOST}:${String((free.address() as AddressInfo).port)}`
  await stopDemoServer(demoApi, free)
  const scratch = mkdtempSync(path.join(tmpdir(), 'runner-free-run-'))
  const operation = {
    method: 'GET',
    path: '/books',
    url: `${baseUrl}/api/books`,
    secured: false,
    responses: [{ status: '200', contentTypes: ['application/json'] }]
  }

  const run = await runNodeScript(
    [
      PLAYWRIGHT_CLI,
      'test',
      `--project=${API_PROJECT}`,
      '--reporter=list',
      `--output=${path.join(scratch, 'results')}`
    ],
    {
      PLAYWRIGHT_BROWSERS_PATH: path.join(scratch, 'no-browsers'),
      [TARGETS_FILE_VARIABLE]: writeTargetsFile(
        JSON.stringify({
          defaultTarget: 'demo',
          targets: { demo: { baseUrl, servesDemoApi: true } }
        })
      ),
      [TARGET_VARIABLE]: 'demo',
      [API_OPERATIONS_VARIABLE]: JSON.stringify([operation])
    }
  )

  assert.equal(run.code, 0, run.output)
  assert.match(run.output, /2 passed/)
  await assert.rejects(fetch(baseUrl))
})
