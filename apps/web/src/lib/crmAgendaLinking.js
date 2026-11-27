export const CRM_AGENDA_LINK_SOURCE = Object.freeze({
  NONE: 'none',
  PATIENT_ID: 'patient_id',
  PHONE: 'phone',
  NAME: 'name',
});

export const normalizeCrmAgendaText = (value) => {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
};

export const normalizeCrmAgendaPhoneDigits = (value) => String(value || '').replace(/\D/g, '');

export const hasCompatibleCrmAgendaPhone = (leftPhone, rightPhone) => {
  const left = normalizeCrmAgendaPhoneDigits(leftPhone);
  const right = normalizeCrmAgendaPhoneDigits(rightPhone);

  if (left.length < 8 || right.length < 8) {
    return false;
  }

  return left === right || left.endsWith(right.slice(-8)) || right.endsWith(left.slice(-8));
};

export const getPatientAppointmentMatchSource = (patient, appointment) => {
  if (!patient || !appointment) {
    return CRM_AGENDA_LINK_SOURCE.NONE;
  }

  if (appointment.patientId && appointment.patientId === patient.id) {
    return CRM_AGENDA_LINK_SOURCE.PATIENT_ID;
  }

  if (hasCompatibleCrmAgendaPhone(appointment.phone, patient.phone)) {
    return CRM_AGENDA_LINK_SOURCE.PHONE;
  }

  const appointmentName = normalizeCrmAgendaText(appointment.patient);
  const patientName = normalizeCrmAgendaText(patient.name);

  if (appointmentName && appointmentName === patientName) {
    return CRM_AGENDA_LINK_SOURCE.NAME;
  }

  return CRM_AGENDA_LINK_SOURCE.NONE;
};

export const resolveAppointmentCrmPatient = (appointment, patients = []) => {
  if (!appointment) {
    return { patient: null, source: CRM_AGENDA_LINK_SOURCE.NONE };
  }

  if (appointment.patientId) {
    const linkedPatient = patients.find((patient) => patient.id === appointment.patientId);

    if (linkedPatient) {
      return { patient: linkedPatient, source: CRM_AGENDA_LINK_SOURCE.PATIENT_ID };
    }
  }

  const patientByPhone = patients.find((patient) => hasCompatibleCrmAgendaPhone(appointment.phone, patient.phone));

  if (patientByPhone) {
    return { patient: patientByPhone, source: CRM_AGENDA_LINK_SOURCE.PHONE };
  }

  const appointmentName = normalizeCrmAgendaText(appointment.patient);
  const patientByName = patients.find((patient) => (
    appointmentName && normalizeCrmAgendaText(patient.name) === appointmentName
  ));

  if (patientByName) {
    return { patient: patientByName, source: CRM_AGENDA_LINK_SOURCE.NAME };
  }

  return { patient: null, source: CRM_AGENDA_LINK_SOURCE.NONE };
};
