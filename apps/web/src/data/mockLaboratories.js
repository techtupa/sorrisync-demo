
export const labs = [
  { id: 'lab_1', tenant_id: 'tenant_aurora', name: 'SmileLab', specialty: 'Próteses', status: 'Preferencial', contact: 'contato@example.invalid', city: 'São Paulo', active_orders: 6, monthly_cost: 4250.00, avg_deadline: 5, delay_rate: 2, created_at: '2025-01-10T10:00:00Z', updated_at: '2026-05-30T09:00:00Z' },
  { id: 'lab_2', tenant_id: 'tenant_aurora', name: 'Próteses Prime', specialty: 'Implantes', status: 'Ativo', contact: 'atendimento@example.invalid', city: 'Campinas', active_orders: 4, monthly_cost: 2800.00, avg_deadline: 7, delay_rate: 5, created_at: '2025-02-15T10:00:00Z', updated_at: '2026-05-28T11:00:00Z' },
  { id: 'lab_3', tenant_id: 'tenant_aurora', name: 'Dental Lab SP', specialty: 'Geral', status: 'Ativo', contact: 'pedidos@example.invalid', city: 'São Paulo', active_orders: 2, monthly_cost: 950.00, avg_deadline: 4, delay_rate: 1, created_at: '2025-03-20T10:00:00Z', updated_at: '2026-05-29T14:20:00Z' },
  { id: 'lab_4', tenant_id: 'tenant_aurora', name: 'OrtoDesign', specialty: 'Ortodontia visual', status: 'Preferencial', contact: 'lab@example.invalid', city: 'Curitiba', active_orders: 1, monthly_cost: 450.00, avg_deadline: 10, delay_rate: 0, created_at: '2025-04-12T10:00:00Z', updated_at: '2026-05-25T16:10:00Z' },
  { id: 'lab_5', tenant_id: 'tenant_aurora', name: 'EstéticaLab', specialty: 'Estética', status: 'Em avaliação', contact: 'contato@example.invalid', city: 'Rio de Janeiro', active_orders: 1, monthly_cost: 290.00, avg_deadline: 6, delay_rate: 15, created_at: '2025-05-18T10:00:00Z', updated_at: '2026-05-30T10:45:00Z' }
];

export const lab_orders = [
  { id: 'LAB-001', tenant_id: 'tenant_aurora', patient_name: 'Roberto Lima', procedure: 'Prótese sobre implante', lab_name: 'Próteses Prime', type: 'Prótese protocolo', status: 'Atrasado', deadline: '2026-05-29T10:00:00Z', estimated_cost: 1200.00, linked_appointment: '02/06/2026 14:00', responsible: 'Dr. Avery Chen', created_at: '2026-05-15T10:00:00Z', updated_at: '2026-05-30T09:00:00Z' },
  { id: 'LAB-002', tenant_id: 'tenant_aurora', patient_name: 'Fernanda Costa', procedure: 'Coroa E-max', lab_name: 'SmileLab', type: 'Prótese dentária', status: 'Pronto para retirada', deadline: '2026-06-01T10:00:00Z', estimated_cost: 850.00, linked_appointment: '03/06/2026 09:00', responsible: 'Dr. Avery Chen', created_at: '2026-05-20T10:00:00Z', updated_at: '2026-05-31T08:30:00Z' },
  { id: 'LAB-003', tenant_id: 'tenant_aurora', patient_name: 'Sônia Ribeiro', procedure: 'Protocolo Superior', lab_name: 'Próteses Prime', type: 'Prótese protocolo', status: 'Em produção', deadline: '2026-06-05T10:00:00Z', estimated_cost: 2500.00, linked_appointment: '08/06/2026 15:30', responsible: 'Dr. Carlos', created_at: '2026-05-22T10:00:00Z', updated_at: '2026-05-28T11:00:00Z' },
  { id: 'LAB-004', tenant_id: 'tenant_aurora', patient_name: 'Camila Torres', procedure: 'Placa de Bruxismo', lab_name: 'Dental Lab SP', type: 'Placa de clareamento', status: 'Enviado', deadline: '2026-05-31T10:00:00Z', estimated_cost: 180.00, linked_appointment: '01/06/2026 11:00', responsible: 'Dr. Avery Chen', created_at: '2026-05-25T10:00:00Z', updated_at: '2026-05-29T14:20:00Z' },
  { id: 'LAB-005', tenant_id: 'tenant_aurora', patient_name: 'João Silva', procedure: 'Lentes de Contato (6 dentes)', lab_name: 'EstéticaLab', type: 'Prótese dentária', status: 'Aguardando envio', deadline: '2026-06-10T10:00:00Z', estimated_cost: 3600.00, linked_appointment: '15/06/2026 10:00', responsible: 'Dr. Avery Chen', created_at: '2026-05-28T10:00:00Z', updated_at: '2026-05-28T16:10:00Z' },
  { id: 'LAB-006', tenant_id: 'tenant_aurora', patient_name: 'Mariana Alves', procedure: 'Aparelho Alinhador', lab_name: 'OrtoDesign', type: 'Outro', status: 'Em produção', deadline: '2026-06-15T10:00:00Z', estimated_cost: 1500.00, linked_appointment: '20/06/2026 14:00', responsible: 'Dra. Ana', created_at: '2026-05-20T10:00:00Z', updated_at: '2026-05-30T10:45:00Z' },
  { id: 'LAB-007', tenant_id: 'tenant_aurora', patient_name: 'Pedro Gomes', procedure: 'Coroa Provisória', lab_name: 'SmileLab', type: 'Coroa provisória', status: 'Entregue', deadline: '2026-05-28T10:00:00Z', estimated_cost: 150.00, linked_appointment: '29/05/2026 09:00', responsible: 'Dr. Avery Chen', created_at: '2026-05-20T10:00:00Z', updated_at: '2026-05-27T09:15:00Z' },
  { id: 'LAB-008', tenant_id: 'tenant_aurora', patient_name: 'Lucia Mendes', procedure: 'Conserto de Prótese', lab_name: 'Dental Lab SP', type: 'Manutenção/ajuste', status: 'Rascunho', deadline: '2026-06-02T10:00:00Z', estimated_cost: 200.00, linked_appointment: '05/06/2026 16:00', responsible: 'Dr. Carlos', created_at: '2026-05-30T10:00:00Z', updated_at: '2026-05-30T10:00:00Z' }
];

export const lab_order_costs = [
  { id: 'cost_1', tenant_id: 'tenant_aurora', lab_order_id: 'LAB-001', lab_id: 'lab_2', patient_id: 'pat_1', amount: 1200.00, status: 'A pagar', payable_id: 'pay_101', due_date: '2026-06-10T00:00:00Z', responsible: 'Dr. Avery Chen', created_at: '2026-05-15T10:00:00Z', updated_at: '2026-05-15T10:00:00Z' },
  { id: 'cost_2', tenant_id: 'tenant_aurora', lab_order_id: 'LAB-002', lab_id: 'lab_1', patient_id: 'pat_2', amount: 850.00, status: 'Pago visualmente', payable_id: 'pay_102', due_date: '2026-06-05T00:00:00Z', responsible: 'Dr. Avery Chen', created_at: '2026-05-20T10:00:00Z', updated_at: '2026-05-31T08:30:00Z' },
  { id: 'cost_3', tenant_id: 'tenant_aurora', lab_order_id: 'LAB-003', lab_id: 'lab_2', patient_id: 'pat_3', amount: 2500.00, status: 'Vinculado ao Financeiro', payable_id: 'pay_103', due_date: '2026-06-15T00:00:00Z', responsible: 'Dr. Carlos', created_at: '2026-05-22T10:00:00Z', updated_at: '2026-05-22T10:00:00Z' },
  { id: 'cost_4', tenant_id: 'tenant_aurora', lab_order_id: 'LAB-004', lab_id: 'lab_3', patient_id: 'pat_4', amount: 180.00, status: 'Aguardando nota', payable_id: null, due_date: '2026-06-05T00:00:00Z', responsible: 'Dr. Avery Chen', created_at: '2026-05-25T10:00:00Z', updated_at: '2026-05-25T10:00:00Z' },
  { id: 'cost_5', tenant_id: 'tenant_aurora', lab_order_id: 'LAB-005', lab_id: 'lab_5', patient_id: 'pat_5', amount: 3600.00, status: 'Parcial', payable_id: 'pay_105', due_date: '2026-06-20T00:00:00Z', responsible: 'Dr. Avery Chen', created_at: '2026-05-28T10:00:00Z', updated_at: '2026-05-28T10:00:00Z' },
  { id: 'cost_6', tenant_id: 'tenant_aurora', lab_order_id: 'LAB-006', lab_id: 'lab_4', patient_id: 'pat_6', amount: 1500.00, status: 'Não vinculado', payable_id: null, due_date: '2026-06-25T00:00:00Z', responsible: 'Dra. Ana', created_at: '2026-05-20T10:00:00Z', updated_at: '2026-05-20T10:00:00Z' },
  { id: 'cost_7', tenant_id: 'tenant_aurora', lab_order_id: 'LAB-007', lab_id: 'lab_1', patient_id: 'pat_7', amount: 150.00, status: 'Pago visualmente', payable_id: 'pay_107', due_date: '2026-05-30T00:00:00Z', responsible: 'Dr. Avery Chen', created_at: '2026-05-20T10:00:00Z', updated_at: '2026-05-27T09:15:00Z' },
  { id: 'cost_8', tenant_id: 'tenant_aurora', lab_order_id: 'LAB-008', lab_id: 'lab_3', patient_id: 'pat_8', amount: 200.00, status: 'Não vinculado', payable_id: null, due_date: '2026-06-10T00:00:00Z', responsible: 'Dr. Carlos', created_at: '2026-05-30T10:00:00Z', updated_at: '2026-05-30T10:00:00Z' }
];

export const lab_order_documents = [
  { id: 'doc_1', tenant_id: 'tenant_aurora', lab_order_id: 'LAB-001', lab_id: 'lab_2', patient_id: 'pat_1', nome: 'solicitacao-lab-roberto.pdf', tipo: 'Solicitação visual', status: 'Ativo', sensibilidade: 'Interna', created_at: '2026-05-15T10:05:00Z', updated_at: '2026-05-15T10:05:00Z' },
  { id: 'doc_2', tenant_id: 'tenant_aurora', lab_order_id: 'LAB-002', lab_id: 'lab_1', patient_id: 'pat_2', nome: 'foto-sorriso-fernanda.jpg', tipo: 'Foto futura', status: 'Ativo', sensibilidade: 'Restrita', created_at: '2026-05-20T10:10:00Z', updated_at: '2026-05-20T10:10:00Z' },
  { id: 'doc_3', tenant_id: 'tenant_aurora', lab_order_id: 'LAB-003', lab_id: 'lab_2', patient_id: 'pat_3', nome: 'guia-cor-sonia.png', tipo: 'Guia visual', status: 'Pendente', sensibilidade: 'Interna', created_at: '2026-05-22T10:15:00Z', updated_at: '2026-05-22T10:15:00Z' },
  { id: 'doc_4', tenant_id: 'tenant_aurora', lab_order_id: 'LAB-004', lab_id: 'lab_3', patient_id: 'pat_4', nome: 'comprovante-pagamento-lab.pdf', tipo: 'Comprovante', status: 'Revisar', sensibilidade: 'Fiscal', created_at: '2026-05-25T10:20:00Z', updated_at: '2026-05-25T10:20:00Z' },
  { id: 'doc_5', tenant_id: 'tenant_aurora', lab_order_id: 'LAB-005', lab_id: 'lab_5', patient_id: 'pat_5', nome: 'escaneamento-joao.stl', tipo: 'Documento interno', status: 'Ativo', sensibilidade: 'Restrita', created_at: '2026-05-28T10:25:00Z', updated_at: '2026-05-28T10:25:00Z' },
  { id: 'doc_6', tenant_id: 'tenant_aurora', lab_order_id: 'LAB-001', lab_id: 'lab_2', patient_id: 'pat_1', nome: 'nota-futura-proteses-prime.xml', tipo: 'Nota futura', status: 'Futuro', sensibilidade: 'Fiscal', created_at: '2026-05-30T10:30:00Z', updated_at: '2026-05-30T10:30:00Z' }
];

export const lab_order_status_events = [
  { id: 'evt_1', tenant_id: 'tenant_aurora', lab_order_id: 'LAB-001', lab_id: 'lab_2', patient_id: 'pat_1', event_type: 'Pedido criado', description: 'Pedido inicial registrado no sistema', user: 'Dr. Avery Chen', status: 'Sucesso', timestamp: '2026-05-15T10:00:00Z', created_at: '2026-05-15T10:00:00Z' },
  { id: 'evt_2', tenant_id: 'tenant_aurora', lab_order_id: 'LAB-001', lab_id: 'lab_2', patient_id: 'pat_1', event_type: 'Enviado ao laboratório', description: 'Moldagem enviada via motoboy', user: 'Recepção', status: 'Sucesso', timestamp: '2026-05-16T14:30:00Z', created_at: '2026-05-16T14:30:00Z' },
  { id: 'evt_3', tenant_id: 'tenant_aurora', lab_order_id: 'LAB-001', lab_id: 'lab_2', patient_id: 'pat_1', event_type: 'Atraso identificado', description: 'Prazo de entrega expirado. Laboratório não retornou.', user: 'Sistema', status: 'Atenção', timestamp: '2026-05-30T08:00:00Z', created_at: '2026-05-30T08:00:00Z' },
  { id: 'evt_4', tenant_id: 'tenant_aurora', lab_order_id: 'LAB-002', lab_id: 'lab_1', patient_id: 'pat_2', event_type: 'Documento anexado', description: 'Foto do sorriso anexada ao pedido', user: 'Dr. Avery Chen', status: 'Sucesso', timestamp: '2026-05-20T10:10:00Z', created_at: '2026-05-20T10:10:00Z' },
  { id: 'evt_5', tenant_id: 'tenant_aurora', lab_order_id: 'LAB-002', lab_id: 'lab_1', patient_id: 'pat_2', event_type: 'Status atualizado', description: 'Trabalho finalizado pelo laboratório', user: 'Recepção', status: 'Sucesso', timestamp: '2026-05-31T08:30:00Z', created_at: '2026-05-31T08:30:00Z' },
  { id: 'evt_6', tenant_id: 'tenant_aurora', lab_order_id: 'LAB-003', lab_id: 'lab_2', patient_id: 'pat_3', event_type: 'Custo vinculado', description: 'Conta a pagar gerada no módulo financeiro', user: 'Dr. Carlos', status: 'Simulado', timestamp: '2026-05-22T10:30:00Z', created_at: '2026-05-22T10:30:00Z' },
  { id: 'evt_7', tenant_id: 'tenant_aurora', lab_order_id: 'LAB-004', lab_id: 'lab_3', patient_id: 'pat_4', event_type: 'Tarefa criada', description: 'Tarefa para cobrar laboratório criada', user: 'Recepção', status: 'Pendente', timestamp: '2026-05-29T14:20:00Z', created_at: '2026-05-29T14:20:00Z' },
  { id: 'evt_8', tenant_id: 'tenant_aurora', lab_order_id: 'LAB-007', lab_id: 'lab_1', patient_id: 'pat_7', event_type: 'Entrega registrada', description: 'Trabalho recebido e conferido na clínica', user: 'Dr. Avery Chen', status: 'Sucesso', timestamp: '2026-05-27T09:15:00Z', created_at: '2026-05-27T09:15:00Z' }
];

export const lab_delivery_alerts = [
  { id: 'alt_1', tenant_id: 'tenant_aurora', lab_order_id: 'LAB-005', patient_id: 'pat_5', patient_name: 'Bruno Carvalho', tipo: 'Pedido atrasado', impacto: 'Retorno pode precisar reagendamento', prioridade: 'Alta', created_at: '2026-05-31T08:00:00Z' },
  { id: 'alt_2', tenant_id: 'tenant_aurora', lab_order_id: 'LAB-001', patient_id: 'pat_1', patient_name: 'Roberto Lima', tipo: 'Entrega próxima', impacto: 'Confirmar antes do retorno', prioridade: 'Média', created_at: '2026-05-31T08:15:00Z' },
  { id: 'alt_3', tenant_id: 'tenant_aurora', lab_order_id: 'LAB-002', patient_id: 'pat_2', patient_name: 'Fernanda Costa', tipo: 'Pronto para retirada', impacto: 'Avisar recepção', prioridade: 'Média', created_at: '2026-05-31T08:30:00Z' },
  { id: 'alt_4', tenant_id: 'tenant_aurora', lab_order_id: 'LAB-006', patient_id: 'pat_6', patient_name: 'Ana Beatriz Costa', tipo: 'Aguardando envio', impacto: 'Pode atrasar planejamento', prioridade: 'Baixa', created_at: '2026-05-31T09:00:00Z' }
];

export const lab_schedule_impacts = [
  { id: 'imp_1', tenant_id: 'tenant_aurora', lab_order_id: 'LAB-001', patient_id: 'pat_1', patient_name: 'Roberto Lima', appointment_id: 'app_1', appointment_desc: 'Retorno em 03/06/2026', status_pedido: 'Em produção', risco: 'Médio', acao_recomendada: 'Confirmar entrega', created_at: '2026-05-31T08:00:00Z' },
  { id: 'imp_2', tenant_id: 'tenant_aurora', lab_order_id: 'LAB-005', patient_id: 'pat_5', patient_name: 'Bruno Carvalho', appointment_id: 'app_2', appointment_desc: 'Retorno pendente', status_pedido: 'Atrasado', risco: 'Alto', acao_recomendada: 'Reagendar visualmente', created_at: '2026-05-31T08:15:00Z' },
  { id: 'imp_3', tenant_id: 'tenant_aurora', lab_order_id: 'LAB-004', patient_id: 'pat_4', patient_name: 'Camila Torres', appointment_id: 'app_3', appointment_desc: 'Entrega da placa', status_pedido: 'Pronto', risco: 'Baixo', acao_recomendada: 'Confirmar horário', created_at: '2026-05-31T08:30:00Z' },
  { id: 'imp_4', tenant_id: 'tenant_aurora', lab_order_id: 'LAB-003', patient_id: 'pat_3', patient_name: 'Sônia Ribeiro', appointment_id: 'app_4', appointment_desc: 'Etapa protética', status_pedido: 'Em produção', risco: 'Médio', acao_recomendada: 'Acompanhar prazo', created_at: '2026-05-31T09:00:00Z' }
];

export const getLabsByTenant = (tenantId) => labs.filter(d => d.tenant_id === tenantId);
export const getLabOrdersByTenant = (tenantId) => lab_orders.filter(d => d.tenant_id === tenantId);
export const getLabOrdersByStatus = (tenantId, status) => lab_orders.filter(d => d.tenant_id === tenantId && d.status === status);
export const getLabHistoryByTenant = (tenantId) => lab_order_status_events.filter(d => d.tenant_id === tenantId);

export const getCostsByTenant = (tenantId) => lab_order_costs.filter(d => d.tenant_id === tenantId);
export const getDocumentsByTenant = (tenantId) => lab_order_documents.filter(d => d.tenant_id === tenantId);
export const getEventsByTenant = (tenantId) => lab_order_status_events.filter(d => d.tenant_id === tenantId);
export const getAlertsByTenant = (tenantId) => lab_delivery_alerts.filter(d => d.tenant_id === tenantId);
export const getScheduleImpactsByTenant = (tenantId) => lab_schedule_impacts.filter(d => d.tenant_id === tenantId);
