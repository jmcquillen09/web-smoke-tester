import assert from 'node:assert/strict'
import test from 'node:test'

import { createRunMetadata } from '../e2e/createRunMetadata.ts'

const STAGING = { target: 'staging', baseUrl: 'https://staging.example.com' }

void test('a local run records only the target, its site and the browsers it covered', () => {
  assert.deepEqual(createRunMetadata(STAGING, ['chrome'], {}), {
    target: 'staging',
    site: 'https://staging.example.com',
    browsers: 'chrome'
  })
})

void test('a run started by CI records the run and deployment IDs it was given', () => {
  assert.deepEqual(
    createRunMetadata(STAGING, ['chrome', 'firefox', 'safari'], {
      E2E_RUN_ID: '01JRUN',
      E2E_DEPLOYMENT_ID: 'dep-1'
    }),
    {
      target: 'staging',
      site: 'https://staging.example.com',
      browsers: 'chrome,firefox,safari',
      runId: '01JRUN',
      deploymentId: 'dep-1'
    }
  )
})

void test('an empty identity variable is left out rather than recorded blank', () => {
  assert.deepEqual(
    createRunMetadata(STAGING, ['edge'], { E2E_RUN_ID: '', E2E_DEPLOYMENT_ID: 'dep-1' }),
    {
      target: 'staging',
      site: 'https://staging.example.com',
      browsers: 'edge',
      deploymentId: 'dep-1'
    }
  )
})
