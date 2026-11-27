import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient.js';
import {
  createOmnichannelPilotInviteAdmin as createMockOmnichannelPilotInviteAdmin,
  listOmnichannelPilotInvitesAdmin as listMockOmnichannelPilotInvitesAdmin,
  listOmnichannelPilotDiagnosticSubmissionsAdmin as listMockOmnichannelPilotDiagnosticSubmissionsAdmin,
  revokeOmnichannelPilotInviteAdmin as revokeMockOmnichannelPilotInviteAdmin,
  sendOmnichannelPilotInviteEmailAdmin as sendMockOmnichannelPilotInviteEmailAdmin,
} from '../mock/omnichannelDiagnosticInviteAdminRepository.js';

const hasSupabase = () => Boolean(isSupabaseConfigured && supabase);

const toCamelInvite = (invite = {}, source = 'Supabase') => ({
  id: invite.id || '',
  publicSlug: invite.public_slug || invite.publicSlug || '',
  clinicName: invite.clinic_name || invite.clinicName || '',
  contactName: invite.contact_name || invite.contactName || '',
  contactEmail: invite.contact_email || invite.contactEmail || '',
  contactPhone: invite.contact_phone || invite.contactPhone || '',
  targetTenantId: invite.target_tenant_id || invite.targetTenantId || '',
  targetTenantSlug: invite.target_tenant_slug || invite.targetTenantSlug || '',
  targetTenantName: invite.target_tenant_name || invite.targetTenantName || '',
  status: invite.status || 'active',
  expiresAt: invite.expires_at || invite.expiresAt || null,
  maxSubmissions: Number(invite.max_submissions ?? invite.maxSubmissions ?? 1),
  submissionsCount: Number(invite.submissions_count ?? invite.submissionsCount ?? 0),
  createdAt: invite.created_at || invite.createdAt || null,
  updatedAt: invite.updated_at || invite.updatedAt || null,
  emailDeliveryStatus: invite.email_delivery_status || invite.emailDeliveryStatus || 'not_sent',
  emailDeliveryLastSentAt: invite.email_delivery_last_sent_at || invite.emailDeliveryLastSentAt || null,
  emailDeliveryCount: Number(invite.email_delivery_count ?? invite.emailDeliveryCount ?? 0),
  hasRecoverableLink: Boolean(invite.has_recoverable_link ?? invite.hasRecoverableLink),
  source,
});

const toCamelTenant = (tenant = {}) => ({
  id: tenant.id || '',
  slug: tenant.slug || tenant.id || '',
  name: tenant.name || tenant.slug || 'Clínica',
  plan: tenant.plan || '',
  status: tenant.status || '',
});

const resolvePublicUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;

  const origin = typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : 'https://sorrisync.example.invalid';
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  return `${origin}${path}`;
};

const normalizeListResponse = (data = {}, source = 'Supabase') => ({
  canCreate: Boolean(data.can_create ?? data.canCreate),
  canRevoke: Boolean(data.can_revoke ?? data.canRevoke),
  invites: Array.isArray(data.invites)
    ? data.invites.map((invite) => toCamelInvite(invite, source))
    : [],
  source: data.source || source,
  tenants: Array.isArray(data.tenants) ? data.tenants.map(toCamelTenant) : [],
});

const normalizeMutationResponse = (data = {}, source = 'Supabase') => ({
  canCreate: Boolean(data.can_create ?? data.canCreate),
  canRevoke: Boolean(data.can_revoke ?? data.canRevoke),
  invite: toCamelInvite(data.invite || {}, data.source || source),
  publicUrl: resolvePublicUrl(data.public_url || data.publicUrl),
  publicUrlOnce: Boolean(data.public_url_once ?? data.publicUrlOnce),
  source: data.source || source,
});

const toCamelSubmission = (submission = {}) => ({
  attendantsCount: submission.attendants_count ?? submission.attendantsCount ?? null,
  attendanceResponsibilities: submission.attendance_responsibilities || submission.attendanceResponsibilities || {},
  city: submission.city || '',
  clinicName: submission.clinic_name || submission.clinicName || '',
  contactEmailMasked: submission.contact_email_masked || submission.contactEmailMasked || '',
  contactPhoneMasked: submission.contact_phone_masked || submission.contactPhoneMasked || '',
  currentChannels: submission.current_channels || submission.currentChannels || {},
  currentFlowDescription: submission.current_flow_description || submission.currentFlowDescription || '',
  desiredMetrics: submission.desired_metrics || submission.desiredMetrics || {},
  excludedChannelsDescription: submission.excluded_channels_description || submission.excludedChannelsDescription || '',
  firstChannelsDescription: submission.first_channels_description || submission.firstChannelsDescription || '',
  futureChannels: submission.future_channels || submission.futureChannels || {},
  hasCrc: submission.has_crc ?? submission.hasCrc ?? null,
  importantRulesDescription: submission.important_rules_description || submission.importantRulesDescription || '',
  mainPainDescription: submission.main_pain_description || submission.mainPainDescription || '',
  messageVolume: submission.message_volume || submission.messageVolume || {},
  mvpPriority: submission.mvp_priority || submission.mvpPriority || '',
  operationalPains: submission.operational_pains || submission.operationalPains || {},
  pilotSuccessDescription: submission.pilot_success_description || submission.pilotSuccessDescription || '',
  privacyNotes: submission.privacy_notes || submission.privacyNotes || '',
  professionalsCount: submission.professionals_count ?? submission.professionalsCount ?? null,
  responsibleName: submission.responsible_name || submission.responsibleName || '',
  responsibleRole: submission.responsible_role || submission.responsibleRole || '',
  reviewedAt: submission.reviewed_at || submission.reviewedAt || null,
  source: submission.source || 'public_token',
  state: submission.state || '',
  status: submission.status || 'submitted',
  submittedAt: submission.submitted_at || submission.submittedAt || null,
  submissionNumber: Number(submission.submission_number ?? submission.submissionNumber ?? 1),
  successCriteria: submission.success_criteria || submission.successCriteria || '',
  teamStructure: submission.team_structure || submission.teamStructure || {},
  whatsappNumbersCount: submission.whatsapp_numbers_count ?? submission.whatsappNumbersCount ?? null,
  whatsappUsage: submission.whatsapp_usage || submission.whatsappUsage || {},
});

const normalizeSubmissionsResponse = (data = {}, source = 'Supabase') => ({
  canView: Boolean(data.can_view ?? data.canView),
  invite: data.invite ? toCamelInvite(data.invite, data.source || source) : null,
  source: data.source || source,
  submissions: Array.isArray(data.submissions)
    ? data.submissions.map(toCamelSubmission)
    : [],
});

export const listOmnichannelPilotInvitesAdmin = async () => {
  if (!hasSupabase()) {
    return listMockOmnichannelPilotInvitesAdmin();
  }

  const { data, error } = await supabase.rpc('list_omnichannel_pilot_invites_admin');
  if (error) {
    throw error;
  }

  return normalizeListResponse(data, 'Supabase');
};

export const listOmnichannelPilotDiagnosticSubmissionsAdmin = async (inviteId) => {
  if (!hasSupabase()) {
    return listMockOmnichannelPilotDiagnosticSubmissionsAdmin(inviteId);
  }

  const { data, error } = await supabase.rpc('list_omnichannel_pilot_diagnostic_submissions_admin', {
    invite_id: inviteId,
  });
  if (error) {
    throw error;
  }

  return normalizeSubmissionsResponse(data, 'Supabase');
};

export const createOmnichannelPilotInviteAdmin = async (payload = {}) => {
  if (!hasSupabase()) {
    const fallback = await createMockOmnichannelPilotInviteAdmin(payload);
    return {
      ...fallback,
      publicUrl: resolvePublicUrl(fallback.publicUrl),
    };
  }

  const { data, error } = await supabase.rpc('create_omnichannel_pilot_invite_admin', {
    payload,
  });
  if (error) {
    throw error;
  }

  return normalizeMutationResponse(data, 'Supabase');
};

export const revokeOmnichannelPilotInviteAdmin = async (inviteId) => {
  if (!hasSupabase()) {
    return revokeMockOmnichannelPilotInviteAdmin(inviteId);
  }

  const { data, error } = await supabase.rpc('revoke_omnichannel_pilot_invite_admin', {
    invite_id: inviteId,
  });
  if (error) {
    throw error;
  }

  return normalizeMutationResponse(data, 'Supabase');
};

export const sendOmnichannelPilotInviteEmailAdmin = async ({ inviteId, publicUrl } = {}) => {
  if (!hasSupabase()) {
    return sendMockOmnichannelPilotInviteEmailAdmin({ inviteId, publicUrl });
  }

  const { data, error } = await supabase.functions.invoke('diagnostic-invite-email', {
    body: {
      inviteId,
      publicUrl,
    },
  });
  if (error) {
    throw error;
  }

  return {
    emailDeliveryStatus: data?.email_delivery_status || data?.emailDeliveryStatus || 'sent',
    sent: Boolean(data?.sent),
    source: 'Supabase',
  };
};
