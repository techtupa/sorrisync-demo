import React from 'react';
import { TREATMENT_QUOTE_ACCEPTANCE_CHANNELS, TREATMENT_QUOTE_ACCEPTANCE_CHANNEL_LABELS } from '@/repositories/index.js';
import TreatmentQuoteDecisionModal from './TreatmentQuoteDecisionModal.jsx';

const TreatmentQuoteAcceptModal = (props) => <TreatmentQuoteDecisionModal
  {...props}
  operation="accept"
  title="Registrar aceite manual"
  description="Registre apenas uma decisão já comunicada à clínica. Isto não constitui assinatura eletrônica ou aceite digital."
  options={TREATMENT_QUOTE_ACCEPTANCE_CHANNELS.map((code) => ({ code, label: TREATMENT_QUOTE_ACCEPTANCE_CHANNEL_LABELS[code] }))}
  confirmationText="Confirmo que a decisão foi comunicada pelo paciente à clínica e que estou registrando o canal correto."
  submitLabel="Registrar aceite"
  dataAttribute="data-treatment-quote-accept-modal"
/>;

export default TreatmentQuoteAcceptModal;
