import React from 'react';
import { TREATMENT_QUOTE_DECLINE_REASONS, TREATMENT_QUOTE_DECLINE_REASON_LABELS } from '@/repositories/index.js';
import TreatmentQuoteDecisionModal from './TreatmentQuoteDecisionModal.jsx';

const TreatmentQuoteDeclineModal = (props) => <TreatmentQuoteDecisionModal
  {...props}
  operation="decline"
  title="Registrar recusa"
  description="A recusa encerra esta versão e permite que uma nova versão seja emitida enquanto o plano permanecer ativo."
  options={TREATMENT_QUOTE_DECLINE_REASONS.map((code) => ({ code, label: TREATMENT_QUOTE_DECLINE_REASON_LABELS[code] }))}
  confirmationText="Revisei o paciente, o orçamento e o motivo fechado desta recusa."
  submitLabel="Registrar recusa"
  dataAttribute="data-treatment-quote-decline-modal"
/>;

export default TreatmentQuoteDeclineModal;
