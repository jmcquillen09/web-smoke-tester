# API tests from an OpenAPI document

`npm run test:api-playwright [target]` finds the OpenAPI document a site publishes, plans one
request per `GET` operation in it, and checks each answer against what the document declares. It
needs no access to the API's code and only ever reads: no other method is requested, no credentials
are sent, and no request body is built.

It shares the site suite's targets, stages, runners and reports; read
[`e2e-playwright.md`](e2e-playwright.md) for those. This page covers what is particular to the API
run.

## Running it

```bash
npx playwright install chromium         # once per machine
npm run test:api-playwright             # the defaultTarget in targets.json
npm run test:api-playwright petstore    # the target named "petstore"
```

Arguments after the target pass to `playwright test`, as in the site suite:
`npm run test:api-playwright -- petstore -g "/pet"`. The runner prints the document it found, how
many operations it tests and every `GET` operation it skips with the reason. Reports land where the
site suite's do. Exit codes: `0` every test passed; `1` a test failed, the site offers no document,
or the document has no operation a run can request; `2` the run was refused before it started.

Only test APIs you own or have permission to test.

## Finding the document

A target's `apiSpecPath` in [`targets.json`](../targets.json) names the document, as a path from
the site's root. Without it the runner asks the site for each address in `OPENAPI_DOCUMENT_PATHS`
([`e2e/constants.ts`](../e2e/constants.ts)) in order and takes the first that answers with a
document ([`e2e/discoverOpenApiDocument.ts`](../e2e/discoverOpenApiDocument.ts)).

A document is OpenAPI 3 in JSON, served from the target's own site
([`e2e/fetchOpenApiDocument.ts`](../e2e/fetchOpenApiDocument.ts)). A Swagger 2.0 document, a YAML
document and a redirect to another site are each no document.

## Which operations a run requests

[`e2e/planApiOperations.ts`](../e2e/planApiOperations.ts) turns the document into requests:

- **`GET` operations only**, at most `API_OPERATION_LIMIT` of them, in the document's order.
- **On the document's own site.** The address is the document's first `servers` entry (its own
  site's root when it has none) plus the path. A server on another site, or one with variables,
  skips every operation.
- **Required path and query parameters take the document's own values**: the parameter's
  `example`, then its schema's `example`, `default` and first `enum` value. Optional parameters are
  left out. A required parameter with no such value, and a required header or cookie parameter,
  skip the operation.
- **A path `UNSAFE_LINK` matches is never requested** (`logout`, `delete` and the like), as in
  every other check.
- **`$ref` is followed for parameters and responses** under the document's `components`; any other
  `$ref` there skips the operation.

The runner hands the planned operations to Playwright as `E2E_API_OPERATIONS`. A run started
without the runner has none, so the API specs write no tests.

## What each check does

Every planned operation gets one test per check. The specs live under [`e2e/api/`](../e2e/api) and
run in the `api` Playwright project.

| Spec                            | Stage                      | Fails when                                                                                                                                                |
| ------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `documentedStatus.spec.ts`      | `CheckApiStatusStage`      | the answer is a server error (500 or above), or its status is not one the document declares for the operation by code, range (`2XX`) or `default`         |
| `documentedContentType.spec.ts` | `CheckApiContentTypeStage` | the document declares body content types for the answered status and the answer's is none of them, counting a declared range (`application/*`) as a match |

- **An operation the document marks as secured may answer 401 or 403**: a run sends no credentials,
  so that refusal is the documented behaviour, whether or not the document lists the status.
- **A server error fails even when the document declares it.** A plain `GET` built from the
  document's own examples is a request the server is expected to handle.
- **An operation that never answers is a setup failure** (`E2eFixtureError`), not a failed check.
- **The body itself is not validated** against the response schema.

## How it is built

- `ApiOperationStage` is the base of every API stage: its `setup` requests the stage's operation
  with `requestApiOperation` and puts the `ApiAnswer` in the run state, so each check stage only
  writes `execute` and reads it with `state.requireApiAnswer()`.
- The judgments are pure functions that return findings as data: `findApiStatusProblems`,
  `findApiContentTypeProblems` and `findDeclaredApiResponse` under
  [`e2e/fixtures/`](../e2e/fixtures), unit-tested in [`tests/`](../tests).
- The API specs use the suite's shared `test`, which opens a browser page for every test, so an API
  run needs Chromium installed although its requests never go through the page.

To add an API check: write the fixture that judges an `ApiAnswer` and returns findings, create
`e2e/stages/<Name>Stage.ts` extending `ApiOperationStage`, run it from an isolated spec under
`e2e/api/` that loops over `activeApiOperations()`, and add its row to the table above.
