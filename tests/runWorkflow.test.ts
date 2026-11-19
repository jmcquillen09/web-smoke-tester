import assert from 'node:assert/strict'
import test from 'node:test'

import type { E2eStepRunner } from '../e2e/stages/E2eStepRunner.ts'
import { E2eWorkflowState } from '../e2e/stages/E2eWorkflowState.ts'
import { runWorkflow } from '../e2e/stages/runWorkflow.ts'
import { createRecordingStage, type StageCall } from './fixtures/createRecordingStage.ts'

const runStep: E2eStepRunner = (_title, body) => body()

const callsOf = (calls: readonly StageCall[]): readonly string[] =>
  calls.map(({ stage, phase }) => `${stage}.${phase}`)

const receivedBy = (calls: readonly StageCall[], stage: string): E2eWorkflowState | undefined =>
  calls.find((call) => call.stage === stage && call.phase === 'execute')?.received

void test('a workflow calls only execute, on each stage in path order', async () => {
  const calls: StageCall[] = []
  const path = [
    createRecordingStage('Load page', calls),
    createRecordingStage('Check links', calls)
  ]

  await runWorkflow(path, E2eWorkflowState.empty(), runStep)

  assert.deepEqual(callsOf(calls), ['Load page.execute', 'Check links.execute'])
})

void test('each stage executes from the state the stage before it returned', async () => {
  const calls: StageCall[] = []
  const initial = E2eWorkflowState.empty()
  const path = [
    createRecordingStage('Load page', calls),
    createRecordingStage('Check links', calls)
  ]

  const final = await runWorkflow(path, initial, runStep)

  assert.equal(receivedBy(calls, 'Load page'), initial)
  assert.equal(receivedBy(calls, 'Check links')?.requireLoadedPage().path, '/Load page:execute')
  assert.equal(final.requireLoadedPage().path, '/Check links:execute')
})

void test('the first failing stage stops the stages after it and is named in its step', async () => {
  const calls: StageCall[] = []
  const titles: string[] = []
  const recordStep: E2eStepRunner = (title, body) => {
    titles.push(title)
    return body()
  }
  const path = [
    createRecordingStage('Load page', calls),
    createRecordingStage('Check links', calls, ['execute']),
    createRecordingStage('Check images', calls)
  ]

  await assert.rejects(runWorkflow(path, E2eWorkflowState.empty(), recordStep), {
    message: 'Check links execute failed'
  })
  assert.deepEqual(callsOf(calls), ['Load page.execute', 'Check links.execute'])
  assert.deepEqual(titles, ['Load page', 'Check links'])
})

void test('each stage of a workflow reports as one step named for the stage', async () => {
  const titles: string[] = []
  const recordStep: E2eStepRunner = (title, body) => {
    titles.push(title)
    return body()
  }
  const path = [createRecordingStage('Load page', []), createRecordingStage('Check links', [])]

  await runWorkflow(path, E2eWorkflowState.empty(), recordStep)

  assert.deepEqual(titles, ['Load page', 'Check links'])
})
