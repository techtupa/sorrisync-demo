import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarPlus, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  clinicalProtocolTemplateErrorMessage,
  fetchClinicalProtocolReceptionQueue,
  fetchClinicalProtocolReceptionRooms,
  fetchClinicalProtocolReceptionSlots,
  scheduleClinicalProtocolReleasedStep,
  scheduleClinicalProtocolGroupedVisit,
} from '@/repositories/index.js';

const formatDate = (value) => new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo',
}).format(new Date(value));

const ClinicalProtocolToScheduleTab = () => {
  const { currentTenant, currentTenantId, isSupabaseMode, canAccessModule, hasPermission } = useAuth();
  const allowed = Boolean(isSupabaseMode && currentTenant?.slug === 'tenant_harbor'
    && currentTenantId && currentTenant?.membership_id
    && canAccessModule('mod_agenda')
    && hasPermission('patients.read') && hasPermission('appointments.read')
    && hasPermission('appointments.manage') && hasPermission('treatment_protocols.schedule'));
  const [queue, setQueue] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState(null);
  const [date, setDate] = useState('');
  const [roomId, setRoomId] = useState('');
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const scopeRef = useRef('');
  const scope = `${currentTenantId || ''}:${allowed}`;
  scopeRef.current = scope;

  const refresh = useCallback(async () => {
    if (!allowed) return;
    setLoading(true);
    setError('');
    try {
      const [nextQueue, nextRooms] = await Promise.all([
        fetchClinicalProtocolReceptionQueue(currentTenantId),
        fetchClinicalProtocolReceptionRooms(currentTenantId),
      ]);
      if (scopeRef.current === scope) {
        setQueue(nextQueue);
        setRooms(nextRooms);
      }
    } catch (failure) {
      if (scopeRef.current === scope) setError(failure.userMessage || clinicalProtocolTemplateErrorMessage(failure));
    } finally {
      if (scopeRef.current === scope) setLoading(false);
    }
  }, [allowed, currentTenantId, scope]);

  useEffect(() => {
    setQueue([]);
    setRooms([]);
    setSelected(null);
    setSlots([]);
    setNotice('');
    refresh();
  }, [refresh]);

  const choose = (entry) => {
    setSelected(entry);
    setDate('');
    setRoomId('');
    setSlots([]);
    setError('');
    setNotice('');
  };
  const loadSlots = async () => {
    if (!selected || !date || !roomId) return;
    setError('');
    setSlotsLoading(true);
    try {
      const rows = await fetchClinicalProtocolReceptionSlots({
        membershipId: currentTenant.membership_id,
        date, professionalId: selected.professional_id,
        roomId, durationMinutes: selected.duration_minutes,
      });
      if (scopeRef.current === scope) {
        setSlots(rows.filter((slot) => slot.available
          && new Date(slot.starts_at) >= new Date(selected.window_starts_at)
          && new Date(slot.starts_at).getTime() + selected.duration_minutes * 60000
            <= new Date(selected.window_ends_at).getTime()));
      }
    } catch (failure) {
      if (scopeRef.current === scope) setError(failure.userMessage || clinicalProtocolTemplateErrorMessage(failure));
    } finally {
      if (scopeRef.current === scope) setSlotsLoading(false);
    }
  };
  const book = async (startsAt) => {
    if (!selected || !roomId || saving) return;
    setSaving(true);
    setError('');
    try {
      const requestId = crypto.randomUUID();
      if (selected.booking_kind === 'grouped') {
        await scheduleClinicalProtocolGroupedVisit({
          visitId: selected.release_id, expectedVersion: selected.release_version,
          startsAt, roomId, requestId,
        });
      } else {
        await scheduleClinicalProtocolReleasedStep({
          releaseId: selected.release_id, expectedVersion: selected.release_version,
          startsAt, roomId, requestId,
        });
      }
      setSelected(null);
      setSlots([]);
      setNotice('Consulta criada na Agenda. A etapa permanece pendente até a documentação clínica.');
      await refresh();
    } catch (failure) {
      setError(failure.userMessage || clinicalProtocolTemplateErrorMessage(failure));
    } finally {
      setSaving(false);
    }
  };

  if (!allowed) return null;
  return <div className="space-y-4" data-clinical-protocol-reception-queue>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">Etapas a agendar</h2><p className="text-sm text-muted-foreground">A liberação clínica permite escolher um horário; ela ainda não é uma consulta.</p></div><Button variant="outline" size="sm" onClick={refresh} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" />Atualizar</Button></div>
    {loading && <p className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />Carregando liberações...</p>}
    {!loading && queue.length === 0 && !error && <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Nenhuma etapa liberada para agendamento neste momento.</p>}
    {queue.map((entry) => <Card key={entry.release_id}><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="font-medium">{entry.patient_name}</p><p className="text-sm text-muted-foreground">{entry.operation_label} · {entry.professional_name} · {entry.duration_minutes} min</p><p className="text-xs text-muted-foreground">Janela: {formatDate(entry.window_starts_at)} a {formatDate(entry.window_ends_at)}</p></div><Button size="sm" variant="outline" onClick={() => choose(entry)}><CalendarPlus className="mr-2 h-4 w-4" />Escolher horário</Button></CardContent></Card>)}
    {selected && <div className="space-y-3 rounded-lg border bg-background p-4"><p className="font-medium">Agendar para {selected.patient_name}</p><div className="grid gap-3 sm:grid-cols-2"><div><label htmlFor="protocol-reception-date" className="mb-1 block text-sm">Data</label><Input id="protocol-reception-date" type="date" value={date} onChange={(event) => { setDate(event.target.value); setSlots([]); }} /></div><div><label htmlFor="protocol-reception-room" className="mb-1 block text-sm">Sala</label><select id="protocol-reception-room" className="h-10 w-full rounded-md border bg-background px-3" value={roomId} onChange={(event) => { setRoomId(event.target.value); setSlots([]); }}><option value="">Selecione</option>{rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}</select></div></div><div className="flex flex-wrap gap-2"><Button size="sm" onClick={loadSlots} disabled={!date || !roomId || slotsLoading}>{slotsLoading ? 'Buscando horários...' : 'Buscar horários livres'}</Button><Button size="sm" variant="outline" onClick={() => setSelected(null)}>Voltar</Button></div>{slots.length > 0 && <div className="flex flex-wrap gap-2">{slots.map((slot) => <Button key={slot.starts_at} size="sm" variant="outline" disabled={saving} onClick={() => book(slot.starts_at)}>{formatDate(slot.starts_at)}</Button>)}</div>}{date && roomId && !slotsLoading && slots.length === 0 && <p className="text-xs text-muted-foreground">Busque os horários livres para esta sala e data.</p>}</div>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {notice && <p role="status" className="text-sm text-green-800">{notice}</p>}
  </div>;
};

export default ClinicalProtocolToScheduleTab;
