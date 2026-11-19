import assert from 'node:assert/strict'
import test from 'node:test'

import { findListedPathValue } from '../e2e/findListedPathValue.ts'

const listed = (content: unknown, parameter = 'reviewId'): string | undefined =>
  findListedPathValue(JSON.stringify(content), parameter)

void test('the first item’s property named as the parameter is the value', () => {
  assert.equal(listed([{ id: 1, reviewId: 'r-7' }, { reviewId: 'r-8' }]), 'r-7')
})

void test('an item without that property gives its id', () => {
  assert.equal(listed([{ id: 7, rating: 5 }]), '7')
  assert.equal(listed([{ id: 'r-7' }]), 'r-7')
})

void test('a list of plain values gives its first value', () => {
  assert.equal(listed(['r-7', 'r-8']), 'r-7')
  assert.equal(listed([7, 8]), '7')
})

void test('a list an object holds under one of its properties is read the same way', () => {
  assert.equal(listed({ total: 2, items: [{ id: 7 }, { id: 8 }] }), '7')
})

void test('a value a path cannot carry is no value', () => {
  assert.equal(listed([{ id: { value: 7 } }]), undefined)
  assert.equal(listed([{ id: '' }]), undefined)
  assert.equal(listed([{ id: true }]), undefined)
  assert.equal(listed([[7]]), undefined)
})

void test('an answer that lists nothing gives no value', () => {
  assert.equal(listed([]), undefined)
  assert.equal(listed({ total: 0 }), undefined)
  assert.equal(listed([{ rating: 5 }]), undefined)
  assert.equal(listed('r-7'), undefined)
  assert.equal(findListedPathValue('<ul><li>r-7</li></ul>', 'reviewId'), undefined)
  assert.equal(findListedPathValue('', 'reviewId'), undefined)
})
