import assert from 'node:assert/strict'
import test from 'node:test'

import { extractSameSiteLinks } from '../e2e/extractSameSiteLinks.ts'

const SITE = 'https://site.example'
const linksIn = (html: string, pageUrl = `${SITE}/`): string[] =>
  extractSameSiteLinks(html, pageUrl, SITE)

void test('links to the site’s own pages come back as paths, in document order', () => {
  const html = `
    <nav><a href="/pricing">Pricing</a> <a class="cta" href='/about?team=1'>About</a></nav>
    <a href=${SITE}/contact>Contact</a>`

  assert.deepEqual(linksIn(html), ['/pricing', '/about?team=1', '/contact'])
})

void test('a relative link resolves against the page it is on', () => {
  assert.deepEqual(linksIn('<a href="guide">Guide</a>', `${SITE}/docs/`), ['/docs/guide'])
})

void test('a page linked twice, or by fragment, is listed once', () => {
  const html = '<a href="/about">About</a><a href="/about#team">Team</a><a href="/about">Again</a>'

  assert.deepEqual(linksIn(html), ['/about'])
})

void test('other sites, other schemes and empty links are left out', () => {
  const html = `
    <a href="https://other.example/">Elsewhere</a>
    <a href="//cdn.example/x">CDN</a>
    <a href="mailto:hello@site.example">Mail</a>
    <a href="tel:+15550100">Call</a>
    <a href="javascript:void(0)">Script</a>
    <a href="">Empty</a>`

  assert.deepEqual(linksIn(html), [])
})

void test('files are not pages to test', () => {
  const html =
    '<a href="/brochure.pdf">PDF</a><a href="/logo.PNG">Logo</a><a href="/feed.xml">Feed</a>'

  assert.deepEqual(linksIn(html), [])
})

void test('links that could end a session or change data are never followed', () => {
  const html = `
    <a href="/logout">Log out</a><a href="/account/sign-out">Sign out</a>
    <a href="/items/3/delete">Delete</a><a href="/news?unsubscribe=1">Unsubscribe</a>
    <a href="/account">Account</a>`

  assert.deepEqual(linksIn(html), ['/account'])
})

void test('an escaped ampersand in a link is read as the browser reads it', () => {
  assert.deepEqual(linksIn('<a href="/search?q=a&amp;page=2">Next</a>'), ['/search?q=a&page=2'])
})
