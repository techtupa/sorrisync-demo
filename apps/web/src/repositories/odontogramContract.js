export const ODONTOGRAM_DENTITION = 'permanent';

export const ODONTOGRAM_ARCHES = Object.freeze([
  Object.freeze(['18', '17', '16', '15', '14', '13', '12', '11', '21', '22', '23', '24', '25', '26', '27', '28']),
  Object.freeze(['48', '47', '46', '45', '44', '43', '42', '41', '31', '32', '33', '34', '35', '36', '37', '38']),
]);

export const ODONTOGRAM_TEETH = Object.freeze(ODONTOGRAM_ARCHES.flat());

export const ODONTOGRAM_SURFACES = Object.freeze([
  'whole_tooth',
  'mesial',
  'distal',
  'occlusal_incisal',
  'buccal',
  'lingual_palatal',
]);

export const ODONTOGRAM_SURFACE_LABELS = Object.freeze({
  whole_tooth: 'Dente inteiro',
  mesial: 'Mesial',
  distal: 'Distal',
  occlusal_incisal: 'Oclusal/incisal',
  buccal: 'Vestibular',
  lingual_palatal: 'Lingual/palatina',
});

export const ODONTOGRAM_FINDINGS = Object.freeze([
  'caries',
  'restoration',
  'crown',
  'endodontic_treatment',
  'implant',
  'missing',
  'fracture',
]);

export const ODONTOGRAM_FINDING_LABELS = Object.freeze({
  caries: 'Cárie',
  restoration: 'Restauração',
  crown: 'Coroa',
  endodontic_treatment: 'Tratamento endodôntico',
  implant: 'Implante',
  missing: 'Ausente',
  fracture: 'Fratura',
});

export const ODONTOGRAM_WHOLE_TOOTH_FINDINGS = Object.freeze([
  'crown',
  'endodontic_treatment',
  'implant',
  'missing',
]);

export const ODONTOGRAM_RESOLUTION_REASONS = Object.freeze([
  'treated',
  'corrected_record',
  'no_longer_present',
  'replaced_by_new_finding',
]);

export const ODONTOGRAM_RESOLUTION_REASON_LABELS = Object.freeze({
  treated: 'Tratado',
  corrected_record: 'Correção de registro',
  no_longer_present: 'Não mais presente',
  replaced_by_new_finding: 'Substituído por novo achado',
});

export const isOdontogramTooth = (value) => ODONTOGRAM_TEETH.includes(String(value || ''));
export const isOdontogramSurface = (value) => ODONTOGRAM_SURFACES.includes(String(value || ''));
export const isOdontogramFinding = (value) => ODONTOGRAM_FINDINGS.includes(String(value || ''));
export const isOdontogramResolutionReason = (value) => ODONTOGRAM_RESOLUTION_REASONS.includes(String(value || ''));

export const validateOdontogramFinding = ({ toothCode, surfaceCode, findingCode } = {}) => {
  if (!isOdontogramTooth(toothCode) || !isOdontogramSurface(surfaceCode) || !isOdontogramFinding(findingCode)) {
    return { valid: false, message: 'Selecione um dente, uma superfície e um achado válidos.' };
  }
  if (ODONTOGRAM_WHOLE_TOOTH_FINDINGS.includes(findingCode) && surfaceCode !== 'whole_tooth') {
    return { valid: false, message: 'Este achado deve ser registrado para o dente inteiro.' };
  }
  return { valid: true, message: '' };
};

export const validateOdontogramResolution = ({ findingId, reasonCode } = {}) => {
  if (!findingId || !isOdontogramResolutionReason(reasonCode)) {
    return { valid: false, message: 'Selecione um motivo de resolução válido.' };
  }
  return { valid: true, message: '' };
};

const normalizeFinding = (row) => ({
  id: row.finding_id,
  toothCode: row.tooth_code,
  surfaceCode: row.surface_code,
  findingCode: row.finding_code,
  lifecycleStatus: row.lifecycle_status,
  createdAt: row.created_at,
  authorDisplayName: row.author_display_name || 'Profissional da clínica',
  resolvedAt: row.resolved_at || null,
  resolverDisplayName: row.resolver_display_name || null,
  resolutionReasonCode: row.resolution_reason_code || null,
  mutationResult: row.mutation_result || null,
});

export const buildOdontogramReadModel = (rows = []) => {
  const safeRows = Array.isArray(rows) ? rows : [];
  const chartRow = safeRows.find((row) => row?.chart_id) || null;
  const findings = safeRows.filter((row) => row?.finding_id).map(normalizeFinding);
  const activeFindings = findings.filter((finding) => finding.lifecycleStatus === 'active');
  const resolvedFindings = findings.filter((finding) => finding.lifecycleStatus === 'resolved');
  const findingsByTooth = Object.fromEntries(ODONTOGRAM_TEETH.map((toothCode) => [
    toothCode,
    findings.filter((finding) => finding.toothCode === toothCode),
  ]));
  const activeByTooth = Object.fromEntries(ODONTOGRAM_TEETH.map((toothCode) => [
    toothCode,
    activeFindings.filter((finding) => finding.toothCode === toothCode),
  ]));
  const findingsBySurface = Object.fromEntries(ODONTOGRAM_SURFACES.map((surfaceCode) => [
    surfaceCode,
    findings.filter((finding) => finding.surfaceCode === surfaceCode),
  ]));

  return {
    chart: chartRow ? {
      id: chartRow.chart_id,
      dentitionType: chartRow.dentition_type,
      status: chartRow.chart_status,
    } : null,
    teeth: ODONTOGRAM_TEETH,
    findings,
    currentFindings: activeFindings,
    activeFindings,
    resolvedFindings,
    findingsByTooth,
    findingsBySurface,
    activeByTooth,
  };
};

export const odontogramErrorMessage = (error) => {
  const code = String(error?.code || error?.message || '');
  if (code.includes('SS_ODONTOGRAM_DUPLICATE_ACTIVE')) return 'Este achado já está ativo para o dente e a superfície selecionados.';
  if (code.includes('SS_ODONTOGRAM_REQUEST_ID_CONFLICT')) return 'Esta solicitação já foi usada em outra operação.';
  if (code.includes('SS_ODONTOGRAM_ALREADY_RESOLVED')) return 'Este achado já foi resolvido e permanece preservado no histórico.';
  if (code.includes('SS_ODONTOGRAM_CONCURRENT_CONFLICT') || code === '23505') return 'A operação entrou em conflito com uma atualização simultânea. Atualize o odontograma e tente novamente.';
  if (code.includes('SS_ODONTOGRAM_INPUT_INVALID') || code === '22023') return 'Os dados estruturados do odontograma são inválidos.';
  if (code.includes('SS_ODONTOGRAM_ACCESS_DENIED') || code === '42501') return 'Seu perfil não possui acesso a esta operação no odontograma.';
  return 'Não foi possível concluir a operação no odontograma agora.';
};
