import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ODONTOGRAM_ARCHES, ODONTOGRAM_FINDING_LABELS } from '@/repositories/index.js';

const ToothButton = ({ toothCode, findings, selected, onSelect }) => {
  const hasActive = findings.length > 0;
  const summary = findings.map((finding) => ODONTOGRAM_FINDING_LABELS[finding.findingCode]).join(', ');
  return (
    <button
      type="button"
      onClick={() => onSelect(toothCode)}
      aria-label={`Tooth ${toothCode}${hasActive ? `: ${summary}` : ': no finding recorded'}`}
      aria-pressed={selected}
      className={`group min-h-20 rounded-xl border p-2 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${selected ? 'ring-2 ring-primary ring-offset-2' : ''} ${hasActive ? 'border-amber-300 bg-amber-50 hover:border-amber-400' : 'border-border bg-background hover:border-primary/40 hover:bg-primary/5'}`}
      data-odontogram-tooth={toothCode}
    >
      <span className="mx-auto mb-2 flex h-8 w-7 items-center justify-center rounded-[45%] border-2 border-current bg-white text-xs font-bold text-slate-600 group-hover:text-primary">
        {toothCode}
      </span>
      <span className={`block truncate text-[11px] font-medium ${hasActive ? 'text-amber-900' : 'text-muted-foreground'}`}>
        {hasActive ? ODONTOGRAM_FINDING_LABELS[findings[0].findingCode] : 'Sem achado'}
      </span>
      {findings.length > 1 && <span className="mt-1 block text-[10px] text-amber-800">+{findings.length - 1} ativo{findings.length > 2 ? 's' : ''}</span>}
    </button>
  );
};

const OdontogramChart = ({ activeByTooth, selectedTooth, onSelectTooth }) => (
  <Card className="border-border/60 shadow-sm" data-odontogram-chart>
    <CardContent className="space-y-7 p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-lg font-semibold">Odontograma permanente</h2>
          <p className="mt-1 text-sm text-muted-foreground">Selecione um dos 32 dentes FDI para consultar o histórico estruturado.</p>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Legenda de estados">
          <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-900">Com achado ativo</Badge>
          <Badge variant="outline">Sem achado registrado</Badge>
        </div>
      </div>

      {ODONTOGRAM_ARCHES.map((arch, index) => (
        <section key={index} aria-label={index === 0 ? 'Arcada superior permanente' : 'Arcada inferior permanente'}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{index === 0 ? 'Arcada superior' : 'Arcada inferior'}</p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8 xl:grid-cols-[repeat(16,minmax(0,1fr))]">
            {arch.map((toothCode) => (
              <ToothButton key={toothCode} toothCode={toothCode} findings={activeByTooth[toothCode] || []} selected={selectedTooth === toothCode} onSelect={onSelectTooth} />
            ))}
          </div>
        </section>
      ))}

      <div aria-label="Legenda de achados" className="flex flex-wrap gap-2">
        {Object.values(ODONTOGRAM_FINDING_LABELS).map((label) => <Badge key={label} variant="secondary">{label === 'Tratamento endodôntico' ? 'Endodontia' : label}</Badge>)}
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm leading-relaxed text-blue-900" data-odontogram-no-inference>
        O odontograma apresenta apenas registros inseridos por profissionais autorizados. A ausência de marcação não representa diagnóstico ou avaliação automática.
      </div>
    </CardContent>
  </Card>
);

export default OdontogramChart;
