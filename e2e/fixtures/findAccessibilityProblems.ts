import type { Page } from '@playwright/test'
import { MAX_LISTED_FINDINGS } from '../constants.ts'

// The basic accessibility problems on the loaded page, one line each, empty when there are none:
// - the document names no language (`<html lang>`), which screen readers pronounce the page by;
// - the page does not have exactly one `<h1>`;
// - an image has no `alt` attribute (`alt=""` marks a decorative image and is fine);
// - a form field has no accessible name: no `<label>`, `aria-label`, `aria-labelledby`, `title` or
//   `placeholder` (the sources browsers and axe-core name a field from).
// An image or field the page does not show (`display: none`, `visibility: hidden`, a `hidden`
// attribute, a hidden ancestor) reaches no visitor and no screen reader, so it is not judged.
// Each kind lists at most `MAX_LISTED_FINDINGS` elements, then counts the rest.
export const findAccessibilityProblems = (page: Page): Promise<string[]> =>
  page.evaluate((maxListed) => {
    const UNLABELED_INPUT_TYPES = ['hidden', 'submit', 'button', 'reset', 'image']

    const listed = (kind: string, descriptions: string[]): string[] => {
      const shown = descriptions.slice(0, maxListed).map((description) => `${kind}: ${description}`)
      const unlisted = descriptions.length - shown.length
      return unlisted > 0 ? [...shown, `${kind}: …and ${String(unlisted)} more`] : shown
    }

    const isHiddenFromAssistiveTechnology = (element: Element): boolean =>
      element.getClientRects().length === 0 ||
      getComputedStyle(element).visibility !== 'visible' ||
      element.closest('[aria-hidden="true"]') !== null ||
      element.getAttribute('role') === 'presentation' ||
      element.getAttribute('role') === 'none'

    const hasLabel = (field: Element): boolean => {
      const hasOwnName = ['aria-label', 'aria-labelledby', 'title', 'placeholder'].some(
        (attribute) => (field.getAttribute(attribute) ?? '').trim() !== ''
      )
      const isWrappedInLabel = field.closest('label') !== null
      const hasLabelFor =
        field.id !== '' && document.querySelector(`label[for="${CSS.escape(field.id)}"]`) !== null
      return hasOwnName || isWrappedInLabel || hasLabelFor
    }

    const describeField = (field: Element): string => {
      const tag = field.tagName.toLowerCase()
      const name = field.getAttribute('name') ?? field.id
      return name === '' ? `<${tag}>` : `<${tag} name="${name}">`
    }

    const problems: string[] = []

    const language = (document.documentElement.getAttribute('lang') ?? '').trim()
    if (language === '') problems.push('the <html> element has no lang attribute')

    const headingCount = document.querySelectorAll('h1').length
    if (headingCount !== 1) problems.push(`expected one <h1>, found ${String(headingCount)}`)

    const imagesWithoutAlt = [...document.querySelectorAll('img:not([alt])')]
      .filter((image) => !isHiddenFromAssistiveTechnology(image))
      .map((image) => image.getAttribute('src') ?? '(no src)')
    problems.push(...listed('image without alt', imagesWithoutAlt))

    const unlabeledFields = [...document.querySelectorAll('input, select, textarea')]
      .filter((field) => !UNLABELED_INPUT_TYPES.includes(field.getAttribute('type') ?? ''))
      .filter((field) => !isHiddenFromAssistiveTechnology(field) && !hasLabel(field))
      .map(describeField)
    problems.push(...listed('form field without a label', unlabeledFields))

    return problems
  }, MAX_LISTED_FINDINGS)
