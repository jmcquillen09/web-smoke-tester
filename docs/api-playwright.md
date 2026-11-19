# API tests from an OpenAPI document

`npm run test:api-playwright [target]` finds the OpenAPI document a site publishes, plans one
request per `GET` operation in it, and checks each answer against what the document declares. It
needs no access to the API's code and only ever reads: no other method is requested, no credentials
are sent, and no request body is built.

`npm run test:e2e-playwright [target]` runs these same API tests together with the web tests. There
a site with no document to test is told so and gets its web tests alone; here it fails the run.

It shares the site suite's targets, stages, runners and reports; read
[`e2e-playwright.md`](e2e-playwright.md) for those. This page covers what is particular to the API
run.

## Running it

```bash
npm run test:api-playwright             # the defaultTarget in targets.json: the bundled demo site
npm run test:api-playwright demo-api    # the bundled demo API
npm run test:api-playwright staging     # the target named "staging"
```

Arguments after the target pass to `playwright test`, as in the site suite:
`npm run test:api-playwright -- staging -g "/books"`. The runner prints the document it found, how
many operations it tests and every `GET` operation it skips with the reason. Reports land where the
site suite's do. Exit codes: `0` every test passed or failed as expected; `1` a test failed, the site
does not answer (a certificate the run does not accept is named as that), it offers no document, the document has no operation a run can request, or an expected failure names an
operation the run does not request; `2` the run was refused before it started.

Only test APIs you own or have permission to test.

## The demo API

The repo bundles a small read-only API to run the checks against, under [`demo/`](../demo): fixed
data, no state between requests, and an OpenAPI document at `/openapi.json`
([`demo/openapi.json`](../demo/openapi.json)). Three of its operations break that document on
purpose, so a run shows what a failure looks like.

```bash
npm run test:api-playwright demo-api
```

The `demo-api` target sets `servesDemoApi`, so the one command does the whole run
([`e2e/runPlaywrightForTarget.ts`](../e2e/runPlaywrightForTarget.ts)):

1. It starts the demo API at the target's address and waits until it is listening
   ([`demo/startDemoServer.ts`](../demo/startDemoServer.ts)).
2. It finds the document, plans the operations and runs the tests.
3. It stops the demo API, whether the tests passed, failed or never started, and waits until the
   API no longer listens and every connection to it has ended
   ([`demo/stopDemoServer.ts`](../demo/stopDemoServer.ts)). Only then does the command exit.

The run prints `the demo API is running at …` and `the demo API has shut down` around the tests.
A port something else holds stops the run with the reason before any test starts.
The [demo site](e2e-playwright.md#the-demo-site), the `defaultTarget`, serves the same API and
document beside its pages, so `npm run test:api-playwright` with no target gives the same result.
`npm run serve:demo-api` serves the same API until stopped, to explore it by hand; stop it before
an API run against `demo-api`, which needs the port.

A run plans seven operations, so fourteen tests. Eleven pass, and the three that catch a seeded
bug fail as the `demo-api` target's `expectedApiFailures` says they will, so the run is green and
exits `0`.

| Operation                 | The demo API answers                | Result                                                                 |
| ------------------------- | ----------------------------------- | ---------------------------------------------------------------------- |
| `GET /books`              | 200, JSON                           | both checks pass                                                       |
| `GET /books/search`       | 200, JSON                           | both checks pass                                                       |
| `GET /books/{bookId}`     | 200, JSON                           | both checks pass                                                       |
| `GET /authors`            | 200, as `text/html`                 | expected failure of the content type check: the document declares JSON |
| `GET /authors/{authorId}` | 500                                 | expected failure of the status check: a server error                   |
| `GET /stats`              | 202                                 | expected failure of the status check: the document declares only 200   |
| `GET /account`            | 401, an operation marked as secured | both checks pass: a run sends no credentials                           |

It skips two more with the reason: `GET /books/{bookId}/reviews/{reviewId}` (no example value for
`reviewId`) and `GET /session/logout` (a path `UNSAFE_LINK` matches).
[`tests/createDemoApiServer.test.ts`](../tests/createDemoApiServer.test.ts) serves the demo API on
a free port inside `npm test` and asserts exactly these findings, and that the target's
`expectedApiFailures` names exactly the checks that find one, with no browser.

## Expected failures

A target lists the checks known to fail on its API in `expectedApiFailures`, each an operation's
path as the document writes it and the check (`status` or `contentType`):

```json
"expectedApiFailures": [
  { "path": "/authors/{authorId}", "check": "status" },
  { "path": "/stats", "check": "status" }
]
```

Each named test is marked with Playwright's
[`test.fail`](https://playwright.dev/docs/api/class-test#test-fail): the check still runs, and

- **while it fails**, the report shows it as an expected failure, with the finding, and it does not
  fail the run;
- **once it passes**, the test fails with "Expected to fail, but passed", so a fixed defect is
  taken off the list rather than left there;
- **every other test is unaffected**, so a new finding still fails the run.

The test is marked once the operation has answered (`ApiOperationStage.execute`), so only the
check's own finding is expected: an operation that never answers still fails the run. An entry
whose path the run does not request (a misspelled path, an operation the document dropped) stops
the run before any test starts
([`e2e/assertExpectedApiFailuresPlanned.ts`](../e2e/assertExpectedApiFailuresPlanned.ts)).

## Finding the document

A target's `apiSpecPath` in [`targets.json`](../targets.json) names the document, as a path from
the site's root; one that resolves to another site, or that `UNSAFE_LINK` matches, refuses the run. Without it the runner asks the site for each address in `OPENAPI_DOCUMENT_PATHS`
([`e2e/constants.ts`](../e2e/constants.ts)) in order and takes the first that answers with a
document ([`e2e/discoverOpenApiDocument.ts`](../e2e/discoverOpenApiDocument.ts)).

A document is OpenAPI 3 in JSON, served from the target's own site
([`e2e/fetchOpenApiDocument.ts`](../e2e/fetchOpenApiDocument.ts)). A Swagger 2.0 document, a YAML
document and a redirect to another site are each no document. A redirect is followed only on the
same site and never to an address `UNSAFE_LINK` matches
([`e2e/fetchSiteText.ts`](../e2e/fetchSiteText.ts)).

## Which operations a run requests

[`e2e/planApiOperations.ts`](../e2e/planApiOperations.ts) turns the document into requests:

- **`GET` operations only**, at most `API_OPERATION_LIMIT` of them, in the document's order.
- **On the document's own site.** The address is the first `servers` entry that applies (the
  operation's, then its path's, then the document's; the document's own site's root when there is
  none) plus the path. A server on another site, one with variables, and a path that resolves to
  another site each skip the operation.
- **Required path and query parameters take the document's own values**: the parameter's
  `example`, then its schema's `example`, `default` and first `enum` value. Optional parameters are
  left out. A required parameter with no such value, and a required header or cookie parameter,
  skip the operation.
- **No credentials, even ones the document offers.** A required query parameter that one of the
  document's `apiKey` security schemes names skips the operation, whatever example it carries.
- **An address `UNSAFE_LINK` matches is never requested** (`logout`, `delete` and the like), as in
  every other check. The path is judged as the document writes it and again as the address a run
  would request, with its server prefix and example values filled in.
- **`$ref` is followed for parameters and responses** to a definition under the document's
  `components`; one that points anywhere else, or at another `$ref`, skips the operation.

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
  so that refusal is the documented behaviour, whether or not the document lists the status. An
  operation whose `security` offers an empty alternative accepts a request without credentials, so
  it is not secured.
- **A redirect is the operation's answer.** A run never requests where it leads, so a `3XX` status
  is judged against the document like any other.
- **An answer that names no content type** matches no declared type, a range such as `*/*` included.
- **A server error fails even when the document declares it.** A plain `GET` built from the
  document's own examples is a request the server is expected to handle.
- **An operation that never answers is a setup failure** (`E2eFixtureError`), not a failed check.
- **The body itself is not validated** against the response schema.

## How it is built

- `ApiOperationStage` is the base of every API stage: its `setup` requests the stage's operation
  with `requestApiOperation` and puts the `ApiAnswer` in the run state, and its `execute` marks an
  expected failure and fails on any finding. A check stage only names its `check` and writes
  `findProblems`.
- The judgments are pure functions that return findings as data: `findApiStatusProblems`,
  `findApiContentTypeProblems` and `findDeclaredApiResponse` under
  [`e2e/fixtures/`](../e2e/fixtures), unit-tested in [`tests/`](../tests).
- The API specs use `apiTest` ([`e2e/fixtures/apiTest.ts`](../e2e/fixtures/apiTest.ts)), whose
  `stageRuntime` holds only `request` and `targetSettings` (`ApiStageRuntime`). It opens no page,
  so an API run needs no browser installed.
- The runner's own requests (finding the document) go through
  [`e2e/withSiteRequest.ts`](../e2e/withSiteRequest.ts), which honours the target's
  `ignoreHttpsErrors` as the tests' requests do.

To add an API check: write the fixture that judges an `ApiAnswer` and returns findings, create
`e2e/stages/<Name>Stage.ts` extending `ApiOperationStage`, add the check's name to
[`e2e/ApiCheck.ts`](../e2e/ApiCheck.ts), run the stage from an isolated spec under `e2e/api/` that
loops over `activeApiOperations()` with `apiTest`, and add its row to the table above.
