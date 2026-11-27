import assert from 'node:assert/strict';
import { readdir, mkdtemp, rmdir, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { request } from 'node:http';
import { join } from 'node:path';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { startPortfolio } from './portfolio.js';

const root = '/api/aurora/handoff';
const reviewPath = request => root + '/' + request.protocol + '/review';

async function fixture(t, publicOrigin = null) {
  const directory = await mkdtemp(join(tmpdir(), 'sorrisync-portfolio-test-'));
  const filename = join(directory, 'test.sqlite');
  await writeFile(join(directory, 'index.html'), '<html lang="en"><title>SorriSync</title></html>');
  let app = await startPortfolio({ filename, webRoot: directory, publicOrigin });
  t.after(async () => {
    await app.close();
    for (const file of await readdir(directory)) await unlink(join(directory, file));
    await rmdir(directory);
  });

  function call(path, { cookie, body, origin = app.origin, host = publicOrigin?.host } = {}) {
    const payload = body === undefined ? null : JSON.stringify(body);
    const headers = {
      ...(cookie ? { Cookie: cookie } : {}),
      ...(host ? { Host: host } : {}),
      ...(payload === null ? {} : { 'Content-Type': 'application/json', Origin: origin }),
    };
    return new Promise((resolve, reject) => {
      const outgoing = request(app.localOrigin + path, {
        method: payload === null ? 'GET' : 'POST',
        headers,
      }, async incoming => {
        try {
          const chunks = [];
          for await (const chunk of incoming) chunks.push(chunk);
          resolve(new Response(Buffer.concat(chunks), {
            status: incoming.statusCode, headers: incoming.headers,
          }));
        } catch (error) { reject(error); }
      });
      outgoing.on('error', reject);
      outgoing.end(payload ?? undefined);
    });
  }

  async function workspace() {
    const response = await call(root);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { request: null });
    return response.headers.get('set-cookie').split(';')[0];
  }

  return {
    call, workspace,
    async restart() {
      await app.close();
      app = await startPortfolio({ filename, webRoot: directory, publicOrigin });
    },
    counts() {
      const db = new DatabaseSync(filename, { readOnly: true });
      try {
        return [db.prepare('SELECT count(*) AS n FROM requests').get().n,
          db.prepare('SELECT count(*) AS n FROM events').get().n];
      } finally {
        db.close();
      }
    },
  };
}

test('the same reference, outcome and history survive a server restart', async t => {
  const app = await fixture(t);
  const page = await app.call('/modo-recepcao');
  assert.match(await page.text(), /SorriSync/);
  const cookie = await app.workspace();
  const submitted = await app.call(root, { cookie, body: {} });
  assert.equal(submitted.status, 201);
  const { request } = await submitted.json();
  assert.equal(request.version, 1);
  const reviewed = await app.call(reviewPath(request), { cookie, body: { version: 1, decision: 'welcomed' } });
  assert.equal(reviewed.status, 200);
  const receipt = await reviewed.json();
  assert.equal(receipt.request.decision, 'welcomed');
  assert.deepEqual(receipt.request.events.map(event => event.kind), ['scheduling_handoff', 'reviewed']);
  await app.restart();
  assert.deepEqual(await (await app.call(root, { cookie })).json(), receipt);
  assert.deepEqual(app.counts(), [1, 2]);
});

test('retrying the handoff and reviewing from two tabs produce one recorded decision', async t => {
  const app = await fixture(t);
  const cookie = await app.workspace();
  const submitted = await app.call(root, { cookie, body: {} });
  const { request } = await submitted.json();
  const retry = await app.call(root, { cookie, body: {} });
  assert.equal(retry.status, 200);
  assert.equal((await retry.json()).request.protocol, request.protocol);
  const outcomes = await Promise.all(['welcomed', 'another'].map(decision => app.call(
    reviewPath(request), { cookie, body: { version: 1, decision } },
  )));
  assert.deepEqual(outcomes.map(response => response.status).sort(), [200, 409]);
  assert.deepEqual(app.counts(), [1, 2]);
});

test('a different browser workspace and the Harbor read-only context are isolated', async t => {
  const app = await fixture(t);
  const cookie = await app.workspace();
  const other = await app.workspace();
  const { request } = await (await app.call(root, { cookie, body: {} })).json();
  const body = { version: 1, decision: 'welcomed' };
  assert.equal((await app.call(reviewPath(request), { cookie: other, body })).status, 404);
  assert.deepEqual(await (await app.call(root, { cookie: other })).json(), { request: null });
  assert.deepEqual(await (await app.call('/api/harbor/handoff', { cookie })).json(), { request: null });
  assert.equal((await app.call(reviewPath(request).replace('aurora', 'harbor'), { cookie, body })).status, 403);
  assert.deepEqual(app.counts(), [1, 1]);
});

test('writes require the correct origin, an existing workspace and valid fields', async t => {
  const app = await fixture(t);
  const cookie = await app.workspace();
  assert.equal((await app.call(root, { body: {} })).status, 401);
  assert.equal((await app.call(root, { cookie, body: {}, origin: 'https://example.invalid' })).status, 403);
  assert.equal((await app.call(root, { cookie, body: { clinic: 'harbor' } })).status, 400);
  assert.deepEqual(app.counts(), [0, 0]);
});

test('the hosted origin issues Secure cookies and requires the configured HTTPS origin for writes', async t => {
  const origin = new URL('https://demo.example.invalid');
  const app = await fixture(t, origin);
  assert.equal((await app.call(root, { host: false })).status, 421);
  const opened = await app.call(root);
  assert.equal(opened.status, 200);
  assert.equal(opened.headers.get('x-robots-tag'), 'noindex, nofollow');
  assert.match(opened.headers.get('set-cookie'), /; Secure$/);
  const cookie = opened.headers.get('set-cookie').split(';')[0];
  assert.equal((await app.call(root, { cookie, body: {}, origin: 'http://demo.example.invalid' })).status, 403);
  const created = await app.call(root, { cookie, body: {} });
  assert.equal(created.status, 201);
  const saved = await created.json();
  await app.restart();
  assert.deepEqual(await (await app.call(root, { cookie })).json(), saved);
});
