import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { createAppointmentByTenant, getScheduleByTenant, SCHEDULE_STATUSES } from '@/repositories/index.js';
import { formatReceptionDateKeyInSaoPaulo } from '@/hooks/receptionDayReadModel.js';
import { CASEY, isPortfolioManager } from './clinic.js';

const endpoint = '/api/aurora/handoff';
const dateTime = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' });
const decisionLabels = {
  welcomed: 'Preference accepted',
  another: 'Another preference requested',
};

async function handoffRequest({ route = '', body, signal } = {}) {
  const response = await fetch(endpoint + route, {
    signal,
    ...(body ? {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    } : {}),
  });
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(result.error || 'The demo could not complete the action.');
    error.status = response.status;
    throw error;
  }
  return result.request;
}

function ReviewHistory({ request }) {
  return (
    <div className="space-y-1 border-t border-border/60 pt-2 text-xs">
      <p className="break-all text-muted-foreground">Request reference <code>{request.protocol}</code></p>
      <ul className="space-y-1" aria-label="Persisted request history">
        {request.events.map(event => (
          <li key={event.kind}>
            {event.kind === 'reviewed' ? 'Reviewed by' : 'Submitted by'} {event.actor}
            {' · '}{dateTime.format(new Date(event.at))}
          </li>
        ))}
      </ul>
    </div>
  );
}

function HandoffWorkspace({ currentTenantId, review }) {
  const [draft, setDraft] = useState(false);
  const [request, setRequest] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState('');
  const [appointment, setAppointment] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    handoffRequest({ signal: controller.signal })
      .then(value => {
        setRequest(value);
        setLoaded(true);
      })
      .catch(error => {
        if (!controller.signal.aborted) setError(error.message);
      });
    return () => controller.abort();
  }, [reload]);

  async function save(body, route = '') {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      setRequest(await handoffRequest({ route, body }));
    } catch (error) {
      if (error.status === 409) {
        try {
          setRequest(await handoffRequest());
        } catch {
          setError('Reload to view the recorded decision.');
          return;
        }
      }
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  function decide(decision) {
    return save({ version: request.version, decision }, '/' + request.protocol + '/review');
  }

  async function showSchedulePreview() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const model = getScheduleByTenant(currentTenantId);
      const id = 'portfolio-casey-' + request.protocol;
      const previous = model.appointments.find(item => String(item.id) === id);
      const record = previous ?? await createAppointmentByTenant(currentTenantId, {
        id,
        patientId: CASEY.id,
        patient: CASEY.name,
        date: formatReceptionDateKeyInSaoPaulo(),
        time: '17:30',
        duration: 30,
        professional: model.professionalOptions[0],
        room: model.roomOptions[0],
        procedure: 'New patient consultation',
        status: SCHEDULE_STATUSES.CONFIRMADA,
        origin: 'WhatsApp simulation',
        notes: 'Schedule preview from a reviewed portfolio request. The calendar is in memory.',
      });
      setAppointment(record);
    } catch {
      setError('The schedule preview could not be created.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mb-5 border-primary/30 bg-primary/5">
      <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="min-w-0 flex-1 space-y-2">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <ClipboardList className="h-4 w-4" />
            {review ? 'Appointment request review' : 'Appointment handoff'}
          </h2>
          <p className="text-sm text-muted-foreground">Casey Morgan requests a late-afternoon appointment.</p>
          {!loaded && !error && <p role="status" className="text-sm">Loading saved request…</p>}
          {!review && draft && !request && <p className="text-sm">Simulated draft: “I can request a late-afternoon appointment. Our front desk will review it.”</p>}
          {review && loaded && !request && <p className="text-sm">Send the sample request from Omnichannel to start the review.</p>}
          {request && <>
            <p role="status" className="text-sm font-semibold text-primary">{decisionLabels[request.decision] ?? 'Awaiting front desk review'}</p>
            <ReviewHistory request={request} />
            {review && request.decision === 'welcomed' && <p className="text-xs text-muted-foreground">The request and decision are saved in SQLite. The 17:30 calendar preview runs in memory.</p>}
          </>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {!loaded && error && <Button variant="outline" onClick={() => { setError(''); setReload(value => value + 1); }}>Reload request</Button>}
          {!review && loaded && !request && !draft && (
            <Button type="button" variant="outline" onClick={() => setDraft(true)}><Sparkles className="mr-2 h-4 w-4" /> Generate simulated draft</Button>
          )}
          {!review && loaded && !request && draft && <Button type="button" disabled={busy} onClick={() => save({})}>Send to front desk</Button>}
          {!review && request && <Button asChild><Link to="/modo-recepcao">Open front desk</Link></Button>}
          {review && loaded && !request && <Button asChild variant="outline"><Link to="/omnichannel">Open Omnichannel</Link></Button>}
          {review && request?.version === 1 && <>
            <Button type="button" disabled={busy} onClick={() => decide('welcomed')}>Accept preference</Button>
            <Button type="button" disabled={busy} variant="outline" onClick={() => decide('another')}>Request another preference</Button>
          </>}
          {review && request?.decision === 'welcomed' && !appointment && <Button type="button" disabled={busy} variant="outline" onClick={showSchedulePreview}>Prepare schedule preview</Button>}
          {appointment && <Button asChild><Link to={'/agenda?date=' + appointment.date + '&appointment=' + appointment.id}>Open Schedule</Link></Button>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function HandoffCard({ conversationId, review = false }) {
  const { currentTenantId, hasPermission } = useAuth();
  if (!isPortfolioManager(currentTenantId) || !hasPermission('appointments.manage')) return null;
  if (!review && conversationId !== 'mock-omni-conversation-aurora') return null;
  return <HandoffWorkspace currentTenantId={currentTenantId} review={review} />;
}
