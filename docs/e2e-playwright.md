# Playwright end-to-end tests

The Playwright suite under [`e2e/`](../e2e) drives a real browser through basic checks against any
website named in [`targets.json`](../targets.json). It only reads the site: it opens pages, follows
links and requests addresses, and never submits a form or signs in. It complements the `node:test`
suite in `tests/`, which runs without any live site. The same targets, stages and runners also
test a site's API from its OpenAPI document; see [`api-playwright.md`](api-playwright.md).

## Running it

```bash
npx playwright install chromium            # once per machine; add firefox webkit for those browsers
npm run test:e2e-playwright                # the defaultTarget in targets.json: the bundled demo site
npm run test:e2e-playwright staging        # the target named "staging"
```

Three commands run the tests, each against a target:

| Command                                | Runs                                                             |
| -------------------------------------- | ---------------------------------------------------------------- |
| `npm run test:e2e-playwright [target]` | the web tests and the [API tests](api-playwright.md), in one run |
| `npm run test:web-playwright [target]` | the web tests only                                               |
| `npm run test:api-playwright [target]` | the API tests only                                               |

`test:e2e-playwright` looks for the site's OpenAPI document as an API run does. A site that
publishes none, or one with no operation a run can request, is told so in the same words, and the
run goes on with the web tests alone: a missing document does not fail it.

Arguments after the target pass straight to `playwright test`, for example
`npm run test:e2e-playwright -- staging e2e/brokenLinks.spec.ts --headed` or
`npm run test:e2e-playwright -- staging --ui`. Put `--` before them whenever they include a flag: npm
otherwise reads the flag as its own config and never passes it on. The first argument that is not a
flag is always read as the target, so name the target before a spec file.

The runner prints the site and the pages it will test before Playwright starts. The HTML report
lands in `playwright-report/` (`npx playwright show-report` opens it), failure traces and
screenshots in `test-results/`, and a JSON report in `test-results/results.json`. Both reports
record the run's target, the site it resolved to (`site`) and its browsers, plus `E2E_RUN_ID` and
`E2E_DEPLOYMENT_ID` when they are set, as a CI job that starts the suite can. A run that
needs its own folders uses Playwright's switches: `--output <dir>` for traces and screenshots,
`PLAYWRIGHT_HTML_OUTPUT_DIR` and `PLAYWRIGHT_JSON_OUTPUT_FILE` for the reports.

Exit codes: `0` every test passed (or failed as its target expects), `1` a test failed or the
site did not answer, `2` the run was refused before it started (an unknown target or browser, a disabled target, a malformed targets
file).

## The demo site

The repo bundles a small site to run the checks against, under [`demo/`](../demo): three fixed
pages that link to one another, a stylesheet and two images
([`demo/createDemoSiteServer.ts`](../demo/createDemoSiteServer.ts)). Every check passes on it, and
it is the `defaultTarget`, so a run without a target name needs no site of your own. It also
serves the [demo API](api-playwright.md#the-demo-api) and its OpenAPI document at `/openapi.json`,
so an API run against it works too.

```bash
npm run test:e2e-playwright demo-site
```

The `demo-site` target sets `servesDemoSite`, so the one command does the whole run
([`e2e/runPlaywrightForTarget.ts`](../e2e/runPlaywrightForTarget.ts)):

1. It starts the demo site at the target's address and waits until it is listening.
2. It finds the site's pages and its API's operations, and runs the tests.
3. It stops the demo site, whether the tests passed, failed or never started, and waits until the
   site no longer listens and every connection to it has ended. Only then does the command exit.

[`demo/withTargetDemoServer.ts`](../demo/withTargetDemoServer.ts) holds those steps for both
runners: a site run and an API run each serve the demo site for a target that names it. The run prints
`the demo site is running at …` and `the demo site has shut down` around the tests. A port
something else holds stops the run with the reason before any test starts.
A run started without a runner, as an IDE's Playwright extension starts one, has Playwright serve
the demo server itself ([`e2e/createDemoWebServers.ts`](../e2e/createDemoWebServers.ts)).
`npm run serve:demo-site` serves the same site until stopped, to look at it by hand; stop it before
a run against `demo-site`, which needs the port.

## Targets

A target is a named site. [`targets.json`](../targets.json) at the repo root holds every one, and
`e2e/resolveE2eTarget.ts` is the one place a name becomes a site.

```json
{
  "defaultTarget": "staging",
  "targets": {
    "staging": {
      "baseUrl": "https://staging.example.com",
      "paths": ["/", "/pricing", "/contact"],
      "crawlLimit": 25,
      "ignoreHttpsErrors": true
    },
    "production": {
      "baseUrl": "https://www.example.com",
      "disabled": "waiting for sign-off from the site's owner"
    }
  }
}
```

| Setting               | Required | Default                                | Meaning                                                                                                                                                                                                  |
| --------------------- | -------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `defaultTarget`       | yes      |                                        | The target a run without a name uses.                                                                                                                                                                    |
| `baseUrl`             | yes      |                                        | The site's address, `http` or `https`. A path on it (`https://example.com/docs/`) becomes the start page.                                                                                                |
| `paths`               | no       | the base URL's path                    | The pages every run tests, each a path from the site's root (`/pricing`). The first is the start page for the navigation tests.                                                                          |
| `crawlLimit`          | no       | `10`                                   | How many more pages the runner may add by following same-site links. `0` tests only `paths`.                                                                                                             |
| `ignoreHttpsErrors`   | no       | `false`                                | Accept a self-signed or otherwise invalid certificate, as a local or staging site may have.                                                                                                              |
| `blockTracking`       | no       | `true`                                 | Keep analytics and marketing scripts from loading. `false` lets them load, as in a visitor's browser, at the cost of test traffic in the site's analytics.                                               |
| `viewport`            | no       | the browser's own (1280×720 in Chrome) | The desktop window's size, as `{ "width": 1920, "height": 1080 }`. The phone and tablet layout checks keep their own sizes.                                                                              |
| `apiSpecPath`         | no       | the usual addresses, tried in order    | Where the site's OpenAPI or Swagger document is, or the Swagger UI or Redoc page that shows it, as a path from the site's root (`/api/v3/openapi.json`). Only the [API run](api-playwright.md) reads it. |
| `servesDemoSite`      | no       | `false`                                | Have a run serve the bundled [demo site](#the-demo-site), its pages and the demo API, at `baseUrl` for the length of the run. `baseUrl` must then be `http://localhost:<port>`.                          |
| `expectedApiFailures` | no       | none                                   | The API checks known to fail on this site, each `{ "path": "/stats", "check": "status" }`. See [Expected failures](api-playwright.md#expected-failures).                                                 |
| `disabled`            | no       |                                        | A reason. While it is set, every run against the target stops with that reason.                                                                                                                          |

A misspelled setting, a missing `baseUrl`, a path that does not start with `/` and an unknown target
name each stop the run and say what is wrong. `E2E_TARGETS_FILE` points a run at another file, for
sites that should not be committed.

Only test sites you own or have permission to test. A run makes a few hundred requests in a few
minutes; `playwright.config.ts` holds a local run to four workers so it does not flood a small
server.

### Which pages a run tests

The runner starts from the target's `paths` and follows same-site links breadth-first, so pages
nearest the start come first, until it has added `crawlLimit` pages
([`e2e/discoverSitePages.ts`](../e2e/discoverSitePages.ts)). It reads links from each page's HTML as
the server sends it, so:

- links a page builds in the browser (a single-page app's client-side navigation) are not found;
  list those pages in `paths`;
- other sites, files (`.pdf`, images, feeds), and links whose address suggests they end a session or
  change data (`logout`, `sign-out`, `delete`, `remove`, `unsubscribe`) are never followed, here or
  in any check;
- a page that does not answer stays in the list, and its own tests report it.

The pages are handed to Playwright as `E2E_SITE_PAGES`. A run started without the runner, such as
from the VS Code Playwright extension, tests the target's `paths` only.

## What each check does

Every page in the list gets one test per check. Each check is a [stage](#stages-and-workflows).

| Spec                       | Stage                        | Fails when                                                                                                                                                                                                                   |
| -------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pageLoads.spec.ts`        | `LoadPageStage`              | the page answers with an error status or not at all, has no title, renders nothing, a same-site request behind it (script, style, image, API call) fails, or it leaves a JavaScript exception or promise rejection unhandled |
| `brokenLinks.spec.ts`      | `CheckLinksStage`            | a same-site link on the page answers the browser with an error status or not at all                                                                                                                                          |
| `brokenImages.spec.ts`     | `CheckImagesStage`           | an image on the page, on this site or another, does not load in the browser                                                                                                                                                  |
| `accessibility.spec.ts`    | `CheckAccessibilityStage`    | `<html>` has no `lang`, the page does not have exactly one `<h1>`, a visible image has no `alt` attribute, or a visible form field has no accessible name                                                                    |
| `seo.spec.ts`              | `CheckSeoStage`              | the page has no `<title>` or no meta description                                                                                                                                                                             |
| `responsiveLayout.spec.ts` | `CheckResponsiveLayoutStage` | the page is wider than a 375px phone, a 768px tablet or a 1280px desktop screen, so a visitor would scroll sideways, or it declares no viewport meta tag for the phone or tablet                                             |
| `siteNavigation.spec.ts`   | `FollowSiteLinkStage`        | clicking the first visible link to another page of the site, from the navigation when there is one, does not land on a working page                                                                                          |
| `siteNavigation.spec.ts`   | `ReturnToPreviousPageStage`  | Back does not return from that page to the one the link was on                                                                                                                                                               |

Details worth knowing when reading a failure:

- **A failed assertion lists every finding**, for example `404 https://site.example/old-page` or
  `image without alt: /img/hero.jpg`, so one run shows everything wrong with a page.
- **Links and images are checked from inside the page**, so each request goes out as the visitor's
  browser sends it. A server can answer another HTTP client differently, or not at all, which says
  nothing about what a visitor gets. A link is requested with `HEAD`, then `GET` when the server
  refuses `HEAD`; an image is loaded the way an `<img>` loads it. Each link is requested once per
  worker however many pages carry it, ten at a time, and a check covers at most 100 addresses per
  page.
- **A link that redirects to another site counts as working**: a page cannot see where a cross-site
  redirect leads. A redirect within the site is followed to its end.
- **External links are not checked**; other sites' uptime is not this site's defect. External
  images are, because a visitor sees them on this page.
- **`alt=""` is fine**: it marks a decorative image. Only a missing `alt` attribute fails. A field
  has an accessible name with a `<label>`, `aria-label`, `aria-labelledby`, `title` or
  `placeholder`, the sources browsers and axe-core name a field from. A placeholder alone passes
  here, though a visible label serves people better.
- **Images and fields the page does not show are not judged**: `display: none`, `visibility: hidden`,
  a `hidden` attribute or a hidden ancestor. A site's hidden helper fields reach no visitor.
- **The phone and tablet are emulated devices**, an iPhone 8 and an iPad Mini (`RESPONSIVE_VIEWPORTS`
  in [`e2e/constants.ts`](../e2e/constants.ts)): the browser sends the device's user agent and uses
  its touch input and pixel density, so a site that serves handheld devices their own page is
  judged on that page. The engine stays the run's own browser. On those two screens the page must
  also declare a viewport meta tag: without one a device lays the page out at desktop width and
  shrinks it, which measuring its width cannot show.
- **Analytics and marketing scripts are blocked** by default (`THIRD_PARTY_TRACKING` in
  [`e2e/constants.ts`](../e2e/constants.ts)), so test traffic stays out of the site owner's
  dashboards. A page can behave differently without them; a target sets `"blockTracking": false`
  to load them as a visitor's browser does.
- **The test browser is not a visitor's browser.** Its window is smaller, and it loads fewer
  third-party scripts. When a page reports script errors here that a normal browser does not show,
  try the target with `blockTracking: false` and a larger `viewport` before treating them as defects.
- **A script error is reported once per page**, by the page-load test, with the stack and a
  screenshot attached. The same error raised repeatedly is counted (`34 times: …`), not listed 34
  times. The other checks on that page still run and judge only their own subject.
- **A failure caused by bot protection says so.** Its message starts with
  `failed due to bot protection`, so it is told apart at a glance from a failure about the site.
  There are two cases, both best-effort matches on the common products (`BOT_PROTECTION_REQUEST`,
  `BOT_CHALLENGE_URL` and `BOT_CHALLENGE_TEXT` in [`e2e/constants.ts`](../e2e/constants.ts)): the
  site served a bot check in a page's place (every test of that page fails this way, since nothing
  on that page is about the site), or the page loaded and only the protection product's own
  request failed (the page-load test fails this way; the other checks run normally). Such a request
  can fail in an ordinary visitor's browser too, so the message names it without claiming a cause.
  The suite never tries to get past either.
- **The page-load test waits for the page to go quiet**, up to 15 seconds with no network activity,
  before it judges the page, so an error a late script raises is caught. A page that polls or
  streams never goes quiet and is judged when the time is up.
- **A site with a single page** has no link to follow, so the two navigation tests are skipped with
  that reason rather than failed.
- These are basics, not an audit. Passing the accessibility check does not make a page accessible;
  it means the four most common mechanical problems are absent.

### Browsers

The suite runs in Chrome by default. `--browser=<browser>` (or `--browser <browser>`) picks another,
a comma-separated list picks several, and `all` runs every one in the same run and report:

```bash
npm run test:e2e-playwright -- staging --browser=firefox
npm run test:e2e-playwright -- staging --browser=chrome,firefox,safari
npm run test:e2e-playwright -- staging --browser=all
```

- **`chrome`** (default): Playwright's bundled Chromium with the Desktop Chrome profile.
- **`firefox`**: Playwright's Firefox (`npx playwright install firefox`).
- **`safari`**: Playwright's WebKit, the engine Safari is built on (`npx playwright install webkit`).
  Playwright cannot drive Safari itself.
- **`edge`**: the installed Microsoft Edge, through Playwright's `msedge` channel
  (`npx playwright install msedge`, which asks for sudo on Linux). Playwright's Desktop Edge preset
  alone is Chromium with an Edge user agent.
- **`all`**: every browser above. It runs the suite once per browser, so it takes about four times
  as long and makes four times the requests.

The script reads `--browser` itself (it becomes `E2E_BROWSER`), so Playwright's own `--browser`,
which takes engine names, never sees it. An unknown value stops the run with the accepted choices.
A list runs its browsers in the order given; it cannot include `all` or name a browser twice.

### Isolated tests before workflows

Each browser runs as two Playwright projects, built by
[`e2e/createE2eProjects.ts`](../e2e/createE2eProjects.ts). `isolated-<browser>` holds every spec
outside `e2e/workflows/` and `e2e/api/`; `workflows-<browser>` holds the user-story workflow specs under
[`e2e/workflows/`](../e2e/workflows) and depends on that browser's isolated project, so its
workflows start only once every isolated test in the same browser has passed. When any isolated
test fails, even one a workflow does not use, the report lists that browser's workflow tests as
"did not run" and the command exits non-zero; other browsers' workflows still run. Each test in
the report is labelled with its project, for example `[isolated-chrome]` or `[workflows-firefox]`.

Naming a workflow spec or passing `--grep` still runs the whole isolated project first. To run the
workflows alone, skip the dependency:
`npm run test:e2e-playwright -- staging --project='workflows-*' --no-deps`.

Everything except the target and `--browser` goes to `playwright test`, so its whole CLI applies:
`--ui`, `--workers`, `--retries`, `--max-failures`/`-x`, `--timeout`, `--reporter`, `--trace on` and
the rest. See Playwright's [command line reference](https://playwright.dev/docs/test-cli).

```bash
npm run test:e2e-playwright -- staging e2e/accessibility.spec.ts          # one check
npm run test:e2e-playwright -- staging -g "/pricing"                      # every check on one page
npm run test:e2e-playwright -- staging --project='isolated-*'             # skip the workflow
npm run test:e2e-playwright -- staging -g "fits the screen" --repeat-each=3   # repeat to find flakes
npm run test:e2e-playwright -- staging --debug e2e/pageLoads.spec.ts      # step through in the inspector
```

The suite's fixed values (timeouts, viewport sizes, the per-page request cap, the excluded link
patterns) live in [`e2e/constants.ts`](../e2e/constants.ts).

## How a run is put together

1. The command's script under [`scripts/`](../scripts) (`runE2ePlaywright.ts`,
   `runWebPlaywright.ts` or `runApiPlaywright.ts`) takes the target out of the arguments and
   resolves it from `targets.json`. The first two also take `--browser`; an API run opens no
   browser and passes every other argument on.
2. [`e2e/runPlaywrightForTarget.ts`](../e2e/runPlaywrightForTarget.ts) serves the demo server the
   target names, checks that the site answers, and has the command find what to test: the site's
   pages ([`e2e/planWebRun.ts`](../e2e/planWebRun.ts)), its API's operations
   ([`e2e/planApiRun.ts`](../e2e/planApiRun.ts)), or both. It then starts `playwright test` with
   `E2E_TARGET` set, and with what the command found: `E2E_BROWSER` and `E2E_SITE_PAGES` for the
   web tests, `E2E_API_OPERATIONS_FILE` for the API tests. A web-only run hands over no operations, and
   an API-only run names only the `api` project.
3. [`playwright.config.ts`](../playwright.config.ts) resolves the same target and browsers through
   the same functions, and builds the projects.
4. [`e2e/globalSetup.ts`](../e2e/globalSetup.ts) asks the site for its start page once
   ([`e2e/assertSiteAnswers.ts`](../e2e/assertSiteAnswers.ts)). A site that does not answer at all
   stops the run there with one reason, instead of a timeout in every test; a certificate the run
   does not accept is named, with the `ignoreHttpsErrors` setting that accepts it.
5. Each spec writes one test per page from [`e2e/sitePages.ts`](../e2e/sitePages.ts).

## Writing a spec

- Name it `*.spec.ts` under `e2e/`. `npm test` collects only `*.test.ts`, so specs never run there.
- Import `test` from [`e2e/fixtures/test.ts`](../e2e/fixtures/test.ts) and `expect` from
  `@playwright/test`. That `test` blocks third-party tracking on every page and provides:
  - `targetSettings`: the active target's site, paths and settings.
  - `reportUncaughtPageErrors` (an option, off by default): a spec turns it on with
    `test.use({ reportUncaughtPageErrors: true })` to fail when the site leaves an error unhandled
    on a page. The page-load spec and the workflow do.
  - `urlStatuses`: the link statuses this worker has already read.
  - `stageRuntime`: the initial config (`page`, `request`, `targetSettings`, `urlStatuses`) every
    [stage](#stages-and-workflows) is constructed with.
- A spec runs a [stage](#stages-and-workflows) with `runIsolated` or `runWorkflow`; it never opens
  pages or builds state itself. State comes from the shared primitives the stages' `setup` methods
  call, under [`e2e/fixtures/`](../e2e/fixtures):
  - `openSitePage`: opens one of the site's pages and returns it as a `LoadedPage`; a page that
    does not open is an `E2eFixtureError`, a setup failure rather than a failed check.
  - `followFirstSiteLink`: clicks the first visible link to another page of the site and returns
    the `FollowedLink`, or `undefined` when the page shows none.
  - `readSameSiteLinks` and `readImageUrls`: the addresses a loaded page links to and shows.
  - `findBrokenLinks` and `readUrlStatus`: request same-site addresses from inside the loaded page,
    through the worker's shared statuses.
  - `findBrokenImages`: has the loaded page's browser load each image address.
  - `findAccessibilityProblems`, `findSeoProblems`, `readHorizontalOverflow` and
    `hasViewportMetaTag`: read one fact from the loaded page and return it as data.
  - `handheldDeviceOptions`: the browser options that make a test's browser a named phone or tablet.
  - `SiteRequestWatch`: records a page's failed same-site requests from construction to `stop()`,
    keeping a bot-protection product's own requests apart.
  - `failOnBotChallenge`: fails the test with `E2eBotProtectionError` when the loaded page is a bot
    check instead of the site; `openSitePage` and `LoadPageStage` call it.
- A spec that covers every page loops over `sitePages()` and puts the path in the test's title, so
  each page is its own line in the report.
- Prefer `getByRole` and `getByLabel` when a check needs a locator; a selector tied to one site's
  markup does not belong in this repo.
- Every check is read-only: no form submission, no sign-in, and no request to a link `UNSAFE_LINK`
  excludes.

## Stages and workflows

The suite follows a DAG model: an isolated test runs one node; a workflow runs the path of nodes
that makes up a full user story. Each node is a stage under [`e2e/stages/`](../e2e/stages), a class
extending `E2eStage` that overrides its public methods:

- **The constructor** takes the initial config, the `stageRuntime` fixture: `page`, `request`,
  `targetSettings` and `urlStatuses`. A stage that checks one page also takes that page's path.
- **`setup(): Promise<E2eWorkflowState>`** runs the stage in isolation. It builds the state the
  stage starts from through the same shared primitives (`openSitePage`, `followFirstSiteLink`)
  whose results the previous stage returns in a workflow, and returns that state.
- **`execute(state): Promise<E2eWorkflowState>`** receives its state from the workflow engine: what
  `setup` built, or what the previous stage's `execute` returned. It drives and checks the feature
  under test and returns the new state. It is identical in both modes, holds no run state in
  fields, and reads what it needs with `state.requireX()`.
- **`teardown(state): Promise<void>`** clears the local side effects of an isolated run. The
  default does nothing.

The run's state is an immutable `E2eWorkflowState`: `with…` returns an updated copy and `require…`
reads a value, failing with `E2eFixtureError` when the state has none. It holds the `loadedPage` and
the `followedLink`.

```ts
test('/pricing has no broken same-site link', async ({ stageRuntime }) => {
  // setup → execute(state) → teardown(state), each its own report step
  await runIsolated(new CheckLinksStage(stageRuntime, '/pricing'))
})

test('a visitor follows a link and comes back', async ({ stageRuntime }) => {
  // execute only, each result threaded into the next stage, one report step per stage
  await runWorkflow(
    [
      new LoadPageStage(stageRuntime, '/'),
      new FollowSiteLinkStage(stageRuntime),
      new ReturnToPreviousPageStage(stageRuntime)
    ],
    E2eWorkflowState.empty()
  )
})
```

- **A stage never knows its mode.** It has no flags, files or arguments that select one, and a spec
  never builds a stage's starting state: an isolated spec is `runIsolated(new XStage(stageRuntime))`.
- **`runIsolated`** calls `setup`, then `execute` with the state `setup` returned, then `teardown`
  with that same state, even when `execute` fails. When `teardown` also fails, it throws an
  `AggregateError` of both. A failed `setup` built no state, so nothing is torn down.
- **`runWorkflow`** calls only `execute`, in path order, one `test.step` per stage titled with the
  stage, and stops at the first failure. It never calls `setup` or `teardown`, so a stage that
  installs something temporary in `execute`, such as `SiteRequestWatch`, removes it there in a
  `try`/`finally`.
- **A workflow is one Playwright test.** Its stages share one page. A stage that needs a second
  visitor gives it its own browser context with `runtime.withIsolatedRuntime`.
- **`PageCheckStage`** is the base of every stage that checks one loaded page: its `setup` opens the
  stage's path, so each check stage only writes `execute`, and in a workflow it checks whichever
  page the stage before it left loaded.
- **A stage requires only the state its own steps need**, not proof that earlier stages ran.
- [`e2e/workflows/visitorJourney.spec.ts`](../e2e/workflows/visitorJourney.spec.ts) runs the
  visitor's story as one workflow: LoadPage → CheckLinks → CheckImages → CheckAccessibility →
  FollowSiteLink → ReturnToPreviousPage, all on the start page.
- The runners' ordering and state threading are unit-tested in `tests/runIsolated.test.ts` and
  `tests/runWorkflow.test.ts`.
- A user-story workflow spec goes under [`e2e/workflows/`](../e2e/workflows), which puts it in the
  workflows projects (see [Isolated tests before workflows](#isolated-tests-before-workflows)).

To add a check: write the fixture that reads the fact from a loaded page and returns findings as
data, create `e2e/stages/<Name>Stage.ts` extending `PageCheckStage` (or `E2eStage` when it does not
start from one loaded page), add a `with…`/`require…` pair to `E2eWorkflowState` for any new state
it returns, run it from an isolated spec with `runIsolated`, and add its row to
[What each check does](#what-each-check-does).

## The suite's own tests

`npm test` runs the unit tests under [`tests/`](../tests) on Node's test runner, with no browser and
no live site: target resolution, the targets file, browser choices, link extraction, the crawl's
order and limits, the stage runners and the uncaught-error check.
`npm run typecheck` typechecks everything Node runs, and `npm run lint` runs the ESLint rules
[`eslint.config.mjs`](../eslint.config.mjs) enables over the same files.
`npm run duplication` fails on a copy-pasted block of TypeScript, JavaScript or YAML that `origin/main` does
not hold.
