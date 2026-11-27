# Hostinger deployment

Deploy this repository as a standalone Node.js Web App for the portfolio hostname `demo.sorrisync.com.br`. Use the organization's installation of the Hostinger GitHub App and the `techtupa/sorrisync-demo` repository. The public demo site and source repository have independent visibility.

| Setting | Value |
| --- | --- |
| App type | Node.js backend (Other) |
| Node | 24 |
| Package manager | npm |
| Git branch | main |
| Root directory | Repository root |
| Build | npm run build |
| Entry file | server/main.js |

Set `SORRISYNC_DEMO_ORIGIN` to `https://demo.sorrisync.com.br`. The server compares requests to this exact origin and uses the platform's `PORT`. A different preview hostname needs its own exact origin. The hosted cookie is host-only, Secure, HttpOnly, and SameSite Strict.

Set `SORRISYNC_DEMO_DATA_DIR` to an absolute writable directory with an existing parent outside the deployment-controlled release tree, including `hbuilds` and `public_html`. Use a dedicated directory beside those directories under the demo site's account. Keep the SQLite file outside Git and outside the asset server's document root. The app creates the configured data directory on startup and retains the existing database.

## Hosted acceptance

1. Confirm the new website, repository, branch, HTTPS origin, and database directory in the hosting dashboard.
2. Run `npm ci`, `npm test`, `npm run lint`, and `npm run build` locally before release.
3. Open the hosted demo in a fresh browser session. Confirm that HTML and API responses have `X-Robots-Tag: noindex, nofollow`.
4. Send one fictional request from Omnichannel, review it in Front desk, reload, and record the reference and two history entries.
5. Re-deploy the same revision with the same settings. Open the demo in the same session and confirm the same reference, decision, and history. Use a separate session to confirm that it starts with an empty demo.
6. Verify the auto-deploy settings after the hosted persistence check. Verify each subsequent approved release against its Git revision and deployment logs.

Locally the server uses a loopback address and `.demo-data/`. The hosted version serves only the portfolio build and its demo API. The demo is outside navigation and sitemaps for the main site.
