export const CRM_AGENDA_DATE_PARAM_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isValidDateParam = (value) => {
  if (!CRM_AGENDA_DATE_PARAM_PATTERN.test(value || '')) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
};

export const formatCrmAgendaDateParam = (value) => {
  const rawValue = String(value || '').trim();

  if (!rawValue) {
    return '';
  }

  if (CRM_AGENDA_DATE_PARAM_PATTERN.test(rawValue)) {
    return isValidDateParam(rawValue) ? rawValue : '';
  }

  const date = new Date(rawValue);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const getCrmAgendaItemDateParam = (item) => {
  return formatCrmAgendaDateParam(item?.date || item?.starts_at || item?.startsAt);
};

export const resolveCrmAgendaDateSearchParam = (searchParams) => {
  return formatCrmAgendaDateParam(searchParams?.get?.('date'));
};

export const resolveCrmAgendaAppointmentSearchParam = (searchParams) => {
  return String(searchParams?.get?.('appointment') || '').trim();
};

export const resolveCrmPatientSearchParam = (searchParams) => {
  return String(searchParams?.get?.('patient') || '').trim();
};

export const resolveCrmLeadSearchParam = (searchParams) => {
  return String(searchParams?.get?.('lead') || '').trim();
};

export const buildCrmAgendaNavigationPath = (appointment) => {
  const params = new URLSearchParams();
  const date = getCrmAgendaItemDateParam(appointment);
  const appointmentId = String(appointment?.id || '').trim();

  if (date) {
    params.set('date', date);
  }

  if (appointmentId) {
    params.set('appointment', appointmentId);
  }

  const query = params.toString();
  return query ? `/agenda?${query}` : '/agenda';
};

export const buildCrmPatientNavigationPath = (patientOrId) => {
  const params = new URLSearchParams();
  const patientId = String(patientOrId?.id || patientOrId || '').trim();

  if (patientId) {
    params.set('patient', patientId);
  }

  const query = params.toString();
  return query ? `/pacientes?${query}` : '/pacientes';
};

export const buildCrmLeadNavigationPath = (leadOrId) => {
  const params = new URLSearchParams();
  const leadId = String(leadOrId?.id || leadOrId || '').trim();

  if (leadId) {
    params.set('lead', leadId);
  }

  const query = params.toString();
  return query ? `/pacientes?${query}` : '/pacientes';
};

export const getCrmAgendaAppointmentSortValue = (appointment) => {
  const date = getCrmAgendaItemDateParam(appointment);
  const time = appointment?.time || '00:00';
  const timestamp = new Date(`${date || '1970-01-01'}T${time}:00`).getTime();

  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
};
