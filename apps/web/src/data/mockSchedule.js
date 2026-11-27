
export const STATUSES = {
  CONFIRMADA: 'Confirmada',
  AGENDADA: 'Agendada',
  PENDENTE: 'Pendente',
  EM_ATENDIMENTO: 'Em atendimento',
  FINALIZADA: 'Finalizada',
  CANCELADA: 'Cancelada'
};

export const PROFESSIONALS = {
  aurora: 'Dr. Avery Chen',
  CARLOS: 'Dr. Ellis Stone',
  MARIANA: 'Dr. Devon Lee'
};

export const ROOMS = {
  CONSULTORIO_1: 'Consultório 1',
  CONSULTORIO_2: 'Consultório 2',
  AVALIACAO: 'Sala de avaliação'
};

export const mockAppointments = [
  {
    id: 'a1',
    tenant_id: 'tenant_aurora',
    patientId: '84000000-0000-4000-8000-000000000002', patient: 'Jordan Ellis',
    time: '09:00',
    duration: 60,
    procedure: 'Avaliação Inicial',
    professional: PROFESSIONALS.aurora,
    room: ROOMS.AVALIACAO,
    status: STATUSES.FINALIZADA,
    origin: 'Instagram',
    phone: '',
    notes: 'Fictional schedule entry.'
  },
  {
    id: 'a2',
    tenant_id: 'tenant_aurora',
    patientId: '84000000-0000-4000-8000-000000000003', patient: 'Avery Brooks',
    time: '10:00',
    duration: 120,
    procedure: 'Implante Dentário',
    professional: PROFESSIONALS.CARLOS,
    room: ROOMS.CONSULTORIO_1,
    status: STATUSES.EM_ATENDIMENTO,
    origin: 'Google',
    phone: '',
    notes: 'Fictional schedule entry.'
  },
  {
    id: 'a3',
    tenant_id: 'tenant_aurora',
    patientId: '84000000-0000-4000-8000-000000000004', patient: 'Taylor Reed',
    time: '11:00',
    duration: 60,
    procedure: 'Limpeza e Profilaxia',
    professional: PROFESSIONALS.MARIANA,
    room: ROOMS.CONSULTORIO_2,
    status: STATUSES.CONFIRMADA,
    origin: 'Indicação',
    phone: '',
    notes: 'Fictional schedule entry.'
  },
  {
    id: 'a4',
    tenant_id: 'tenant_aurora',
    patientId: '84000000-0000-4000-8000-000000000005', patient: 'Jamie Quinn',
    time: '13:00',
    duration: 90,
    procedure: 'Clareamento a Laser',
    professional: PROFESSIONALS.aurora,
    room: ROOMS.CONSULTORIO_1,
    status: STATUSES.CONFIRMADA,
    origin: 'Instagram',
    phone: '',
    notes: 'Fictional schedule entry.'
  },
  {
    id: 'a5',
    tenant_id: 'tenant_aurora',
    patientId: '84000000-0000-4000-8000-000000000006', patient: 'Riley Hale',
    time: '14:30',
    duration: 30,
    procedure: 'Retorno',
    professional: PROFESSIONALS.CARLOS,
    room: ROOMS.CONSULTORIO_2,
    status: STATUSES.PENDENTE,
    origin: 'WhatsApp',
    phone: '',
    notes: 'Fictional schedule entry.'
  },
  {
    id: 'a6',
    tenant_id: 'tenant_aurora',
    patientId: '84000000-0000-4000-8000-000000000007', patient: 'Parker Lane',
    time: '15:30',
    duration: 60,
    procedure: 'Restauração Estética',
    professional: PROFESSIONALS.MARIANA,
    room: ROOMS.CONSULTORIO_1,
    status: STATUSES.AGENDADA,
    origin: 'Google',
    phone: '',
    notes: ''
  },
  {
    id: 'a7',
    tenant_id: 'tenant_aurora',
    patientId: '84000000-0000-4000-8000-000000000008', patient: 'Robin Hayes',
    time: '16:00',
    duration: 30,
    procedure: 'Urgência - Dor',
    professional: PROFESSIONALS.aurora,
    room: ROOMS.AVALIACAO,
    status: STATUSES.CONFIRMADA,
    origin: 'WhatsApp',
    phone: '',
    notes: 'Fictional schedule entry.'
  },
  {
    id: 'a8',
    tenant_id: 'tenant_aurora',
    patientId: '84000000-0000-4000-8000-000000000009', patient: 'Skyler North',
    time: '16:30',
    duration: 60,
    procedure: 'Molde para Prótese',
    professional: PROFESSIONALS.CARLOS,
    room: ROOMS.CONSULTORIO_2,
    status: STATUSES.CANCELADA,
    origin: 'Site',
    phone: '',
    notes: 'Fictional schedule entry.'
  }
];

export const mockBlocks = [
  {
    id: 'b1',
    tenant_id: 'tenant_aurora',
    time: '12:00',
    duration: 60,
    professional: PROFESSIONALS.aurora,
    room: ROOMS.CONSULTORIO_1,
    reason: 'Almoço'
  },
  {
    id: 'b2',
    tenant_id: 'tenant_aurora',
    time: '12:00',
    duration: 60,
    professional: PROFESSIONALS.CARLOS,
    room: ROOMS.CONSULTORIO_2,
    reason: 'Almoço'
  },
  {
    id: 'b3',
    tenant_id: 'tenant_aurora',
    time: '12:00',
    duration: 60,
    professional: PROFESSIONALS.MARIANA,
    room: ROOMS.AVALIACAO,
    reason: 'Almoço'
  }
];

export const getAppointmentsByTenant = (tenantId) => {
  return mockAppointments.filter(a => a.tenant_id === tenantId);
};

export const getBlocksByTenant = (tenantId) => {
  return mockBlocks.filter(b => b.tenant_id === tenantId);
};

export const getAppointmentsByDay = (tenantId = 'tenant_aurora') => getAppointmentsByTenant(tenantId);

export const getConfirmationStats = (tenantId = 'tenant_aurora') => {
  const tenantApps = getAppointmentsByTenant(tenantId);
  return {
    total: tenantApps.length,
    confirmadas: tenantApps.filter(a => a.status === STATUSES.CONFIRMADA || a.status === STATUSES.FINALIZADA || a.status === STATUSES.EM_ATENDIMENTO).length,
    pendentes: tenantApps.filter(a => a.status === STATUSES.PENDENTE || a.status === STATUSES.AGENDADA).length,
    canceladas: tenantApps.filter(a => a.status === STATUSES.CANCELADA).length,
    ocupacao: 76
  };
};

export const getProfessionalOccupancy = () => {
  return [
    { professional: 'Dr. Avery Chen', value: 85 },
    { professional: 'Dr. Ellis Stone', value: 70 },
    { professional: 'Dr. Devon Lee', value: 65 }
  ];
};
