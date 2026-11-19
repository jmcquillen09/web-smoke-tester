# Dependency Reference

Official upstream documentation for primary project dependencies.

## Test engine

- Playwright (`@playwright/test`, end-to-end suite in `e2e/`): https://playwright.dev/docs/intro
  - `test.step` (one report step per e2e stage): https://playwright.dev/docs/api/class-test#test-step
  - Projects and dependencies (isolated before workflows): https://playwright.dev/docs/test-projects
- Node test runner (unit tests in `tests/`): https://nodejs.org/api/test.html
- Zod (the targets file and the pages handed to Playwright): https://zod.dev/

## Language and tooling

- TypeScript: https://www.typescriptlang.org/docs/
- Node.js, including running TypeScript directly: https://nodejs.org/en/docs/
- Prettier: https://prettier.io/docs/
