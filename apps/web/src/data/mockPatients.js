
export const STATUSES = {
  NOVO_LEAD: 'Novo lead',
  AVALIACAO_MARCADA: 'Avaliação marcada',
  ORCAMENTO_ENVIADO: 'Orçamento enviado',
  TRATAMENTO_ACEITO: 'Tratamento aceito',
  EM_TRATAMENTO: 'Em tratamento',
  FINALIZADO: 'Finalizado',
  RETORNO_PENDENTE: 'Retorno pendente',
  INATIVO: 'Inativo',
  PERDIDO: 'Perdido'
};

export const ORIGINS = {
  INSTAGRAM: 'Instagram',
  GOOGLE: 'Google',
  WHATSAPP: 'WhatsApp',
  INDICACAO: 'Indicação',
  SITE: 'Site',
  TRAFEGO_PAGO: 'Tráfego pago',
  CONVENIO: 'Convênio'
};

export const INTERESTS = {
  AVALIACAO: 'Avaliação inicial',
  IMPLANTES: 'Implantes',
  PROTESES: 'Próteses',
  CLAREAMENTO: 'Clareamento',
  ESTETICA: 'Odontologia estética',
  LIMPEZA: 'Limpeza',
  RETORNO: 'Retorno',
  URGENCIA: 'Urgência'
};

export const RESPONSIBLES = {
  aurora: 'Dr. Avery Chen',
  CARLOS: 'Dr. Carlos Silva',
  MARIANA: 'Mariana (Recepção)'
};

const fictionalNames = ["Casey Morgan","Jordan Ellis","Avery Brooks","Taylor Reed","Jamie Quinn","Riley Hale","Parker Lane","Robin Hayes","Skyler North","Cameron Wells","Drew Carter","Reese Blake"];
export const mockPatients = fictionalNames.map((name, i) => ({
  id: '84000000-0000-4000-8000-' + String(i+1).padStart(12,'0'), tenant_id: i >= 10 ? 'tenant_harbor' : 'tenant_aurora',
  name, email: 'patient-' + (i + 1) + '@example.invalid', phone: '+1 202-555-01' + String(i).padStart(2,'0'),
  origin: ['WhatsApp', 'Website', 'Referral'][i % 3],
  interest: ['Initial consultation', 'Preventive care', 'Follow-up'][i % 3],
  status: Object.values(STATUSES)[i % Object.values(STATUSES).length],
  estimatedValue: 150 + 65 * i, lastInteraction: new Date().toISOString(),
  nextAction: i === 0 ? 'Review appointment request' : 'Review patient record',
  responsible: 'Morgan Reed', avatarInitials: name.split(' ').map(part=>part[0]).join(''),
  address: '', cpf: '', birthdate: '',
}));

export const getPatientsByTenant = (tenantId) => {
  return mockPatients.filter(p => p.tenant_id === tenantId);
};

export const getPatientsByStatus = (status, tenantId = 'tenant_aurora') => {
  return getPatientsByTenant(tenantId).filter(p => p.status === status);
};

export const filterPatients = (patients, filters) => {
  return patients.filter(p => {
    const matchSearch = filters.search ?
      p.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      p.phone.includes(filters.search) ||
      p.origin.toLowerCase().includes(filters.search.toLowerCase()) ||
      p.interest.toLowerCase().includes(filters.search.toLowerCase())
      : true;
    const matchStatus = filters.status ? p.status === filters.status : true;
    const matchOrigin = filters.origin ? p.origin === filters.origin : true;
    const matchInterest = filters.interest ? p.interest === filters.interest : true;
    const matchResponsible = filters.responsible ? p.responsible === filters.responsible : true;

    return matchSearch && matchStatus && matchOrigin && matchInterest && matchResponsible;
  });
};

export const getInsights = (tenantId = 'tenant_aurora') => {
  const tenantPatients = getPatientsByTenant(tenantId);
  return {
    total: tenantPatients.length,
    newLeads: tenantPatients.filter(p => p.status === STATUSES.NOVO_LEAD).length,
    scheduled: tenantPatients.filter(p => p.status === STATUSES.AVALIACAO_MARCADA).length,
    openBudgets: tenantPatients.filter(p => p.status === STATUSES.ORCAMENTO_ENVIADO).length,
    inTreatment: tenantPatients.filter(p => p.status === STATUSES.EM_TRATAMENTO).length,
    pendingReturns: tenantPatients.filter(p => p.status === STATUSES.RETORNO_PENDENTE).length
  };
};

export const getOriginDistribution = () => {
  return [
    { name: 'Instagram', value: 35 },
    { name: 'Google', value: 22 },
    { name: 'WhatsApp', value: 18 },
    { name: 'Indicação', value: 15 },
    { name: 'Site', value: 10 }
  ];
};

export const getUpcomingActions = (tenantId = 'tenant_aurora') => {
  return getPatientsByTenant(tenantId)
    .filter(p => p.nextAction !== 'Nenhuma')
    .slice(0, 5)
    .map(p => ({
      id: p.id,
      patientName: p.name,
      action: p.nextAction,
      date: p.lastInteraction
    }));
};
