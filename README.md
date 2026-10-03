# MB Sports Court Builder

Customers design a sports court (12 court types) in 2D and 3D, see it in a
photo of their own yard, and request a quote. React + Vite + three.js, with a
Vercel serverless function (`api/send-quote.ts`) that emails the quote.

## Development

```bash
npm ci
npm run dev          # http://localhost:5173
npm run build        # type check (app, API and tests) + production build
npm test             # unit tests (Vitest)
npm run test:e2e     # browser tests (Playwright; builds and serves the app itself)
```

Browser tests need Chromium: `npx playwright install chromium`, or point
`CHROMIUM_PATH` at an installed browser. CI (`.github/workflows/ci.yml`) runs
the build, unit tests and browser tests on every push and pull request.

### Regenerating pictures

The Step 1 showcase pictures and the link-preview image are rendered by the
app's own 3D engine. After changing a sample design (`src/utils/showcase.ts`)
or the 3D look, start `npm run dev` and run:

```bash
npm run render:showcase   # public/showcase/*.jpg
npm run render:og         # public/og-image.jpg
```

## Configuration (Vercel environment variables)

| Variable | Required | Purpose |
| --- | --- | --- |
| `SMTP_USER`, `SMTP_PASS` | yes | Gmail account that sends the emails |
| `QUOTE_TO` | yes | Where quote requests go (`QUOTE_TO_CC`, `QUOTE_TO_BCC` optional) |
| `RECAPTCHA_SECRET` | recommended | reCAPTCHA v3 secret. Bots are rejected; the customer confirmation email is only sent when a visitor is verified |
| `CUSTOMER_CONFIRMATION` | no | Set to `off` to stop the "We received your design" email to customers |
| `LEAD_WEBHOOK_URL` | no | HTTPS URL that receives each lead as JSON (for example a Zapier "Catch Hook" that adds a row to Google Sheets or a CRM) |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | no | Upstash / Vercel KV store for rate limits shared across server instances (`UPSTASH_REDIS_REST_URL` / `_TOKEN` also work). Without it, limits are per instance |
| `SITE_URL` | no | Public address for link previews. Defaults to Vercel's production domain |

## Keeping lists in sync

Court types, labels, size limits and the sales-question options live in
`src/utils/courtData.ts`. The quote API keeps its own copies (it can't load
browser code at runtime) and the build fails if they drift apart.

## Merging

Merge pull requests with a regular merge commit rather than squash. Squash
merges give the work new commit IDs, so the same branch can't keep going
afterwards without being reset and force-pushed.
