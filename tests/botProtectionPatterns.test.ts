import assert from 'node:assert/strict'
import test from 'node:test'

import { BOT_CHALLENGE_TEXT, BOT_CHALLENGE_URL, BOT_PROTECTION_REQUEST } from '../e2e/constants.ts'

void test('a bot-protection product’s own requests are recognised', () => {
  for (const url of [
    'https://site.example/common.js?single',
    'https://site.example/akam/13/5a2b1c',
    'https://site.example/_Incapsula_Resource?SWJIYLWA=719d34d31c8e3a6e',
    'https://site.example/cdn-cgi/challenge-platform/h/b/orchestrate/chl_page/v1',
    'https://site.example/ips.js?KP_UIDz=abc'
  ]) {
    assert.match(url, BOT_PROTECTION_REQUEST)
  }
})

void test('the site’s ordinary scripts and pages are not taken for bot protection', () => {
  for (const url of [
    'https://site.example/common.js',
    'https://site.example/static/js/common.js?v=3',
    'https://site.example/assets/tips.js',
    'https://site.example/api/products?single=1',
    'https://site.example/blog/akamai-vs-cloudflare'
  ]) {
    assert.doesNotMatch(url, BOT_PROTECTION_REQUEST)
  }
})

void test('a challenge page is recognised by its address or its wording', () => {
  assert.match('https://site.example/?solution=1&js_challenge=1&jsc_token=2', BOT_CHALLENGE_URL)
  for (const text of [
    'Just a moment...',
    'Prove your humanity',
    'Attention Required! | Cloudflare',
    'Pardon Our Interruption',
    'Verifying you are human. This may take a few seconds.'
  ]) {
    assert.match(text, BOT_CHALLENGE_TEXT)
  }
})

void test('ordinary titles and addresses are not taken for a challenge', () => {
  assert.doesNotMatch('https://site.example/search?q=captcha+alternatives', BOT_CHALLENGE_URL)
  for (const text of ['Home', 'Quick Order', 'Safety & Compliance Resources', 'Contact us']) {
    assert.doesNotMatch(text, BOT_CHALLENGE_TEXT)
  }
})
