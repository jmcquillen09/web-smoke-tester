import assert from 'node:assert/strict'
import test from 'node:test'

import { isSitePath } from '../e2e/isSitePath.ts'

void test('a path from the site’s root starts with exactly one slash', () => {
  assert.equal(isSitePath('/'), true)
  assert.equal(isSitePath('/pricing'), true)
})

void test('a path that could name another host, or is relative, is no site path', () => {
  assert.equal(isSitePath('//other.example/data'), false)
  assert.equal(isSitePath('/\\other.example/data'), false)
  assert.equal(isSitePath('/\t/other.example/data'), false)
  assert.equal(isSitePath('pricing'), false)
  assert.equal(isSitePath(''), false)
})
