import {
  isSupabaseConfigured,
  supabaseAnonKey,
  supabaseUrl,
} from '@/lib/supabaseClient.js';

export const CONTACT_CHANNEL_OPTIONS = [
  { value: 'comercial', label: 'Comercial' },
  { value: 'suporte', label: 'Suporte' },
  { value: 'implantacao', label: 'Implantação' },
  { value: 'privacidade', label: 'Privacidade' },
];

export const CONTACT_PROFILE_OPTIONS = [
  { value: 'dentista_clinica', label: 'Dentista / Clínica' },
  { value: 'cliente_atual', label: 'Cliente atual' },
  { value: 'parceiro', label: 'Parceiro estratégico' },
  { value: 'outro', label: 'Outro' },
];

const appendField = (formData, key, value) => {
  formData.append(key, typeof value === 'string' ? value.trim() : value);
};

const parseResponse = async (response) => {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

export const submitPublicContact = async ({
  name,
  email,
  profile,
  channel,
  subject,
  message,
  attachments = [],
  startedAt,
  website = '',
}) => {
  if (!isSupabaseConfigured) {
    throw new Error('Envio indisponível: Supabase público não configurado.');
  }

  if (attachments == null || typeof attachments[Symbol.iterator] !== 'function' || Array.from(attachments).length > 0) {
    throw new Error('Este formulário não recebe anexos. Remova os arquivos e envie sua mensagem novamente.');
  }

  const formData = new FormData();
  appendField(formData, 'name', name);
  appendField(formData, 'email', email);
  appendField(formData, 'profile', profile);
  appendField(formData, 'channel', channel);
  appendField(formData, 'subject', subject);
  appendField(formData, 'message', message);
  appendField(formData, 'startedAt', startedAt || '');
  appendField(formData, 'website', website);

  const response = await fetch(`${supabaseUrl}/functions/v1/public-contact`, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: formData,
  });

  const payload = await parseResponse(response);

  if (!response.ok) {
    throw new Error(payload.message || 'Não foi possível enviar sua mensagem agora.');
  }

  return payload;
};
