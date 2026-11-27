# Hostinger deployment

Deploy this repository as a standalone Node.js Web App for the portfolio hostname `demo.sorrisync.com.br`. Use the organization's installation of the Hostinger GitHub App and the `techtupa/sorrisync-demo` repository. The public demo site and source repository have independent visibility.

| Setting | Value |
| --- | --- |
| App type | Node.js backend (Other) |
| Node | 24 |
| Package manager | npm |
| Git branch | main |
| Root directory | Repository root |
| Build command | npm run build |
| Build script in API settings | build |
| Entry file | server/main.js |

## Publish a revision

Commit demo changes to `main` in the [personal review repository](https://github.com/hugomorasneto/sorrisync-demo). In the [Tech Tupã deployment repository](https://github.com/techtupa/sorrisync-demo/actions/workflows/publish-demo.yml), run **Publish portfolio demo** from `main` and supply the full commit SHA.

The workflow runs the Node.js 24 install, tests, lint, and build against that exact commit. On success, it fast-forwards the Tech Tupã deployment branch to the same commit. The Hostinger integration builds the site from that branch. Check that the completed Hostinger deployment names the promoted revision and that the demo opens over HTTPS.

The workflow uses GitHub's temporary job token in the Tech Tupã repository and requires no shared deployment secret. Changes under `.github` need review in the deployment repository and must be kept in both repositories. A failed check or divergent history stops promotion.

## Runtime settings

Set `SORRISYNC_DEMO_ORIGIN` to `https://demo.sorrisync.com.br`. The server compares requests to this exact origin and uses the runtime's `PORT` when provided. Hostinger's loader can route the app when no port variable is provided. A different preview hostname needs its own exact origin. The hosted cookie is host-only, Secure, HttpOnly, and SameSite Strict.

Set `SORRISYNC_DEMO_DATA_DIR` to an absolute writable directory with an existing parent outside the deployment-controlled release tree, including `hbuilds` and `public_html`. Use a dedicated directory beside those directories under the demo site's account. Keep the SQLite file outside Git and outside the asset server's document root. The app creates the configured data directory on startup and retains the existing database.

## Hosted acceptance

1. Confirm the new website, repository, branch, HTTPS origin, and database directory in the hosting dashboard.
2. Run `npm ci`, `npm test`, `npm run lint`, and `npm run build` locally before release.
3. Open the hosted demo in a fresh browser session. Confirm that HTML and API responses have `X-Robots-Tag: noindex, nofollow`.
4. Send one fictional request from Omnichannel, review it in Front desk, reload, and record the reference and two history entries.
5. Re-deploy the same revision with the same settings. Open the demo in the same session and confirm the same reference, decision, and history. Use a separate session to confirm that it starts with an empty demo.
6. Verify the auto-deploy settings after the hosted persistence check. Verify each subsequent approved release against its Git revision and deployment logs.

Locally the server uses a loopback address and `.demo-data/`. The hosted version serves only the portfolio build and its demo API. The demo is outside navigation and sitemaps for the main site.
