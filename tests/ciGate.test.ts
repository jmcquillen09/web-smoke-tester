import assert from 'node:assert/strict'
import test from 'node:test'

import { findUnsuccessfulCiJobs } from '../support/findUnsuccessfulCiJobs.ts'
import { runNodeScript } from './fixtures/runNodeScript.ts'

const runGate = (jobs: string): Promise<{ readonly code: number; readonly output: string }> =>
  runNodeScript(['scripts/ciGate.ts'], { CI_JOBS: jobs })

const jobsWith = (results: Readonly<Record<string, string>>): string =>
  JSON.stringify(
    Object.fromEntries(Object.entries(results).map(([name, result]) => [name, { result }]))
  )

void test('only a job that succeeded is left out of the unsuccessful ones', () => {
  const jobs = {
    checks: { result: 'success' },
    'demo-run': { result: 'failure' },
    lint: { result: 'cancelled' },
    audit: { result: 'skipped' }
  }

  assert.deepEqual(findUnsuccessfulCiJobs(jobs), [
    'demo-run: failure',
    'lint: cancelled',
    'audit: skipped'
  ])
  assert.deepEqual(findUnsuccessfulCiJobs({ checks: { result: 'success' } }), [])
})

void test('the gate passes when every job it waits on succeeded', async () => {
  const run = await runGate(jobsWith({ checks: 'success', 'demo-run': 'success' }))

  assert.equal(run.code, 0, run.output)
  assert.match(run.output, /every job succeeded \(checks, demo-run\)/)
})

void test('one job that failed, was cancelled or was skipped fails the gate, whatever the others did', async () => {
  for (const result of ['failure', 'cancelled', 'skipped']) {
    const run = await runGate(jobsWith({ checks: 'success', 'demo-run': result }))

    assert.equal(run.code, 1, result)
    assert.match(run.output, new RegExp(`not every job succeeded \\(demo-run: ${result}\\)`))
  }
})

void test('a gate told of no job, or of nothing it can read, fails', async () => {
  for (const jobs of ['{}', '', 'not json', '{"checks":"success"}']) {
    const run = await runGate(jobs)

    assert.equal(run.code, 1, jobs)
  }
})
