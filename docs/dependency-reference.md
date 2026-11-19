# Dependency Reference

Official upstream documentation for primary project dependencies.

## Test engine

- Playwright (`@playwright/test`, end-to-end suite in `e2e/`): https://playwright.dev/docs/intro
  - `test.step` (one report step per e2e stage): https://playwright.dev/docs/api/class-test#test-step
  - Projects and dependencies (isolated before workflows): https://playwright.dev/docs/test-projects
- Node test runner (unit tests in `tests/`): https://nodejs.org/api/test.html
- Zod (the targets file, the OpenAPI document, and the pages and operations handed to Playwright): https://zod.dev/
- OpenAPI Specification (the document the API run reads): https://spec.openapis.org/oas/latest.html
  - Playwright `APIRequestContext` (how an API stage requests an operation): https://playwright.dev/docs/api/class-apirequestcontext

## Language and tooling

- TypeScript: https://www.typescriptlang.org/docs/
- Node.js, including running TypeScript directly: https://nodejs.org/en/docs/
- Prettier: https://prettier.io/docs/
