import assert from 'node:assert/strict'
import test from 'node:test'

import { E2eFixtureError } from '../e2e/errors/E2eFixtureError.ts'
import { E2eWorkflowState } from '../e2e/stages/E2eWorkflowState.ts'

const LOADED_PAGE = {
  path: '/pricing',
  url: 'https://site.example/pricing',
  status: 200,
  title: 'Pricing'
}
const FOLLOWED_LINK = {
  from: 'https://site.example/',
  to: 'https://site.example/pricing',
  href: 'https://site.example/pricing'
}

void test('a state reads back the loaded page it was given', () => {
  const state = E2eWorkflowState.empty().withLoadedPage(LOADED_PAGE)

  assert.deepEqual(state.requireLoadedPage(), LOADED_PAGE)
})

void test('a state reads back the followed link it was given', () => {
  const state = E2eWorkflowState.empty().withFollowedLink(FOLLOWED_LINK)

  assert.deepEqual(state.requireFollowedLink(), FOLLOWED_LINK)
})

const API_ANSWER = {
  operation: {
    method: 'GET' as const,
    path: '/pets',
    url: 'https://site.example/pets',
    secured: false,
    bodySchemas: [],
    responses: [{ status: '200', contentTypes: ['application/json'] }]
  },
  status: 200,
  contentType: 'application/json',
  body: ''
}

void test('a state reads back the API answer it was given', () => {
  const state = E2eWorkflowState.empty().withApiAnswer(API_ANSWER)

  assert.deepEqual(state.requireApiAnswer(), API_ANSWER)
})

void test('adding a value keeps the values the state already had', () => {
  const state = E2eWorkflowState.empty().withLoadedPage(LOADED_PAGE).withFollowedLink(FOLLOWED_LINK)

  assert.deepEqual(state.requireLoadedPage(), LOADED_PAGE)
  assert.deepEqual(state.requireFollowedLink(), FOLLOWED_LINK)
})

void test('a with call returns a copy and leaves the state it was called on unchanged', () => {
  const empty = E2eWorkflowState.empty()

  const withPage = empty.withLoadedPage(LOADED_PAGE)

  assert.notEqual(withPage, empty)
  assert.throws(() => empty.requireLoadedPage(), E2eFixtureError)
})

void test('requiring a value the state lacks names what is missing', () => {
  const empty = E2eWorkflowState.empty()

  assert.throws(() => empty.requireLoadedPage(), {
    name: 'E2eFixtureError',
    message: 'The run state has no loaded page.'
  })
  assert.throws(() => empty.requireFollowedLink(), {
    name: 'E2eFixtureError',
    message: 'The run state has no followed link.'
  })
  assert.throws(() => empty.requireApiAnswer(), {
    name: 'E2eFixtureError',
    message: 'The run state has no API answer.'
  })
})
