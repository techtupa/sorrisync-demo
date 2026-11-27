import {
  INTERESTS,
  ORIGINS,
  RESPONSIBLES,
  STATUSES,
} from './patientsRepository.js';

// Mock source today. Keep this shape stable so the Supabase adapter can replace it without changing the UI.
export const getPatientCrmOptionsByTenant = () => ({
  statuses: Object.values(STATUSES),
  origins: Object.values(ORIGINS),
  interests: Object.values(INTERESTS),
  responsibles: Object.values(RESPONSIBLES),
});

export const getPatientCrmOptionRowsByTenant = (tenantId) => {
  const options = getPatientCrmOptionsByTenant(tenantId);

  return [
    ...options.statuses.map((label, index) => ({ option_type: 'status', label, sort_order: index + 1 })),
    ...options.origins.map((label, index) => ({ option_type: 'origin', label, sort_order: index + 1 })),
    ...options.interests.map((label, index) => ({ option_type: 'interest', label, sort_order: index + 1 })),
    ...options.responsibles.map((label, index) => ({ option_type: 'responsible', label, sort_order: index + 1 })),
  ];
};
