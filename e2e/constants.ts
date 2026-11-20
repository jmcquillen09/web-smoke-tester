import { E2eBrowserValues } from './E2eBrowser.ts'

// The Playwright suite's fixed values, in one place. Values that vary by site come from
// targets.json through e2e/resolveE2eTarget.ts instead.

// The `--browser` choice that runs the suite in every browser, and every single choice the flag
// accepts; it also takes several browsers joined by the separator (`chrome,firefox,safari`).
export const ALL_E2E_BROWSERS = 'all'
export const E2E_BROWSER_CHOICES: readonly string[] = [...E2eBrowserValues, ALL_E2E_BROWSERS]
export const E2E_BROWSER_LIST_SEPARATOR = ','

// Variables recorded in the report metadata under their keys, each when set: the ID of the CI run
// that started the suite, and the ID of the deployment under test when whoever starts it knows it.
export const RUN_METADATA_VARIABLES = {
  runId: 'E2E_RUN_ID',
  deploymentId: 'E2E_DEPLOYMENT_ID'
} as const

// Where the JSON report is written unless PLAYWRIGHT_JSON_OUTPUT_FILE says otherwise. Inside
// Playwright's output folder, which each run clears first, so a stale report is never read.
export const JSON_REPORT_PATH = 'test-results/results.json'

// The file that names every site a run can target, at the repo root; TARGETS_FILE_VARIABLE points a
// run at another file.
export const TARGETS_FILE_NAME = 'targets.json'
export const TARGETS_FILE_VARIABLE = 'E2E_TARGETS_FILE'
// How the runner hands its choices to playwright.config.ts: the target name, the browsers, and the
// pages it found on the site (a JSON array of paths).
export const TARGET_VARIABLE = 'E2E_TARGET'
export const BROWSER_VARIABLE = 'E2E_BROWSER'
export const SITE_PAGES_VARIABLE = 'E2E_SITE_PAGES'
// Names the file the runner wrote the operations it planned from the site's OpenAPI document into
// (a JSON array), and the project that holds the API specs.
export const API_OPERATIONS_FILE_VARIABLE = 'E2E_API_OPERATIONS_FILE'
export const API_PROJECT = 'api'

// Where a site's OpenAPI document is looked for, in order, unless the target sets `apiSpecPath`:
// the usual addresses of a document, then of a Swagger UI or Redoc page.
export const OPENAPI_DOCUMENT_PATHS: readonly string[] = [
  '/openapi.json',
  '/swagger.json',
  '/v3/api-docs',
  '/api-docs',
  '/api/openapi.json',
  '/swagger/v1/swagger.json',
  '/v2/api-docs',
  '/docs',
  '/redoc',
  '/swagger',
  '/api/docs'
]
// How many addresses one Swagger UI or Redoc page, or its settings script, may send the runner to.
export const DOCS_PAGE_LINK_LIMIT = 5
// What the report shows on an API test the target's `expectedApiFailures` names.
export const EXPECTED_API_FAILURE =
  'the target expects this check to fail on this operation (expectedApiFailures in targets.json)'
// Where an OpenAPI document keeps the schemas, parameters and responses a `$ref` points at.
export const SCHEMA_REFERENCE = '#/components/schemas/'
export const PARAMETER_REFERENCE = '#/components/parameters/'
export const RESPONSE_REFERENCE = '#/components/responses/'
// How a schema says it is written in JSON Schema 2020-12, the dialect of OpenAPI 3.1.
export const JSON_SCHEMA_2020_12 = 'https://json-schema.org/draft/2020-12/schema'
// The most operations one API run requests.
export const API_OPERATION_LIMIT = 50

// How many pages the runner adds to a target's own paths by following same-site links, unless the
// target sets `crawlLimit`; 0 turns the crawl off.
export const DEFAULT_CRAWL_LIMIT = 10
// How long the crawl waits for one page before moving on without it.
export const CRAWL_FETCH_TIMEOUT_MS = 15_000
// How many redirects the runner follows from one address before giving up on it.
export const FETCH_REDIRECT_LIMIT = 5
// Same-site links whose path ends in one of these are files, not pages to test.
export const NON_PAGE_EXTENSION =
  /\.(?:pdf|zip|gz|tar|png|jpe?g|gif|svg|webp|avif|ico|css|js|mjs|json|xml|txt|csv|mp3|mp4|webm|mov|woff2?|ttf|eot|docx?|xlsx?|pptx?)$/i
// Links a read-only run never follows or requests: a GET to one may end a session or change data.
export const UNSAFE_LINK = /log-?out|sign-?out|delete|remove|unsubscribe/i

// The first status that sends the client to another address.
export const HTTP_FIRST_REDIRECT_STATUS = 300
// The first status that counts as a failed response.
export const HTTP_ERROR_STATUS = 400
// The first status that means the server itself failed, whatever the request was.
export const HTTP_SERVER_ERROR_STATUS = 500
// What an API answers a request that carries no credentials or not the right ones.
export const HTTP_UNAUTHENTICATED_STATUSES: readonly number[] = [401, 403]
// What a link check records for a URL that never answered.
export const NO_RESPONSE_STATUS = 0
// What a link check records for a link that redirects to another site: the browser hides where a
// cross-site redirect leads and what it answers, and a redirect is itself an answer.
export const HTTP_REDIRECT_STATUS = 302
// The most links or images one page's check requests, how many links it requests at a time, and how
// long each request may take.
export const MAX_URLS_PER_PAGE_CHECK = 100
export const URL_CHECK_CONCURRENCY = 10
export const URL_CHECK_TIMEOUT_MS = 20_000
// The most screenshots one test keeps of the uncaught errors its pages raised.
export const MAX_ERROR_SCREENSHOTS = 3
// The most findings of one kind an accessibility check lists before it summarizes the rest.
export const MAX_LISTED_FINDINGS = 10

// Analytics and marketing scripts are not part of any page under test; blocking them keeps runs
// deterministic and stops test traffic from reaching the site owner's dashboards.
export const THIRD_PARTY_TRACKING =
  /^https?:\/\/([a-z0-9-]+\.)*(googletagmanager\.com|google-analytics\.com|doubleclick\.net|hotjar\.com|clarity\.ms|segment\.(com|io)|mixpanel\.com|facebook\.net|hubspot\.com|hs-scripts\.com|hs-analytics\.net|plausible\.io|fullstory\.com)\//

// How a test that bot protection got in the way of is reported: failed, with this reason first, so
// it is told apart at a glance from a failure that is about the site's own pages.
export const BOT_PROTECTION_FAILURE = 'failed due to bot protection'
// The site's own requests that belong to a bot-protection product (F5, Akamai, Imperva, Cloudflare,
// PerimeterX, DataDome, Kasada). One of them failing is a matter between the site and its
// protection product, and can happen in an ordinary visitor's browser too; it is reported apart
// from the failures of the site's own pages, without a claim about its cause.
export const BOT_PROTECTION_REQUEST =
  /\/common\.js\?(single|async|seed|matcher)|\/akam\/|\/_bm\/|\/_sec\/|\/_Incapsula_Resource|\/cdn-cgi\/(challenge-platform|bm)\/|\/_px[0-9A-Za-z]*\/|\/datadome|\/ips\.js(\?|$)/i
// What a page that is a bot check, not the site, shows: in its address, its title or its first
// heading. A best-effort match on the common products' challenge pages.
export const BOT_CHALLENGE_URL =
  /[?&](js_challenge|__cf_chl_[a-z_]*|captcha)=|\/cdn-cgi\/challenge-platform\//i
export const BOT_CHALLENGE_TEXT =
  /just a moment|attention required|prove your humanity|verify(ing)? (that )?you are (a )?human|are you a (robot|human)|pardon our interruption|access (to this page has been )?denied|unusual traffic|security check(point)?|checking your browser|bot (check|verification|protection)|request (was )?blocked|human verification/i

// How long the page-load check lets a loaded page go quiet (no network activity) before it judges
// the page, so an error a late script raises is caught. A page that never goes quiet is judged then.
export const PAGE_SETTLE_TIMEOUT_MS = 15_000

// What a browser reports for a request the page itself gave up on (a navigation away, an aborted
// fetch); these are not failures of the site.
export const ABORTED_REQUEST =
  /ERR_ABORTED|NS_BINDING_ABORTED|NS_ERROR_ABORT|cancell?ed|Load cannot follow/i

// The screens the responsive check lays each page out on. A phone or tablet names the Playwright
// device whose user agent, touch input and pixel density the browser takes on, so a site that
// serves handheld devices their own page is judged on that page; the desktop screen is the
// project's own browser.
export const RESPONSIVE_VIEWPORTS = [
  { name: 'phone', width: 375, height: 667, device: 'iPhone 8' },
  { name: 'tablet', width: 768, height: 1024, device: 'iPad Mini' },
  { name: 'desktop', width: 1280, height: 800 }
] as const
// Sub-pixel rounding can leave a page one pixel wider than its viewport without a visible scrollbar.
export const OVERFLOW_TOLERANCE_PX = 1
// How long a page gets to settle into a new viewport size before its width is judged.
export const LAYOUT_SETTLE_TIMEOUT_MS = 2_000
