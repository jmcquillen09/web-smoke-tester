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

`npm run test:api-playwright [target]` tests a site's API from the OpenAPI document it publishes.
The runner finds the document (a target's `apiSpecPath`, or the usual addresses such as
`/openapi.json` and `/v3/api-docs`), plans one request per `GET` operation from the document's own
example values, and checks each answer:

| Check              | An operation passes when                                                             |
| ------------------ | ------------------------------------------------------------------------------------ |
| Documented status  | it answers with a status the document declares for it, and never with a server error |
| Documented content | the answer's content type is one the document declares for that status               |

Only `GET` is ever requested, with no credentials and no body, and every operation a run leaves
out is printed with the reason. A small demo API under [`demo/`](demo) ships with the repo: three
of its operations break their own document on purpose. A run against it shows eleven passing tests
and three expected failures, one per seeded bug, and fails if a bug goes uncaught or anything else
is flagged. A target's `expectedApiFailures` setting marks known defects of any API the same way. Read [`docs/api-playwright.md`](docs/api-playwright.md) for how the
document is found and which operations a run requests.

## Running

- `npm install`, then `npx playwright install --with-deps chromium` (add other browsers as needed).
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

- `npm run test:e2e-playwright [target]` runs the suite against that target. With no target it
  uses the `defaultTarget`, the bundled demo site: the run starts the site, tests it and shuts it
  down again, and every check passes. Read [`docs/e2e-playwright.md`](docs/e2e-playwright.md) for every target
  setting, the reports and how to add a check.
  `--browser=<chrome|firefox|safari|edge|all>` picks the browser (default chrome), or a
  comma-separated list picks several. Workflow specs under `e2e/workflows/` run only after every
  isolated spec in the same browser passes; add `--project='workflows-*' --no-deps` to run them
  alone.
- The HTML report lands in `playwright-report/` (`npx playwright show-report`), failure traces and
  screenshots in `test-results/`.
- `npm run test:api-playwright [target]` runs the API checks against that target; it needs no
  browser installed. To try them on
  the bundled demo API, run `npm run test:api-playwright demo-api`: it starts the demo API, runs
  the tests and shuts the demo API down again before it exits.
- `npm test` runs the suite's own unit tests, `npm run typecheck` typechecks, and
  `npm run format:check` checks formatting.

## How it is built

- [`scripts/runE2ePlaywright.ts`](scripts/runE2ePlaywright.ts) resolves the target, finds the
  site's pages and starts Playwright.
- [`scripts/runApiPlaywright.ts`](scripts/runApiPlaywright.ts) resolves the target, finds its
  OpenAPI document, plans the operations to request and starts Playwright's `api` project.
- Each check is a **stage** under [`e2e/stages/`](e2e/stages): a class with `setup`, `execute` and
  `teardown`. An isolated spec runs one stage on its own (`runIsolated`); a workflow spec threads
  one state through several (`runWorkflow`).
- Each browser runs as two Playwright projects, `isolated-<browser>` and `workflows-<browser>`, the
  second gated on the first.
- [`demo/createDemoApiServer.ts`](demo/createDemoApiServer.ts) is the bundled demo API and
  [`demo/createDemoSiteServer.ts`](demo/createDemoSiteServer.ts) the bundled demo site. A run
  against a target that sets `servesDemoApi` or `servesDemoSite` starts the one it names and shuts
  it down; `npm run serve:demo-api` and `npm run serve:demo-site` serve them on their own.
- Everything is TypeScript that Node runs directly; there is no build step and no other runtime.
