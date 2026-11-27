import additionalCopy from './english-copy.json';

const terms = new Map(`Clínica:|Clinic:
Plano:|Plan:
Perfil:|Role:
Ambiente clínico selecionado|Current clinic
Trocar clínica|Switch clinic
Mudar ambiente|Switch clinic
Alternar ambiente|Switch clinic
Selecionar ambiente|Choose clinic
Contexto atual|Current context
Outros ambientes|Other clinics
Ambientes disponíveis|Available clinics
Demonstração|Demo
Dados de demonstração|Synthetic data
Dados demo|Synthetic data
Fallback demo|Local simulation
Fallback sintético • dados demo|Synthetic local data
Ambiente alterado:|Clinic switched:
Sessão RLS futura filtrando dados para|Local demo records are scoped to
Notificações|Notifications
Abrir menu|Open menu
Perfil de usuário|User profile
Ajuda e Suporte|Help and support
Minha conta|My account
Sair|Sign out
Atendimento WhatsApp|Omnichannel inbox
Converse com pacientes de forma simples e segura.|Review messages, prepare replies, and route appointments for human review.
Atualizar agora|Refresh now
Última atualização:|Last updated:
automática a cada 15s com a aba visível; rascunhos preservados|refreshes every 15 seconds while visible; drafts are preserved
Use esta tela operacionalmente apenas com dados do atendimento. Quando a base estiver em demonstração, ela serve para validação visual e fica identificada como demo.|All messages and replies in this inbox are simulated.
Fila|Queue
Busca, filtros e prioridade operacional.|Search, filter, and prioritize conversations.
Não configurado|Simulated channel
1 fluxo da Agenda para revisão|1 scheduling request needs review
Fluxos da Agenda que precisam de revisão e responsável humano.|Scheduling requests awaiting a human review.
Prioridade calculada localmente a partir de Agenda, leitura, janela WhatsApp, retorno, vínculo CRM e responsável.|Priority combines schedule status, unread messages, follow-ups, the patient link, and ownership.
Abrir recomendada|Open recommended
Revisar agenda|Review schedule
Assumir a conversa e revisar a Agenda|Take ownership and review the schedule
Envio bloqueado|Sending disabled
Sem responsável|Unassigned
Humano imediato|Immediate human review
não lida|unread
retorno pendente|pending follow-up
exceção de agenda|scheduling exception
sem responsável|unassigned
Responder agora|Reply now
Janela aberta e ação manual recomendada agora.|Reply window open; a manual response is recommended.
Não lidas|Unread
Visão da fila|Queue view
Ajuste os filtros ou atualize a leitura. Quando a base estiver em demonstração, este resultado não representa volume real da clínica.|Change the filters or refresh the synthetic inbox.
Ações|Actions
Assistência|Assistance
Sugestões|Suggestions
Não informado|Not provided
Aberta|Open
Resposta manual bloqueada|Manual sending disabled
Resposta manual indisponível para este perfil ou conversa.|Manual sending is disabled for this demo.
Agenda pelo WhatsApp|Scheduling via WhatsApp
Revisão humana necessária|Human review required
O fluxo automático foi interrompido com segurança e precisa de revisão humana.|The automated flow was paused for human review.
Ver histórico|View history
Configuração de lembretes, limite mensal e orçamento continuam tenant-scoped em Configurações.|Reminder settings and usage limits are scoped to each clinic.
Responder entrada não lida|Review unread message
Visualização restrita ao atendimento via proxy seguro. Nada é aberto automaticamente.|Attachments open only after an explicit action.
Ouvir áudio|Play audio
Baixar com segurança|Download file
Preview restrito ao atendimento após validação do acesso pelo proxy.|Preview available after access verification.
Clínica. Texto. Saída registrada no atendimento. Quando for bot/sistema, não representa atendente humana.|Clinic text message recorded in the conversation.
A mensagem só será enviada quando você clicar em Enviar.|Replies require confirmation.
Canal WhatsApp oficial ainda não está ativo para envio.|WhatsApp sending is disabled in this demo.
Sem conversa selecionada|No conversation selected
Selecione uma conversa|Select a conversation
Nenhuma conversa encontrada|No conversations found
Nenhuma conversa encontrada.|No conversations found.
Mensagem|Message
Mensagens|Messages
Enviar|Send
Nota interna|Internal note
Prioridade|Priority
Responsável|Owner
Alta|High
Normal|Normal
Baixa|Low
Em espera|Waiting
Agenda Inteligente|Schedule
Visualize horários, confirme consultas e organize múltiplos profissionais.|View appointment slots and coordinate providers.
Bloquear Horário|Block time
Nova Consulta|New appointment
Confirmações automáticas e sincronização externa não estão ativas; a rotina usa status operacional, bloqueios e cadastro do CRM.|This demo uses appointment status, availability blocks, and the local patient directory.
Consultas hoje|Appointments today
Confirmadas|Confirmed
Pendentes|Pending
Canceladas/Faltas|Canceled / no-show
Ocupação Média|Average occupancy
Todos profissionais|All providers
Todos os profissionais|All providers
Todos os status|All statuses
Hoje|Today
Dia|Day
Semana|Week
Lista|List
Almoço|Lunch
Avaliação Inicial|Initial consultation
Avaliação inicial|Initial consultation
Consultório|Room
Sala de avaliação|Consultation room
Urgência - Dor|Urgent consultation
Implante Dentário|Dental implant
Molde para Prótese|Denture impression
Restauração Estética|Cosmetic restoration
Limpeza e Profilaxia|Cleaning and preventive care
Clareamento a Laser|Laser whitening
Agendada|Scheduled
Confirmada|Confirmed
Pendente|Pending
Em atendimento|In treatment
Finalizada|Completed
Cancelada|Canceled
Próxima Consulta|Next appointment
Urgência Solicitada|Urgent request
Paciente aguardando encaixe na recepção.|Patient is waiting for an available slot.
Pacientes aguardam contato manual da recepção.|Patients are waiting for front desk follow-up.
Modo Recepção|Front desk
Acompanhe a rotina de hoje com consultas, bloqueios, profissionais, salas e status operacionais vindos da Agenda.|Follow today's appointments, availability blocks, providers, rooms, and statuses.
Check-in separado da Agenda, sem fila própria ou mudança automática de status.|Check-in records an arrival. Appointment status stays under staff control.
Abrir Agenda|Open Schedule
Abrir CRM|Open patient CRM
Misto|Mixed
A confirmar|Needs confirmation
Agendada ou pendente|Scheduled or pending
Status confirmado|Confirmed status
Status ativo na Agenda|In progress on the schedule
Finalizadas|Completed
Atendimento encerrado|Visit completed
Fila do dia|Today's queue
Agenda de Hoje|Today's schedule
Hora|Time
Paciente|Patient
Pacientes|Patients
Procedimento|Procedure
Profissional / Sala|Provider / room
Origem externa não conectada|External source disconnected
Leitura por períodos derivada da Agenda, sem fila própria ou estado novo.|Time groups reflect the current schedule.
Manhã|Morning
Tarde|Afternoon
Próximo ativo|Next active
Registrar chegada|Record arrival
Chegada registrada|Arrival recorded
Registrar check-in|Record check-in
Iniciar atendimento|Start visit
Ver paciente|View patient
Dados de pacientes nesta versão são fictícios.|All patient data is fictional.
Pacientes & CRM|Patient CRM
Gerencie seus pacientes, leads e funil de conversão.|Manage patients, leads, and the conversion pipeline.
Novo Paciente|New patient
Base de Pacientes|Patient directory
Funil de Vendas (Leads)|Lead pipeline
Lista de Retorno|Follow-up list
Origem|Source
Interesse|Interest
Limpar filtros|Clear filters
Contato|Contact
Origem & Interesse|Source and interest
Próxima Ação|Next action
Valor|Amount
Atualizado em|Updated
Novo lead|New lead
Avaliação marcada|Consultation scheduled
Orçamento enviado|Quote sent
Tratamento aceito|Treatment accepted
Em tratamento|In treatment
Finalizado|Completed
Retorno pendente|Follow-up due
Inativo|Inactive
Perdido|Lost
Indicação|Referral
Prontuário|Clinical record
Evolução longitudinal, odontograma permanente e plano de tratamento estruturado, com autoria e histórico preservado.|Review longitudinal notes, the permanent odontogram, and the structured treatment plan with authorship and history.
Supabase • registros clínicos reais|Synthetic local records
Sem edição ou exclusão|Append-only history
O prontuário reúne evoluções, odontograma e plano de tratamento. Os protocolos clínicos acrescentam etapas, documentação de sessões e liberação de agendamento quando habilitados para a clínica. Assinatura, anexos, Portal do Paciente, IA, cobrança e movimentações automáticas de estoque seguem em frentes próprias.|Explore fictional clinical notes, the odontogram, and a treatment plan.
Selecione um paciente para abrir o prontuário|Select a patient to open their record
Selecione um paciente para consultar o prontuário.|Select a patient to view the clinical record.
Nenhum conteúdo clínico é carregado sem um paciente válido.|Clinical data appears after a patient is selected.
Plano de tratamento|Treatment plan
Odontograma|Odontogram
Evoluções|Clinical notes
Nova evolução|New clinical note
Avaliação|Consultation
Financeiro|Finance
Financeiro da Clínica • lançamentos e baixas manuais controlados|Clinic finance · controlled manual entries and receipts
Esta área mantém recebíveis e pagáveis operacionais da clínica atual. Perfis autorizados podem cadastrar, editar, cancelar, registrar valores parciais ou integrais, estornar cada registro e conferir referências manuais. Esse controle interno não executa movimentação ou conciliação bancária, PIX ou boleto. Billing e cobrança SaaS pertencem ao Master Control.|Track fictional receivables and payables for the current clinic. Record partial or full manual receipts and review the balance.
Acompanhe valores e registre obrigações, pagamentos e recebimentos parciais sem movimentar dinheiro.|Track obligations and record simulated payments and partial receipts.
Gestão e baixa manual|Manual entries and settlements
Exportar • Próxima etapa|Export · later phase
Nova conta a pagar|New payable
Nova conta a receber|New receivable
Visão Geral|Overview
Contas a Receber|Receivables
Contas a Pagar|Payables
Orçamentos • Próxima etapa|Quotes · later phase
Fluxo de Caixa • Próxima etapa|Cash flow · later phase
DRE • Próxima etapa|Income statement · later phase
Fiscal • Próxima etapa|Tax · later phase
A receber em aberto|Outstanding receivables
A pagar em aberto|Outstanding payables
registro(s) carregado(s)|records loaded
Valores vencidos|Overdue amounts
vencimento(s)|due dates
Saldo operacional em aberto|Open operating balance
A receber menos a pagar; não representa lucro|Receivables less payables
Próximos vencimentos|Upcoming due dates
Distribuição por status|Status breakdown
Operação fornecedora QA|Fictional supplier
Operação QA sintética|Fictional operation
Receita operacional QA|Fictional operating income
Contraparte QA sintética|Fictional counterparty
Registrar recebimento|Record receipt
Saldo restante|Remaining balance
Valor recebido|Amount received
Detalhes|Details
Recebimento parcial|Partial receipt
Estoque|Inventory
Controle materiais, níveis mínimos e movimentações internas da clínica.|Track supplies, minimum quantities, and internal stock movements.
Categorias, itens, fornecedores e movimentações usam leitura Supabase real quando disponível. Proprietários e administradores autorizados podem gerenciar fornecedores e recebimentos manuais, registrar custos e estornar recebimentos com histórico preservado. Financeiro, pagamentos, nota fiscal e integrações externas permanecem fora deste fluxo.|Review synthetic inventory, suppliers, and a partial purchase receipt using the original inventory screens.
Novo item|New item
Itens em Estoque|Stock items
Fornecedores|Suppliers
Compras|Purchases
Alertas e Regras|Alerts and rules
Categorias|Categories
Histórico (Logs)|Movement history
Saúde do Estoque|Stock health
SAUDÁVEL|HEALTHY
ESTOQUE BAIXO|LOW STOCK
CRÍTICO|CRITICAL
INATIVO|INACTIVE
Alertas e Reposições|Alerts and replenishment
Itens que precisam de atenção imediata.|Items requiring attention.
Ver todos|See all
Materiais Clínicos|Clinical supplies
Descartáveis|Disposables
Esterilização|Sterilization
Escritório|Office
Resina Composta A2|A2 composite resin
Envelope para Esterilização 9x23|Sterilization pouch 9 × 23
Indicador Biológico|Biological indicator
Luva demo clínica Látex P|Small latex gloves
Sugador Odontológico|Dental suction tips
Pedidos de compra|Purchase orders
Quantidades planejadas e entregas parciais, sem envio ao fornecedor.|Review ordered quantities and partial deliveries in the local demo.
Atualizar pedidos|Refresh orders
Buscar pedido ou fornecedor|Search order or supplier
Buscar pedidos|Search orders
Situação do pedido|Order status
Todas as situações|All statuses
Pedido|Order
Fornecedor|Supplier
Situação|Status
Ver pedido|View order
Pedido de compra|Purchase order
Atualizar pedido|Refresh order
Parcialmente recebido|Partially received
Receber entrega|Receive delivery
Entregas registradas|Recorded deliveries
Nenhuma entrega registrada.|No deliveries recorded.
Criado em|Created on
Restante:|Remaining:
Em aberto:|Outstanding:
Recebido:|Received:
Pedido:|Ordered:
Recebido bruto:|Gross received:
Estornado:|Reversed:
Cancelado:|Canceled:
Caixas|Boxes
Voltar|Back
Fechar|Close
Salvar|Save
Cancelar|Cancel
Atualizar|Refresh
Confirmar|Confirm
Buscar|Search
Selecione|Select
Sem dados|No data
Carregando...|Loading…
Ativo|Active
Ativa|Active
Crítico|Critical
Estoque baixo|Low stock
Agenda|Schedule
Sistema Operacional|Operational workspace
Canal:|Channel:
Fila sugerida:|Suggested queue:
Lista de espera|Waitlist
Disponibilidade|Availability
Sala|Room
Retorno|Follow-up
Iniciar|Start
ocupado|occupied
Alertas|Alerts
Abrir|Open
Leitura local|Local data
Recepção|Front desk
Minhas conversas|My conversations
Todas|All
Buscar paciente|Search patients
Acompanhamento|Follow-up
Recebido|Received
Cancelado|Canceled
Em aberto|Open
Nenhum pedido encontrado.|No orders found.
Registro manual de materiais e custos, sem efeito no Financeiro.|Local material receipt and cost history.
Compras recebidas|Received purchases
Atualizar compras|Refresh purchases
Receba entregas até o restante ou cancele a pendência. O histórico é preservado.|Receive the remaining quantity and retain delivery history.
Informe somente os materiais já recebidos, até o restante. Uma confirmação atualiza o estoque e o pedido.|Enter the quantity received, up to the outstanding amount. The order and stock are updated together.
Total desta entrega:|Delivery total:
preencha a entrega|enter a delivery
Custo de|Unit cost for
Receber|Receive
Deixe em branco ou zero os itens que não chegaram. Custo por unidade cadastrada; sem conversão. Até R$ 9.999.999,99 por recebimento.|Enter a quantity and a unit cost for received materials.
Retornos|Follow-ups
Retornos vencidos ou programados para hoje.|Follow-ups due today or overdue.
Retornos Pendentes|Pending follow-ups
Janela fechada|Reply window closed
Entradas recebidas ainda sem leitura operacional.|Incoming messages waiting to be read.
Não lida|Unread
Texto|Text
Documento|Document
Histórico sanitizado:|Sanitized history:
marco(s).|event(s).
Reverter check-in|Undo check-in
Check-in registrado|Check-in recorded
Chegou|Arrived
Sem consulta ativa|No active appointment
Sem horário|No time
Horário pendente|Time pending
Atenção operacional|Operational attention
confirmação operacional pendente.|confirmation pending.
Preparação do dia|Day preparation
Confirmações pendentes|Pending confirmations
Próximas consultas|Upcoming appointments
A tela organiza o dia atual sem gravar fila própria.|The queue reflects today's schedule.
12h às 17h59|12:00–17:59
Consultório 1|Room 1
Consultório 2|Room 2
Evolução clínica|Clinical progress note
Adicionar adendo|Add addendum
Prioritário|Priority
Rotina|Routine
Nenhum plano de tratamento ativo|No active treatment plan
Clínicas Disponíveis|Available clinics
Cada clínica possui dados, usuários e configurações isoladas por ambiente da clínica.|Each fictional clinic has its own records and demo role.
Ambiente trocado apenas nesta demonstração.|Clinic switched locally.
Financeiro da Clínica|Clinic finance
lançamentos e baixas manuais controlados|manual entries and receipts
Registre um valor recebido desta conta. O saldo restante será atualizado sem cobrança ou integração bancária.|Record an amount received. The demo updates the remaining balance.
Lançamento|Entry
Recebível sintético vencido para validação.|Overdue fictional receivable.
Recebível sintético futuro para validação.|Upcoming fictional receivable.
Valor integral|Original amount
Vencimento|Due date
Data da baixa|Receipt date
O registro reduz o saldo. Informar todo o saldo restante quita a conta. O valor total do lançamento permanece preservado.|This receipt reduces the outstanding balance and preserves the original amount.
Esta ação apenas registra a baixa no SorriSync. Nenhuma movimentação bancária será executada.|Only a simulated receipt is recorded.
Todos os vencimentos|All due dates
Limpar|Clear
Contraparte|Counterparty
Categoria|Category
Competência|Accounting period
Vencido|Overdue
Agendado|Scheduled
Ver|View
Editar|Edit
Receita prevista QA|Fictional projected income
Despesa operacional QA|Fictional operating expense
Fornecedor QA sintético|Fictional supplies vendor
Caixa|Box
Registrando...|Recording…
Entrada|Stock receipt
Recebimento manual|Manual receipt
Arquivos|Files
Resumo|Summary
Histórico|History
Detalhe|Detail
Paciente vinculado|Linked patient
Iniciar Atendimento|Start appointment
Nova consulta|New appointment
Disponibilidade dos profissionais|Provider availability
Avaliação marcada|Consultation booked
Ações rápidas|Quick actions
Buscar por nome, telefone, origem ou procedimento...|Search by name, phone, source, or procedure…
Áreas do prontuário|Clinical record sections
Ambiente clínico|Clinic workspace
Vínculo CRM|Patient link
Gerar sugestão|Generate draft
Paciente indisponível neste tenant ou para este perfil.|This patient is unavailable in the current clinic or role.
Conversas que exigem planejamento|Conversations that need a follow-up
Nenhum contato selecionado|No contact selected
Nova consulta agendada|New appointment scheduled
Novo Lead|New lead
Exportar|Export
Recebido agora|Received now
Entrada Manual|Manual entry
Bloqueios|Blocks
Status operacional|Operational status
Salvar alterações|Save changes
Data da consulta|Appointment date
Fechar detalhes|Close details
24h|24 hours
Atendimento|Conversation
CRM/Agenda|CRM / Schedule
Resposta manual|Manual reply
Mensagem de texto|Text message
Digite uma mensagem para o paciente.|Type a message to the patient.
caracteres|characters
linha(s).|line(s).
Escreva uma mensagem para habilitar o envio.|Enter a message to enable the sending control.
Busca e filtros|Search and filters
Sem envio real|Simulated only
Consulta|Appointment
Editar paciente|Edit patient
Atendimento Omnichannel|Omnichannel inbox
Estoque e Insumos|Inventory and supplies
Tamanho seguro:|Validated size:
Visualizar imagem|Preview image
/1000 caracteres|/1000 characters
Reagendar|Reschedule
Profissional|Provider
Observações|Notes
Cancelar Consulta|Cancel appointment
Confirmado|Confirmed
Arrived às|Arrived at
Chegada registrada com sucesso.|Arrival recorded.
consultas com status Agendada ou Pendente.|appointments are scheduled or pending.
Status da Agenda|Schedule status
Fluxo do dia|Daily schedule
Bloqueios, salas e profissionais|Blocks, rooms, and providers
Bloqueios do dia|Daily blocks
Mapa de profissionais|Provider schedule
Antes de 12h|Before 12:00
A partir de 18h|From 18:00
Noite|Evening
Ativas|Active
Buscar por categoria, contraparte ou descrição|Search by category, counterparty, or description
Parcial|Partial
Record manual de materiais e custos, sem efeito no Financeiro.|Local material receipt and cost history.
Registro|Record
Plano clínico estruturado|Structured treatment plan
Procedimentos clínicos manuais ligados a Serviços, orçamentos aceitos, Agenda e evoluções append-only. Nenhuma sessão conclui o item ou gera cobrança automaticamente.|Link procedures to services, accepted quotes, appointments, and clinical notes. Completion and billing are recorded separately.
Adicionar procedimento|Add procedure
Plano atual|Current plan
Planejado|Planned
Registrar sessão|Record session
Marcar como concluído|Mark complete
Cancelar item|Cancel item
Referência:|Reference:
Não se aplica|Not applicable
Registrado por:|Recorded by:
Dentista demo|Demo dentist
Data:|Date:`.split('\n').map(line => line.split('|')));
const parts = [...terms].filter(([key]) => key.endsWith(':') || key.includes(' ')).sort((a,b)=>b[0].length-a[0].length);
function copyFor(key) {
  return terms.get(key) ?? (Object.hasOwn(additionalCopy, key) ? additionalCopy[key] : undefined);
}
export function english(value) {
  if (typeof value !== 'string') return value;
  const plain = value.trim();

  const key = plain.replace(/\s+/g, ' ');
  const exact = copyFor(key);
  if (exact) return value.replace(plain, () => exact);
  for (const separator of [' · ', ' • ', ' | ']) {
    if (value.includes(separator)) return value.split(separator).map(english).join(separator);
  }
  const suffix = plain.match(/^([\d/]+ )(.+)$/);
  if (suffix && copyFor(suffix[2])) return value.replace(plain, () => suffix[1] + copyFor(suffix[2]));
  const withLegacyPhrases = parts.reduce((text, [source, target]) =>
    text.includes(source) ? text.replaceAll(source, target) : text, value);
  const mixed = withLegacyPhrases.trim();
  const completed = copyFor(mixed.replace(/\s+/g, ' '));
  return completed ? withLegacyPhrases.replace(mixed, () => completed) : withLegacyPhrases;
}
