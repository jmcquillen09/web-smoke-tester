# web-smoke-tester

A Playwright suite that runs basic checks against any website: name the site in
[`targets.json`](targets.json), run one command, and read the report. It needs no access to the
site's code and only ever reads pages: no forms are submitted and no data is changed.

## What it checks

For the site's start page, any extra paths the target lists, and up to ten more pages found by
following same-site links:

| Check                | A page passes when                                                                                                                                                                      |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page loads           | it answers without an error status, has a title, renders content, none of the site's own requests behind it fails, and it leaves no JavaScript exception or promise rejection unhandled |
| Broken links         | every same-site link on it answers the browser without an error status                                                                                                                  |
| Broken images        | every image on it loads in the browser                                                                                                                                                  |
| Accessibility basics | the document names its language, has exactly one `<h1>`, and every visible image has `alt` and every visible form field an accessible name                                              |
| SEO basics           | it has a title and a meta description                                                                                                                                                   |
| Responsive layout    | it fits a phone (375px), a tablet (768px) and a desktop (1280px) without sideways scrolling, and declares a viewport for the phone and tablet, which are emulated as real devices       |
| Site navigation      | a link from the start page opens another working page, and Back returns from it                                                                                                         |

A test the site's bot protection gets in the way of fails with a message that starts
`failed due to bot protection`, so it is not mistaken for a defect in the site.

Then one workflow test walks the start page as a visitor would: load it, use its links and images,
follow a link and come back.

## API checks

`npm run test:api-playwright [target]` tests a site's API from the OpenAPI document it publishes:
OpenAPI 3 or Swagger 2.0, in JSON. The runner finds the document (a target's `apiSpecPath`,
or the usual addresses such as `/openapi.json` and `/v3/api-docs`, or the one a Swagger UI or Redoc
page such as `/docs` names), plans one request per `GET` operation from the document's own
example values (a path parameter without one takes a value from the list operation one level up),
and checks each answer:

| Check              | An operation passes when                                                             |
| ------------------ | ------------------------------------------------------------------------------------ |
| Documented status  | it answers with a status the document declares for it, and never with a server error |
| Documented content | the answer's content type is one the document declares for that status               |
| Documented body    | the answer's JSON body is what the document's schema for that status allows          |
| Secured operation  | an operation the document marks as secured refuses a request without credentials     |

Only `GET` is ever requested, with no credentials and no body, and every operation a run leaves
out is printed with the reason. The bundled demo site serves a small demo API ([`demo/`](demo)): five
of its operations break their own document on purpose. A run against it shows twenty-three passing
tests and five expected failures, one per seeded bug, and fails if a bug goes uncaught or anything
else is flagged. A target's `expectedApiFailures` setting marks known defects of any API the same way. Read [`docs/api-playwright.md`](docs/api-playwright.md) for how the
document is found and which operations a run requests.

## Running

- `npm install`, then `npx playwright install --with-deps chromium` (add other browsers as needed).
  The install reads `@studnicky/eslint-config` from GitHub Packages, which needs a GitHub token with the
  `read:packages` scope in your user `.npmrc`:
  `npm config set //npm.pkg.github.com/:_authToken <token>`.
- Add your site to [`targets.json`](targets.json):

  ```json
  {
    "defaultTarget": "staging",
    "targets": {
      "staging": { "baseUrl": "https://staging.example.com" },
      "production": {
        "baseUrl": "https://www.example.com",
        "paths": ["/", "/pricing"],
        "crawlLimit": 25
      }
    }
  }
  ```

- `npm run test:e2e-playwright [target]` runs the web tests and the API tests against that target
  in one run. A site with no OpenAPI document is told so and gets its web tests alone. With no
  target it uses the `defaultTarget`, the bundled demo site: the run starts the site, tests it and
  shuts it down again, and every check passes.
- `npm run test:web-playwright [target]` runs only the web tests. Read [`docs/e2e-playwright.md`](docs/e2e-playwright.md) for every target
  setting, the reports and how to add a check.
  `--browser=<chrome|firefox|safari|edge|all>` picks the browser (default chrome), or a
  comma-separated list picks several. Workflow specs under `e2e/workflows/` run only after every
  isolated spec in the same browser passes; add `--project='workflows-*' --no-deps` to run them
  alone.
- The HTML report lands in `playwright-report/` (`npx playwright show-report`), failure traces and
  screenshots in `test-results/`.
- `npm run test:api-playwright [target]` runs only the API tests; it needs no browser installed.
  With no target it tests the API the demo site serves: the run starts the site, runs the tests
  and shuts the site down again before it exits.
- `npm test` runs the suite's own unit tests, `npm run typecheck` typechecks, `npm run lint` lints, and
  `npm run format:check` checks formatting.
- `npm run duplication` fails when the TypeScript, JavaScript or YAML holds a copy-pasted block that
  `origin/main` does not ([jscpd](https://www.npmjs.com/package/jscpd), set up in [`.jscpd.json`](.jscpd.json)). `main`
  holds none, so any copy fails: move the shared code into one place both callers import.
- `npm install` points git at [`hooks/`](hooks), whose `pre-push` hook runs `npm run duplication` before
  every push (`npm run setup-hooks` does the same by hand). The hook reads the files as they are on disk; CI
  checks the pushed commit.
- Every pull request and every push to `main` runs these in GitHub Actions
  ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)): the typecheck, lint, duplication check and unit tests on Linux,
  Windows and macOS, the format check, and the web and API tests against the demo site in Chrome,
  Firefox and Safari's engine. The `ci-gate` job passes only when all of them did.

## How it is built

- Each command has a script under [`scripts/`](scripts) (`runE2ePlaywright.ts`,
  `runWebPlaywright.ts`, `runApiPlaywright.ts`) that resolves the target and says what to find on
  its site: the pages to test ([`e2e/planWebRun.ts`](e2e/planWebRun.ts)), the operations of its
  OpenAPI document ([`e2e/planApiRun.ts`](e2e/planApiRun.ts)), or both.
  [`e2e/runPlaywrightForTarget.ts`](e2e/runPlaywrightForTarget.ts) does the rest for all three and
  starts Playwright.
- Each check is a **stage** under [`e2e/stages/`](e2e/stages): a class with `setup`, `execute` and
  `teardown`. An isolated spec runs one stage on its own (`runIsolated`); a workflow spec threads
  one state through several (`runWorkflow`).
- Each browser runs as two Playwright projects, `isolated-<browser>` and `workflows-<browser>`, the
  second gated on the first.
- [`demo/createDemoSiteServer.ts`](demo/createDemoSiteServer.ts) is the bundled demo site, and
  [`demo/demoApiAnswers.ts`](demo/demoApiAnswers.ts) the demo API it serves. A run against a target
  that sets `servesDemoSite` starts the site and shuts it down; `npm run serve:demo-site` serves it
  on its own.
- Everything is TypeScript that Node runs directly; there is no build step and no other runtime.
