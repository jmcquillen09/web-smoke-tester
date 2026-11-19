import assert from 'node:assert/strict'
import test from 'node:test'

import { isSafeAddress } from '../e2e/isSafeAddress.ts'

const SITE = 'https://site.example'

void test('an ordinary address is safe to request', () => {
  assert.equal(isSafeAddress(new URL('/books?sort=title', SITE)), true)
})

void test('an address whose path or query suggests a change is unsafe', () => {
  assert.equal(isSafeAddress(new URL('/session/logout', SITE)), false)
  assert.equal(isSafeAddress(new URL('/items?action=delete', SITE)), false)
})

void test('an address is judged as a URL reads it, not as it is written', () => {
  assert.equal(isSafeAddress(new URL('/log\tout', SITE)), false)
})
