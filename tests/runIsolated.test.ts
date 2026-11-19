import assert from 'node:assert/strict'
import test from 'node:test'

import type { E2eStepRunner } from '../e2e/stages/E2eStepRunner.ts'
import { runIsolated } from '../e2e/stages/runIsolated.ts'
import { createRecordingStage, type StageCall } from './fixtures/createRecordingStage.ts'

const runStep: E2eStepRunner = (_title, body) => body()

const phasesOf = (calls: readonly StageCall[]): readonly string[] => calls.map(({ phase }) => phase)

const pathReceivedBy = (calls: readonly StageCall[], phase: string): string | undefined =>
  calls.find((call) => call.phase === phase)?.received?.requireLoadedPage().path

void test('an isolated stage runs setup, execute and teardown in order', async () => {
  const calls: StageCall[] = []

  await runIsolated(createRecordingStage('Check links', calls), runStep)

  assert.deepEqual(phasesOf(calls), ['setup', 'execute', 'teardown'])
})

void test('execute and teardown receive the state setup built', async () => {
  const calls: StageCall[] = []

  await runIsolated(createRecordingStage('Check links', calls), runStep)

  assert.equal(pathReceivedBy(calls, 'execute'), '/Check links:setup')
  assert.equal(pathReceivedBy(calls, 'teardown'), '/Check links:setup')
})

void test('an isolated run returns the state execute built', async () => {
  const returned = await runIsolated(createRecordingStage('Check links', []), runStep)

  assert.equal(returned.requireLoadedPage().path, '/Check links:execute')
})

void test('a failing execute still tears the stage down', async () => {
  const calls: StageCall[] = []
  const stage = createRecordingStage('Check links', calls, ['execute'])

  await assert.rejects(runIsolated(stage, runStep), { message: 'Check links execute failed' })
  assert.deepEqual(phasesOf(calls), ['setup', 'execute', 'teardown'])
})

void test('a teardown that fails after a failed execute reports both errors', async () => {
  const calls: StageCall[] = []
  const stage = createRecordingStage('Check links', calls, ['execute', 'teardown'])

  await assert.rejects(runIsolated(stage, runStep), (error: unknown) => {
    assert.ok(error instanceof AggregateError)
    assert.deepEqual(
      error.errors.map((cause: Error) => cause.message),
      ['Check links execute failed', 'Check links teardown failed']
    )
    return true
  })
})

void test('a teardown that fails after a passing execute rejects with its own error', async () => {
  const stage = createRecordingStage('Check links', [], ['teardown'])

  await assert.rejects(runIsolated(stage, runStep), { message: 'Check links teardown failed' })
})

void test('a failing setup builds no state, so execute and teardown do not run', async () => {
  const calls: StageCall[] = []
  const stage = createRecordingStage('Check links', calls, ['setup'])

  await assert.rejects(runIsolated(stage, runStep), { message: 'Check links setup failed' })
  assert.deepEqual(phasesOf(calls), ['setup'])
})

void test('each phase of an isolated stage reports as its own step', async () => {
  const titles: string[] = []
  const recordStep: E2eStepRunner = (title, body) => {
    titles.push(title)
    return body()
  }

  await runIsolated(createRecordingStage('Check links', []), recordStep)

  assert.deepEqual(titles, ['Check links: setup', 'Check links: execute', 'Check links: teardown'])
})
