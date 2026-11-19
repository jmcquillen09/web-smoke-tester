import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { createRequire } from 'node:module'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { startDemoApiServer } from '../demo/startDemoApiServer.ts'
import { stopDemoApiServer } from '../demo/stopDemoApiServer.ts'
import type { ApiOperation } from '../e2e/ApiOperation.ts'
import {
  API_OPERATIONS_VARIABLE,
  API_PROJECT,
  TARGET_VARIABLE,
  TARGETS_FILE_VARIABLE
} from '../e2e/constants.ts'
import { writeTargetsFile } from './fixtures/writeTargetsFile.ts'

const HOST = '127.0.0.1'
const REPO_ROOT = path.join(import.meta.dirname, '..')
const PLAYWRIGHT_CLI = createRequire(import.meta.url).resolve('@playwright/test/cli')

// Runs the status spec on one `/stats` operation of a demo API whose target expects that check to
// fail, with no browser installed where Playwright looks, and resolves with the run's exit code.
const runStatusSpec = async (
  operationOf: (baseUrl: string) => Pick<ApiOperation, 'url' | 'responses'>
): Promise<{ code: number; output: string }> => {
  const server = await startDemoApiServer(0, HOST)
  const baseUrl = `http://${HOST}:${String((server.address() as AddressInfo).port)}`
  const scratch = mkdtempSync(path.join(tmpdir(), 'api-spec-run-'))
  const targetsFile = writeTargetsFile(
    JSON.stringify({
      defaultTarget: 'site',
      targets: { site: { baseUrl, expectedApiFailures: [{ path: '/stats', check: 'status' }] } }
    })
  )
  const operation: ApiOperation = {
    method: 'GET',
    path: '/stats',
    secured: false,
    ...operationOf(baseUrl)
  }
  try {
    return await new Promise((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [
          PLAYWRIGHT_CLI,
          'test',
          `--project=${API_PROJECT}`,
          '--grep=status',
          '--reporter=list',
          `--output=${path.join(scratch, 'results')}`
        ],
        {
          cwd: REPO_ROOT,
          env: {
            ...process.env,
            PLAYWRIGHT_BROWSERS_PATH: path.join(scratch, 'no-browsers'),
            [TARGETS_FILE_VARIABLE]: targetsFile,
            [TARGET_VARIABLE]: 'site',
            [API_OPERATIONS_VARIABLE]: JSON.stringify([operation])
          }
        }
      )
      let output = ''
      child.stdout.on('data', (chunk: Buffer) => (output += chunk.toString()))
      child.stderr.on('data', (chunk: Buffer) => (output += chunk.toString()))
      child.on('error', reject)
      child.on('close', (code) => {
        resolve({ code: code ?? 1, output })
      })
    })
  } finally {
    await stopDemoApiServer(server)
  }
}

void test('a check that fails as its target expects does not fail the run, and needs no browser', async () => {
  const run = await runStatusSpec((baseUrl) => ({
    url: `${baseUrl}/api/stats`,
    responses: [{ status: '200', contentTypes: [] }]
  }))

  assert.equal(run.code, 0, run.output)
  assert.match(run.output, /1 passed/)
})

void test('a check expected to fail that passes fails the run', async () => {
  const run = await runStatusSpec((baseUrl) => ({
    url: `${baseUrl}/api/stats`,
    responses: [{ status: '202', contentTypes: [] }]
  }))

  assert.equal(run.code, 1, run.output)
  assert.match(run.output, /Expected to fail, but passed/)
})

void test('an operation that never answers fails the run even when its check is expected to fail', async () => {
  const run = await runStatusSpec(() => ({
    url: `http://${HOST}:1/api/stats`,
    responses: [{ status: '200', contentTypes: [] }]
  }))

  assert.equal(run.code, 1, run.output)
  assert.match(run.output, /E2eFixtureError: GET .* did not answer/)
})
