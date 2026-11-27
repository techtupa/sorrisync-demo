import React from 'react';
import { TREATMENT_QUOTE_CANCELLATION_REASONS, TREATMENT_QUOTE_CANCELLATION_REASON_LABELS } from '@/repositories/index.js';
import TreatmentQuoteDecisionModal from './TreatmentQuoteDecisionModal.jsx';

const TreatmentQuoteCancelModal = (props) => <TreatmentQuoteDecisionModal
  {...props}
  operation="cancel"
  title="Cancelar orçamento emitido"
  description="O cancelamento preserva integralmente esta versão e permite uma correção posterior enquanto o plano permanecer ativo."
  options={TREATMENT_QUOTE_CANCELLATION_REASONS.map((code) => ({ code, label: TREATMENT_QUOTE_CANCELLATION_REASON_LABELS[code] }))}
  confirmationText="Revisei o paciente, o orçamento e o motivo fechado deste cancelamento."
  submitLabel="Cancelar orçamento"
  dataAttribute="data-treatment-quote-cancel-modal"
/>;

export default TreatmentQuoteCancelModal;
