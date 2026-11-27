
export const mockClinicSettings = {
  tenant_settings: {
    id: 'ts_1',
    tenant_id: 'tenant_aurora',
    status: 'active',
    created_at: '2025-01-10T00:00:00Z',
    updated_at: '2026-05-31T10:00:00Z'
  },
  clinic_profiles: {
    id: 'cp_1',
    tenant_id: 'tenant_aurora',
    public_name: 'Dr. Avery Chen Odontologia',
    legal_name: 'Avery Chen Odontologia LTDA',
    operation_type: 'Consultório Individual',
    email: 'contato@example.invalid',
    phone: '+1 (202) 555-0100',
    whatsapp: '+1 (202) 555-0100',
    instagram: '@drahelenmoraes',
    address: 'Av. Paulista, 1000, Sala 502',
    city: 'São Paulo',
    state: 'SP',
    neighborhood: 'Bela Vista',
    zip_code: '01310-100',
    main_responsible: 'Dr. Avery Chen',
    short_description: 'Odontologia estética e reabilitação oral avançada.',
    full_description: 'Clínica especializada em transformar sorrisos com tecnologia de ponta e atendimento humanizado. Foco em facetas de porcelana, implantes e ortodontia invisível.',
    main_phrase: 'Seu sorriso, nossa obra de arte.',
    communication_tone: 'Profissional e Acolhedor',
    differentials: ['Atendimento humanizado', 'Tecnologia 3D', 'Ambiente climatizado'],
    specialties: ['Estética Dental', 'Implantodontia', 'Ortodontia'],
    status: 'active',
    created_at: '2025-01-10T00:00:00Z',
    updated_at: '2026-05-31T10:00:00Z'
  },
  brand_settings: {
    id: 'bs_1',
    tenant_id: 'tenant_aurora',
    primary_color: '#0f766e',
    secondary_color: '#d6b980',
    accent_color: '#10b981',
    visual_font: 'DM Sans',
    landing_page_style: 'Moderno',
    card_radius: 16,
    button_style: 'Arredondado',
    theme_mode: 'light',
    status: 'active',
    created_at: '2025-01-10T00:00:00Z',
    updated_at: '2026-05-31T10:00:00Z'
  },
  domain_settings: {
    id: 'ds_1',
    tenant_id: 'tenant_aurora',
    custom_domain: 'aurora-dental.example.invalid',
    subdomain: 'Avery Chen.sorrisync.example.invalid',
    domain_status: 'pending_dns',
    status: 'active',
    created_at: '2025-01-10T00:00:00Z',
    updated_at: '2026-05-31T10:00:00Z'
  },
  dns_records: [
    { id: 'dns_1', tenant_id: 'tenant_aurora', type: 'CNAME', name: 'www', value: 'cname.sorrisync.example.invalid', status: 'Pendente', created_at: '2026-05-30T00:00:00Z', updated_at: '2026-05-30T00:00:00Z' },
    { id: 'dns_2', tenant_id: 'tenant_aurora', type: 'A', name: '@', value: '76.76.21.21', status: 'Pendente', created_at: '2026-05-30T00:00:00Z', updated_at: '2026-05-30T00:00:00Z' },
    { id: 'dns_3', tenant_id: 'tenant_aurora', type: 'TXT', name: '_sorrisync_verify', value: 'sorrisync-verify=abc123def456', status: 'Pendente', created_at: '2026-05-30T00:00:00Z', updated_at: '2026-05-30T00:00:00Z' }
  ],
  seo_settings: {
    id: 'seo_1',
    tenant_id: 'tenant_aurora',
    seo_title: 'Dr. Avery Chen | Dentista na Av. Paulista',
    seo_description: 'Especialista em facetas de porcelana e implantes na Bela Vista, São Paulo. Agende sua avaliação.',
    local_keywords: 'dentista av paulista, facetas de porcelana sp, implante dentário bela vista',
    service_city: 'São Paulo',
    service_neighborhood: 'Bela Vista',
    canonical_url: 'https://aurora-dental.example.invalid',
    indexing_status: 'Indexado',
    status: 'active',
    created_at: '2025-01-10T00:00:00Z',
    updated_at: '2026-05-31T10:00:00Z'
  },
  business_hours: [
    { id: 'bh_1', tenant_id: 'tenant_aurora', day: 'Segunda-feira', active: true, start: '08:00', end: '18:00', break_start: '12:00', break_end: '13:00', note: '', created_at: '2025-01-10T00:00:00Z', updated_at: '2025-01-10T00:00:00Z' },
    { id: 'bh_2', tenant_id: 'tenant_aurora', day: 'Terça-feira', active: true, start: '08:00', end: '18:00', break_start: '12:00', break_end: '13:00', note: '', created_at: '2025-01-10T00:00:00Z', updated_at: '2025-01-10T00:00:00Z' },
    { id: 'bh_3', tenant_id: 'tenant_aurora', day: 'Quarta-feira', active: true, start: '08:00', end: '18:00', break_start: '12:00', break_end: '13:00', note: '', created_at: '2025-01-10T00:00:00Z', updated_at: '2025-01-10T00:00:00Z' },
    { id: 'bh_4', tenant_id: 'tenant_aurora', day: 'Quinta-feira', active: true, start: '08:00', end: '18:00', break_start: '12:00', break_end: '13:00', note: '', created_at: '2025-01-10T00:00:00Z', updated_at: '2025-01-10T00:00:00Z' },
    { id: 'bh_5', tenant_id: 'tenant_aurora', day: 'Sexta-feira', active: true, start: '08:00', end: '18:00', break_start: '12:00', break_end: '13:00', note: '', created_at: '2025-01-10T00:00:00Z', updated_at: '2025-01-10T00:00:00Z' },
    { id: 'bh_6', tenant_id: 'tenant_aurora', day: 'Sábado', active: true, start: '08:00', end: '12:00', break_start: '', break_end: '', note: 'Apenas avaliações', created_at: '2025-01-10T00:00:00Z', updated_at: '2025-01-10T00:00:00Z' },
    { id: 'bh_7', tenant_id: 'tenant_aurora', day: 'Domingo', active: false, start: '', end: '', break_start: '', break_end: '', note: 'Fechado', created_at: '2025-01-10T00:00:00Z', updated_at: '2025-01-10T00:00:00Z' }
  ],
  scheduling_rules: {
    id: 'sr_1',
    tenant_id: 'tenant_aurora',
    default_duration: 60,
    min_advance_hours: 24,
    max_daily_appointments: 12,
    allow_online_scheduling: true,
    require_confirmation: true,
    tolerance_minutes: 10,
    status: 'active',
    created_at: '2025-01-10T00:00:00Z',
    updated_at: '2026-05-31T10:00:00Z'
  },
  professionals: [
    { id: 'prof_1', tenant_id: 'tenant_aurora', name: 'Dr. Avery Chen', role: 'Dentista Proprietária', specialties: ['Estética', 'Implantodontia'], status: 'Ativo', agenda_status: 'Vinculada', agenda_color: '#0f766e', created_at: '2025-01-10T00:00:00Z', updated_at: '2026-05-31T10:00:00Z' },
    { id: 'prof_2', tenant_id: 'tenant_aurora', name: 'Dr. Carlos Silva', role: 'Dentista Parceiro', specialties: ['Ortodontia', 'Clínica Geral'], status: 'Ativo', agenda_status: 'Vinculada', agenda_color: '#3b82f6', created_at: '2025-02-15T00:00:00Z', updated_at: '2026-05-31T10:00:00Z' },
    { id: 'prof_3', tenant_id: 'tenant_aurora', name: 'Dra. Mariana Lopes', role: 'Endodontista', specialties: ['Endodontia'], status: 'Ativo', agenda_status: 'Vinculada', agenda_color: '#8b5cf6', created_at: '2025-06-20T00:00:00Z', updated_at: '2026-05-31T10:00:00Z' }
  ],
  rooms: [
    { id: 'room_1', tenant_id: 'tenant_aurora', name: 'Consultório 1', type: 'Cadeira odontológica', status: 'Ativa', main_use: 'Procedimentos complexos', preferred_professional: 'Dr. Avery Chen', created_at: '2025-01-10T00:00:00Z', updated_at: '2026-05-31T10:00:00Z' },
    { id: 'room_2', tenant_id: 'tenant_aurora', name: 'Consultório 2', type: 'Cadeira odontológica', status: 'Ativa', main_use: 'Clínica geral e Ortodontia', preferred_professional: 'Dr. Carlos Silva', created_at: '2025-01-10T00:00:00Z', updated_at: '2026-05-31T10:00:00Z' },
    { id: 'room_3', tenant_id: 'tenant_aurora', name: 'Sala de Avaliação', type: 'Sala de avaliação', status: 'Ativa', main_use: 'Primeiras consultas e orçamentos', preferred_professional: 'Todos', created_at: '2025-01-10T00:00:00Z', updated_at: '2026-05-31T10:00:00Z' }
  ],
  operation_settings: {
    id: 'os_1',
    tenant_id: 'tenant_aurora',
    status: 'active',
    created_at: '2025-01-10T00:00:00Z',
    updated_at: '2026-05-31T10:00:00Z'
  },
  security_settings: {
    id: 'sec_1',
    tenant_id: 'tenant_aurora',
    status: 'active',
    created_at: '2025-01-10T00:00:00Z',
    updated_at: '2026-05-31T10:00:00Z'
  }
};

export const getClinicSettings = (tenantId) => {
  // In a real app, this would fetch from Supabase based on tenantId
  return mockClinicSettings;
};
