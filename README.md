# SorriSync Engineering Portfolio

Standalone English evaluation edition for REWORKIO. It uses the original SorriSync React screens with fictional clinics, patients, and transactions. Tech Tupã maintains the full product in a private repository.

Open the [hosted demo](https://demo.sorrisync.com.br/omnichannel) and inspect the [review source](https://github.com/hugomorasneto/sorrisync-demo).

## Run the evaluation edition

Use Node.js 24 or later.

```sh
npm ci
npm run build
npm start
npm test
```

Open [the local portfolio](http://127.0.0.1:4177/). The Node server serves the React build and the demo API from the same loopback address. It creates a Git-ignored SQLite file in `.demo-data/`. The browser workspace cookie identifies the reviewer’s isolated example.

## Trace the request from the screen to the database

1. Open **Omnichannel** in Aurora. Generate the simulated draft and select **Send to front desk**.
2. Open **Front desk** and check the request reference. Select **Accept preference** or **Request another preference**.
3. Reload the page. Confirm the same reference, decision, author, and timestamps in the persisted history.
4. After acceptance, **Prepare schedule preview** creates an illustrative appointment in the original Agenda. The appointment and any check-in are in memory.

The request uses a single fictional case per workspace. A new browser profile or private window starts a separate case. Repeated submissions return the same reference. A competing review receives a conflict and can read the saved decision.

| Evidence | Where to inspect | What to verify |
| --- | --- | --- |
| React integration and human review | `apps/web/src/portfolio/HandoffCard.jsx` and `apps/web/src/pages/ReceptionModePage.jsx` | Follow one reference from submission through review and reload. |
| Node.js and HTTP validation | `server/portfolio.js` | Inspect the JSON contract, origin checks, and browser workspace scope. |
| SQLite and concurrency | `server/store.js` | Follow the idempotency key, versioned review, and transaction that records the decision and its history event. |
| Automated verification | `server/portfolio.test.js` | Run `npm test` to verify restart recovery, repeated and concurrent actions, and workspace isolation. |
| Domain modeling | `apps/web/src/repositories/clinicFinanceSettlementContract.js` and `apps/web/src/portfolio/orders.js` | Inspect partial receipts and purchase delivery quantities. Exercise the original Finance and Inventory screens. |
| Clinical workflows | Clinical Record, Patient CRM and the treatment plan contract | Inspect fictional patient context, clinical notes, and a structured treatment plan. |

See [deployment and persistence checks](DEPLOYMENT.md) for the hosted setup.

## Storage and scope

SQLite stores the scheduling request, front desk decision, version, timestamps, and history. The Agenda and check-in preview, CRM, Clinical Record, Finance, and Inventory use synthetic data and in-memory changes. Reloading restores their starting data. The brief draft is deterministic. The edition uses local adapters for identity and messaging. The SQLite checks cover demo workspaces and do not certify production access policies.

This repository contains the standalone evaluation application. The full SorriSync repository remains private. The bundled font notices are in `apps/web/public/brand/`.
