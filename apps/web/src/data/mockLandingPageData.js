
export const landing_page_settings = {
  id: 'lp_1',
  tenant_id: 'tenant_aurora',
  custom_domain: 'aurora-dental.example.invalid',
  subdomain: 'Avery Chen.sorrisync.example.invalid',
  status: 'published',
  created_at: '2025-01-10T00:00:00Z',
  updated_at: '2026-05-31T10:00:00Z'
};

export const landing_page_sections = [
  { id: 'sec_1', name: 'Hero Principal', description: 'Primeira dobra com título, subtítulo e botões de ação.', active: true, order: 1 },
  { id: 'sec_2', name: 'Serviços', description: 'Grade com os principais tratamentos oferecidos.', active: true, order: 2 },
  { id: 'sec_3', name: 'Sobre a Profissional', description: 'Apresentação do dentista ou clínica.', active: true, order: 3 },
  { id: 'sec_4', name: 'Especialidades', description: 'Lista detalhada de especialidades atendidas.', active: true, order: 4 },
  { id: 'sec_5', name: 'Depoimentos', description: 'Prova social com relatos de pacientes reais.', active: true, order: 5 },
  { id: 'sec_6', name: 'Instagram', description: 'Grade visual com as últimas postagens do feed.', active: false, order: 6 },
  { id: 'sec_7', name: 'Localização', description: 'Mapa interativo e endereço completo.', active: true, order: 7 },
  { id: 'sec_8', name: 'Perguntas Frequentes', description: 'Acordeão com as principais dúvidas dos pacientes.', active: true, order: 8 },
  { id: 'sec_9', name: 'CTA Final', description: 'Chamada para ação antes do rodapé.', active: true, order: 9 },
  { id: 'sec_10', name: 'Rodapé SorriSync', description: 'Informações legais, links úteis e contatos.', active: true, order: 10 }
];

export const landing_page_services = [
  { id: 'srv_1', name: 'Implantes Dentários', description: 'Recupere sua autoestima e função mastigatória com implantes de alta tecnologia.', cta: 'Saber mais', icon: 'tooth', active: true },
  { id: 'srv_2', name: 'Próteses Dentárias', description: 'Soluções estéticas e funcionais personalizadas para o seu sorriso perfeito.', cta: 'Saber mais', icon: 'smile', active: true },
  { id: 'srv_3', name: 'Clareamento', description: 'Tratamento a laser rápido e seguro para dentes visivelmente mais brancos.', cta: 'Saber mais', icon: 'sparkles', active: true },
  { id: 'srv_4', name: 'Odontologia Estética', description: 'Facetas em resina e lentes de contato em porcelana sob medida.', cta: 'Saber mais', icon: 'camera', active: true },
  { id: 'srv_5', name: 'Prevenção', description: 'Check-ups, limpeza profilática e orientações para saúde bucal contínua.', cta: 'Agendar check-up', icon: 'shield', active: true }
];

export const landing_page_testimonials = [
  { id: 'test_1', name: 'Mariana A.', text: 'A Avery Chen transformou meu sorriso! O atendimento é impecável e o resultado das lentes de contato superou todas as expectativas.', service: 'Odontologia Estética', status: 'approved' },
  { id: 'test_2', name: 'Roberto L.', text: 'Fiz meus implantes na clínica e me senti super seguro. O ambiente é acolhedor e a equipe muito profissional.', service: 'Implantes Dentários', status: 'approved' },
  { id: 'test_3', name: 'Camila T.', text: 'Meu clareamento ficou maravilhoso, sem sensibilidade nenhuma. Recomendo de olhos fechados!', service: 'Clareamento Dental', status: 'approved' }
];

export const landing_page_ctas = {
  primary: { text: 'Agendar Avaliação', destination: '#agendamento', style: 'filled' },
  secondary: { text: 'Falar no WhatsApp', destination: 'https://wa.me/12025550100', style: 'outline' }
};

export const landing_page_form_fields = [
  { id: 'fld_1', name: 'Nome Completo', type: 'text', required: true, active: true },
  { id: 'fld_2', name: 'WhatsApp', type: 'tel', required: true, active: true },
  { id: 'fld_3', name: 'E-mail', type: 'email', required: false, active: true },
  { id: 'fld_4', name: 'Serviço de Interesse', type: 'select', required: true, active: true },
  { id: 'fld_5', name: 'Melhor Horário', type: 'select', required: false, active: true },
  { id: 'fld_6', name: 'Mensagem', type: 'textarea', required: false, active: true }
];

export const landing_page_leads = [
  { id: 'ld_1', name: 'João Silva', service: 'Implantes Dentários', date: '2026-05-30T14:20:00Z', status: 'novo' },
  { id: 'ld_2', name: 'Ana Souza', service: 'Clareamento', date: '2026-05-29T10:15:00Z', status: 'em_atendimento' },
  { id: 'ld_3', name: 'Carlos Mendes', service: 'Odontologia Estética', date: '2026-05-28T09:00:00Z', status: 'agendado' },
  { id: 'ld_4', name: 'Beatriz Costa', service: 'Próteses Dentárias', date: '2026-05-27T16:45:00Z', status: 'novo' },
  { id: 'ld_5', name: 'Fernando Alves', service: 'Prevenção', date: '2026-05-26T11:30:00Z', status: 'perdido' },
  { id: 'ld_6', name: 'Juliana Castro', service: 'Odontologia Estética', date: '2026-05-25T15:10:00Z', status: 'agendado' }
];

export const seo_settings = {
  title: 'Dr. Avery Chen | Dentista Especialista na Av. Paulista',
  description: 'Clínica odontológica na Bela Vista focada em implantes, facetas e reabilitação oral. Agende sua avaliação e transforme seu sorriso.',
  keywords: 'dentista av paulista, facetas porcelana sp, implante bela vista, clareamento dental',
  city: 'São Paulo',
  neighborhood: 'Bela Vista',
  canonical_url: 'https://aurora-dental.example.invalid'
};

export const brand_settings = {
  professional_name: 'Dr. Avery Chen',
  title: 'Odontologia de Excelência e Reabilitação Oral',
  subtitle: 'Transformamos sorrisos com tecnologia avançada e atendimento acolhedor no coração de São Paulo.',
  trust_highlights: ['+10 anos de experiência', '+5.000 sorrisos', 'Tecnologia 3D', 'Estacionamento VIP']
};
