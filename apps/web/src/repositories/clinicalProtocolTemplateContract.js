export const CLINICAL_PROTOCOL_CRITERIA = Object.freeze([
  'manual_confirmation',
  'documented_session',
  'previous_step',
]);

export const CLINICAL_PROTOCOL_CRITERION_LABELS = Object.freeze({
  manual_confirmation: 'Confirmação do dentista',
  documented_session: 'Sessão documentada',
  previous_step: 'Etapa anterior concluída',
});

const isText = (value, min = 3, max = 100) =>
  typeof value === 'string' && value.trim().length >= min && value.trim().length <= max
    && !/[<>]|javascript\s*:|on(?:error|load)\s*=/i.test(value);

export const validateClinicalProtocolDefinition = (definition, { publish = false } = {}) => {
  if (!definition || Object.keys(definition).length !== 1
    || !Array.isArray(definition.phases) || definition.phases.length > 12) {
    return { valid: false, message: 'O modelo deve ter até 12 fases.' };
  }
  if (publish && definition.phases.length === 0) {
    return { valid: false, message: 'Adicione uma fase antes de publicar.' };
  }
  let stepCount = 0;
  for (const phase of definition.phases) {
    if (!phase || Object.keys(phase).length !== 2
      || !isText(phase.title) || !Array.isArray(phase.steps) || phase.steps.length > 20) {
      return { valid: false, message: 'Cada fase precisa de um título e pode conter até 20 etapas.' };
    }
    if (publish && phase.steps.length === 0) {
      return { valid: false, message: 'Cada fase publicada precisa de pelo menos uma etapa.' };
    }
    for (const step of phase.steps) {
      stepCount += 1;
      if (!step || Object.keys(step).length < 3 || Object.keys(step).length > 4
        || Object.keys(step).some((key) => !['title', 'duration_minutes', 'criteria', 'min_interval_days'].includes(key))
        || stepCount > 100 || !isText(step.title)
        || !Number.isInteger(step.duration_minutes)
        || step.duration_minutes < 5 || step.duration_minutes > 480
        || (step.min_interval_days !== undefined
          && (!Number.isInteger(step.min_interval_days) || step.min_interval_days < 0 || step.min_interval_days > 365))
        || !Array.isArray(step.criteria) || step.criteria.length > 3
        || new Set(step.criteria).size !== step.criteria.length
        || step.criteria.some((criterion) => !CLINICAL_PROTOCOL_CRITERIA.includes(criterion))
        || (stepCount === 1 && step.criteria.includes('previous_step'))) {
        return { valid: false, message: 'Revise o título, a duração e os critérios das etapas.' };
      }
    }
  }
  return { valid: true, message: '' };
};

export const clinicalProtocolTemplateErrorMessage = (error) => {
  const sqlState = String(error?.code || '');
  const code = String(error?.message || error?.code || '');
  if (code.includes('SS_PROTOCOL_ACCESS_DENIED') || sqlState === '42501') return 'Seu perfil não possui acesso a modelos de protocolo.';
  if (code.includes('SS_PROTOCOL_REVISION_CONFLICT')) return 'O modelo foi alterado em outra sessão. Atualize antes de salvar.';
  if (code.includes('SS_PROTOCOL_REQUEST_CONFLICT') || sqlState === '23505') return 'Esta solicitação já foi usada para outra operação.';
  if (code.includes('SS_PROTOCOL_NOT_PUBLISHABLE')) return 'Revise as fases e etapas antes de publicar.';
  if (code.includes('SS_PROTOCOL_TEMPLATE_ARCHIVED')) return 'Este modelo está arquivado e não pode ser editado.';
  if (code.includes('SS_PROTOCOL_PLAN_CONFLICT')) return 'O plano mudou durante a revisão. Atualize a ficha antes de aplicar o protocolo.';
  if (code.includes('SS_PROTOCOL_ALREADY_APPLIED')) return 'Este plano já possui um protocolo. Atualize a ficha para ver o histórico.';
  if (code.includes('SS_PROTOCOL_MAPPING')) return 'Revise as etapas e associe somente procedimentos planejados deste paciente.';
  if (code.includes('SS_PROTOCOL_REPLAN_BLOCKED')) return 'Esta etapa já foi documentada ou possui consulta vinculada. Preserve o histórico e revise outra etapa futura.';
  if (code.includes('SS_PROTOCOL_REPLAN')) return 'Revise título, procedimento e duração das etapas futuras.';
  if (code.includes('SS_PROTOCOL_VERSION_NOT_FOUND')) return 'A versão selecionada não está disponível para esta clínica.';
  if (code.includes('SS_PROTOCOL_MANAGED_')) return 'Este plano usa protocolo clínico. Continue pela execução guiada.';
  if (code.includes('SS_PROTOCOL_DRAFT_VERSION_CONFLICT')) return 'O rascunho mudou em outra sessão. Recarregue antes de salvar novamente.';
  if (code.includes('SS_PROTOCOL_DRAFT')) return 'Não foi possível salvar o rascunho. O texto continua nesta tela.';
  if (code.includes('SS_PROTOCOL_SESSION_REVIEW_REQUIRED')) return 'Revise o resultado, a evolução e as conclusões antes de finalizar.';
  if (code.includes('SS_PROTOCOL_SESSION_APPOINTMENT_INVALID')) return 'A consulta precisa estar finalizada e vinculada a este procedimento.';
  if (code.includes('SS_PROTOCOL_MANUAL_CONFIRMATION_REQUIRED')) return 'Confirme manualmente o critério desta etapa.';
  if (code.includes('SS_PROTOCOL_DEPENDENCY_PENDING')) return 'A etapa anterior ainda está pendente. Uma exceção exige justificativa clínica.';
  if (code.includes('SS_PROTOCOL_ACCEPTED_QUOTE_REQUIRED')) return 'O procedimento precisa constar no orçamento aceito.';
  if (code.includes('SS_PROTOCOL_ITEM_STEPS_PENDING')) return 'Há etapas deste procedimento ainda pendentes.';
  if (code.includes('SS_PROTOCOL_ITEM_COMPLETION_PENDING')) return 'Conclua ou dispense as etapas e confirme uma execução realizada antes de encerrar o procedimento.';
  if (code.includes('SS_PROTOCOL_COMPLETION_PENDING')) return 'Conclua ou dispense as etapas e resolva os itens pendentes antes de encerrar o protocolo.';
  if (code.includes('SS_PROTOCOL_FUTURE_APPOINTMENT_PENDING')) return 'Há consultas futuras vinculadas. Resolva-as antes de encerrar o protocolo.';
  if (code.includes('SS_PROTOCOL_RELEASE_APPOINTMENT_PENDING') || code.includes('SS_PROTOCOL_SCHEDULE_APPOINTMENT_PENDING')) return 'Há consulta ativa ou sessão finalizada sem documentação para este procedimento.';
  if (code.includes('SS_PROTOCOL_RELEASE_REVOCATION_BLOCKED')) return 'A liberação já foi usada ou alterada. Atualize o protocolo antes de revogar.';
  if (code.includes('SS_PROTOCOL_RELEASE_UNAVAILABLE') || code.includes('SS_PROTOCOL_RELEASE_INPUT_INVALID')) return 'Revise a etapa, o profissional, a duração e a janela antes de liberar.';
  if (code.includes('SS_PROTOCOL_SCHEDULE_RELEASE_STALE') || code.includes('SS_PROTOCOL_VISIT_SCHEDULE_STALE')) return 'Esta liberação mudou ou a janela expirou. Atualize a fila.';
  if (code.includes('SS_PROTOCOL_SCHEDULE_SLOT_UNAVAILABLE') || code.includes('SS_PROTOCOL_SCHEDULE_RESOURCE_UNAVAILABLE')) return 'O profissional, a sala ou o horário não estão disponíveis.';
  if (code.includes('SS_PROTOCOL_SCHEDULE')) return 'Não foi possível agendar esta etapa. Atualize a fila e tente novamente.';
  if (code.includes('SS_PROTOCOL_INTERVAL_PENDING')) return 'O intervalo definido pelo dentista ainda não foi cumprido.';
  if (code.includes('SS_PROTOCOL_WAIVER')) return 'A dispensa exige justificativa clínica válida e uma etapa elegível.';
  if (code.includes('SS_PROTOCOL_INPUT_INVALID') || sqlState === '22023') return 'Revise os dados do modelo.';
  if (sqlState === '40001' || sqlState === 'PT409') return 'Os dados foram alterados em outra sessão. Atualize antes de tentar novamente.';
  return 'Não foi possível concluir a operação no modelo de protocolo.';
};

export const createEmptyClinicalProtocolDefinition = () => ({ phases: [] });

export const validateProtocolApplicationMapping = (definition, mapping, plannedItemIds) => {
  if (!Array.isArray(mapping) || mapping.length < 1 || mapping.length > 100
    || mapping.some((entry) => !entry || !Number.isInteger(entry.phase_index) || !Number.isInteger(entry.step_index))
    || !Array.isArray(definition?.phases)) {
    return { valid: false, message: 'Associe pelo menos uma etapa ao plano.' };
  }
  const allowedItems = new Set(plannedItemIds);
  const seenSteps = new Set();
  let priorMappedStep = false;
  for (const entry of [...mapping].sort((a, b) => a.phase_index - b.phase_index || a.step_index - b.step_index)) {
    const step = definition.phases[entry.phase_index]?.steps?.[entry.step_index];
    const key = `${entry.phase_index}:${entry.step_index}`;
    if (!step || seenSteps.has(key) || !allowedItems.has(entry.item_id)
      || !Number.isInteger(entry.duration_minutes)
      || entry.duration_minutes < 5 || entry.duration_minutes > 480
      || (step.criteria.includes('previous_step') && !priorMappedStep)) {
      return { valid: false, message: 'Revise vínculos, durações e dependências das etapas.' };
    }
    seenSteps.add(key);
    priorMappedStep = true;
  }
  return { valid: true, message: '' };
};
