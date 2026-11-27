export const CLINICAL_ENTRY_TYPES = Object.freeze({
  EVOLUTION: 'clinical_evolution',
  ADDENDUM: 'addendum',
});

export const CLINICAL_CONTENT_MIN_LENGTH = 5;
export const CLINICAL_CONTENT_MAX_LENGTH = 5000;

const forbiddenClinicalContentPatterns = [
  /<[^>]+>/i,
  /javascript\s*:|data\s*:\s*text\/html|on(?:error|load)\s*=/i,
  /```|`[^`]+`/,
  /!\[[^\]]*\]\([^)]*\)|\[[^\]]+\]\([^)]*\)/,
  /(^|\n)\s*(?:#{1,6}\s|>\s|[-*+]\s|\d+\.\s)/,
  /^\s*[\[{].*[\]}]\s*$/s,
];

export const normalizeClinicalContent = (value) => String(value || '').trim();

export const validateClinicalContent = (value) => {
  const content = normalizeClinicalContent(value);
  if (content.length < CLINICAL_CONTENT_MIN_LENGTH || content.length > CLINICAL_CONTENT_MAX_LENGTH) {
    return { valid: false, content, message: 'Informe entre 5 e 5.000 caracteres em texto simples.' };
  }
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(content)) {
    return { valid: false, content, message: 'O texto contém caracteres de controle não permitidos.' };
  }
  if (forbiddenClinicalContentPatterns.some((pattern) => pattern.test(content))) {
    return { valid: false, content, message: 'Use somente texto simples, sem HTML, Markdown executável, links ou payloads.' };
  }
  return { valid: true, content, message: '' };
};
export const clinicalRecordErrorMessage = (error) => {
  const code = String(error?.code || error?.message || '');
  if (code.includes('SS_CLINICAL_CONTENT_INVALID') || code === '22023') return 'O conteúdo clínico não atende ao contrato de texto simples.';
  if (code.includes('SS_CLINICAL_REQUEST_ID_CONFLICT') || code === '23505') return 'Esta solicitação já foi usada com outro conteúdo.';
  if (code.includes('SS_CLINICAL_ORIGINAL_NOT_FOUND') || code === 'P0002') return 'A evolução original não está disponível para este adendo.';
  if (code.includes('SS_CLINICAL_ACCESS_DENIED') || code === '42501') return 'Seu perfil não possui acesso a esta operação clínica.';
  return 'Não foi possível concluir a operação clínica agora.';
};
