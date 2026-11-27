import { assertReconciliationMutationContext } from './clinicFinanceReconciliationContract.js';
export const createClinicReconciliationRepository = ({ fetchReal, mutateReal, fetchMock, mutateMock }) => ({
  loadClinicReconciliationDetail: async input => input.isSupabaseMode ? fetchReal(input) : fetchMock(input),
  runClinicReconciliationMutation: async input => {
    assertReconciliationMutationContext(input);
    return input.isSupabaseMode ? mutateReal(input) : mutateMock(input);
  },
});
