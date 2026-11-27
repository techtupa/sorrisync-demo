import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { normalizePreference } from './catalog.js';

const formatPreference = request => ({
  ...request,
  preference: normalizePreference(request.preference),
});

export class DemoError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function openStore(filename) {
  const db = new DatabaseSync(filename);
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 3000;
    CREATE TABLE IF NOT EXISTS portfolio_workspaces (
      token TEXT PRIMARY KEY
    ) STRICT;
    CREATE TABLE IF NOT EXISTS requests (
      protocol TEXT PRIMARY KEY,
      clinic TEXT NOT NULL,
      patient TEXT NOT NULL,
      intention TEXT NOT NULL,
      preference TEXT NOT NULL,
      decision TEXT CHECK(decision IN ('welcomed', 'another')),
      version INTEGER NOT NULL DEFAULT 1 CHECK(version IN (1, 2)),
      UNIQUE(clinic, patient, intention),
      CHECK((version = 1 AND decision IS NULL) OR (version = 2 AND decision IS NOT NULL))
    ) STRICT;
    CREATE TABLE IF NOT EXISTS events (
      protocol TEXT NOT NULL REFERENCES requests(protocol),
      kind TEXT NOT NULL CHECK(kind IN ('scheduling_handoff', 'reviewed')),
      actor TEXT NOT NULL,
      at TEXT NOT NULL,
      PRIMARY KEY(protocol, kind)
    ) STRICT;
    CREATE INDEX IF NOT EXISTS requests_queue ON requests(clinic, version, protocol);
  `);

  const findWorkspace = db.prepare('SELECT token FROM portfolio_workspaces WHERE token = ?');
  const insertWorkspace = db.prepare('INSERT INTO portfolio_workspaces(token) VALUES (?)');
  const byScope = db.prepare(`
    SELECT protocol, preference, decision, version FROM requests
    WHERE protocol = ? AND clinic = ? AND (? = 'desk' OR patient = ?)
  `);
  const history = db.prepare("SELECT kind, actor, at FROM events WHERE protocol = ? ORDER BY kind = 'reviewed'");
  const findIntention = db.prepare('SELECT protocol, preference FROM requests WHERE clinic = ? AND patient = ? AND intention = ?');
  const insertRequest = db.prepare('INSERT INTO requests(protocol, clinic, patient, intention, preference) VALUES (?, ?, ?, ?, ?)');
  const recordEvent = db.prepare('INSERT INTO events(protocol, kind, actor, at) VALUES (?, ?, ?, ?)');
  const finishReview = db.prepare('UPDATE requests SET decision = ?, version = 2 WHERE protocol = ? AND clinic = ? AND version = ? AND version = 1');
  const queue = db.prepare(`
    SELECT r.protocol, r.preference FROM requests r
    JOIN events e ON e.protocol = r.protocol AND e.kind = 'scheduling_handoff'
    WHERE r.clinic = ? AND r.version = 1 ORDER BY e.at, r.protocol
  `);

  function readRequest(actor, protocol) {
    const request = byScope.get(protocol, actor.clinic, actor.role, actor.id);
    if (!request) throw new DemoError(404, 'This request is unavailable in the current session.');
    return { ...formatPreference(request), events: history.all(protocol) };
  }

  function transaction(work) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = work();
      db.exec('COMMIT');
      return result;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  function requireRole(actor, role) {
    if (actor.role !== role) throw new DemoError(403, 'This profile cannot perform that action.');
  }

  return {
    readRequest,
    readSubmission(actor, intention) {
      requireRole(actor, 'patient');
      const previous = findIntention.get(actor.clinic, actor.id, intention);
      return previous ? readRequest(actor, previous.protocol) : null;
    },
    hasWorkspace(token) {
      return typeof token === 'string' && Boolean(findWorkspace.get(token));
    },
    createWorkspace() {
      const token = randomUUID();
      insertWorkspace.run(token);
      return token;
    },
    listPending(actor) {
      requireRole(actor, 'desk');
      return queue.all(actor.clinic).map(formatPreference);
    },
    submit(actor, intention, preference) {
      requireRole(actor, 'patient');
      return transaction(() => {
        const previous = findIntention.get(actor.clinic, actor.id, intention);
        if (previous) {
          if (normalizePreference(previous.preference) !== preference) {
            throw new DemoError(409, 'This submission already has a different preference. Start a new request.');
          }
          return { request: readRequest(actor, previous.protocol), created: false };
        }
        const protocol = randomUUID();
        insertRequest.run(protocol, actor.clinic, actor.id, intention, preference);
        recordEvent.run(protocol, 'scheduling_handoff', actor.name, new Date().toISOString());
        return { request: readRequest(actor, protocol), created: true };
      });
    },
    review(actor, protocol, version, decision) {
      requireRole(actor, 'desk');
      return transaction(() => {
        readRequest(actor, protocol);
        if (!finishReview.run(decision, protocol, actor.clinic, version).changes) {
          throw new DemoError(409, 'This request has already been reviewed. See the recorded decision.');
        }
        recordEvent.run(protocol, 'reviewed', actor.name, new Date().toISOString());
        return readRequest(actor, protocol);
      });
    },
    reset() {
      transaction(() => db.exec('DELETE FROM events; DELETE FROM requests;'));
    },
    close() {
      db.close();
    },
  };
}
