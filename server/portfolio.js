import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { DemoError, openStore } from './store.js';

const intention = '84000000-0000-4000-8000-000000000002';
const preference = 'late-afternoon';
const decisionCodes = new Set(['welcomed', 'another']);
const handoffRoute = /^\/api\/(aurora|harbor)\/handoff(?:\/([a-f0-9-]{36})\/review)?$/i;
const files = /^\/(?:assets|brand)(?:\/[a-z0-9_-][a-z0-9_.-]*)+$/i;
const types = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function reply(res, status, body, options = {}) {
  res.writeHead(status, {
    'Content-Type': options.type ?? 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex, nofollow',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
    ...(options.workspace ? { 'Set-Cookie': 'portfolio_workspace=' + options.workspace + '; HttpOnly; SameSite=Strict; Path=/' + (options.secure ? '; Secure' : '') } : {}),
  });
  res.end(body);
}

function json(res, status, data, options) {
  reply(res, status, JSON.stringify(data), options);
}

async function readBody(req) {
  if (req.headers['content-type']?.split(';')[0].trim() !== 'application/json') {
    throw new DemoError(415, 'Send a JSON request.');
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    size += chunk.length;
    if (size > 4096) {
      req.resume();
      throw new DemoError(413, 'The request is too large.');
    }
    chunks.push(chunk);
  }
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (body && typeof body === 'object' && !Array.isArray(body)) return body;
  } catch {
    // The response is the same for invalid JSON and invalid payload types.
  }
  throw new DemoError(400, 'Check the submitted fields.');
}

function actors(workspace) {
  const clinic = workspace + ':aurora';
  return {
    patient: { clinic, id: 'casey', name: 'Casey Morgan', role: 'patient' },
    desk: { clinic, id: 'morgan', name: 'Morgan Reed', role: 'desk' },
  };
}

async function handleHandoff({ req, res, store, match, origin }) {
  const [, clinic, protocol] = match;
  const isRead = req.method === 'GET' && !protocol;
  if (!isRead && req.method !== 'POST') {
    throw new DemoError(405, 'This method is not available.');
  }
  if (clinic.toLowerCase() === 'harbor') {
    if (!isRead) throw new DemoError(403, 'This demo profile can only read its own clinic.');
    return json(res, 200, { request: null });
  }

  if (!isRead && req.headers.origin !== origin.origin) {
    throw new DemoError(403, 'Open the demo page before sending this request.');
  }
  const token = req.headers.cookie?.match(/(?:^|;\s*)portfolio_workspace=([a-f0-9-]{36})(?:;|$)/)?.[1];
  const current = store.hasWorkspace(token) ? token : null;
  if (!current && !isRead) throw new DemoError(401, 'Reload the demo to open a workspace.');

  const workspace = current ?? store.createWorkspace();
  const { patient, desk } = actors(workspace);
  if (isRead) {
    return json(res, 200, { request: store.readSubmission(patient, intention) }, {
      workspace: current ? undefined : workspace,
      secure: origin.protocol === 'https:',
    });
  }

  const body = await readBody(req);
  if (!protocol) {
    if (Object.keys(body).length !== 0) throw new DemoError(400, 'This example uses a fixed appointment preference.');
    const { request, created } = store.submit(patient, intention, preference);
    return json(res, created ? 201 : 200, { request });
  }
  if (Object.keys(body).length !== 2 || body.version !== 1 || !decisionCodes.has(body.decision)) {
    throw new DemoError(400, 'Check the decision and request version.');
  }
  return json(res, 200, { request: store.review(desk, protocol.toLowerCase(), body.version, body.decision) });
}

export async function startPortfolio({ filename, webRoot, port = 0, publicOrigin = null }) {
  const store = openStore(filename);
  let origin = publicOrigin;
  const server = createServer(async (req, res) => {
    try {
      if (req.headers.host !== origin.host) throw new DemoError(421, 'Use the configured demo address.');
      const path = new URL(req.url, origin).pathname;
      const match = path.match(handoffRoute);
      if (match) return await handleHandoff({ req, res, store, match, origin });
      if (req.method !== 'GET' || path.startsWith('/api/')) throw new DemoError(404, 'Page not found.');

      const type = types[extname(path)];
      if (files.test(path) && type) {
        try {
          return reply(res, 200, await readFile(join(webRoot, path.slice(1))), { type });
        } catch (error) {
          if (error.code === 'ENOENT') throw new DemoError(404, 'Asset not found.');
          throw error;
        }
      }
      if (extname(path)) throw new DemoError(404, 'Asset not found.');
      return reply(res, 200, await readFile(join(webRoot, 'index.html')), { type: 'text/html; charset=utf-8' });
    } catch (error) {
      if (error instanceof DemoError) return json(res, error.status, { error: error.message });
      console.error(error);
      return json(res, 500, { error: 'The demo could not complete the action.' });
    }
  });

  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, publicOrigin ? '0.0.0.0' : '127.0.0.1', resolve);
    });
  } catch (error) {
    store.close();
    throw error;
  }
  const localOrigin = 'http://127.0.0.1:' + server.address().port;
  origin ??= new URL(localOrigin);
  return {
    origin: origin.origin,
    localOrigin,
    close: () => new Promise((resolve, reject) => {
      server.close(error => {
        store.close();
        if (error) reject(error);
        else resolve();
      });
    }),
  };
}
