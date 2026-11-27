import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import {
  createPatientByTenant,
  fetchPatientsByTenant,
  getPatientsByTenant,
  updatePatientByTenant,
} from '@/repositories/index.js';

export const usePatients = ({ enabled = true } = {}) => {
  const { currentTenantId, hasPermission } = useAuth();
  const [state, setState] = useState(() => ({
    tenantId: currentTenantId,
    patients: enabled ? getPatientsByTenant(currentTenantId) : [],
  }));
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const fallbackPatients = getPatientsByTenant(currentTenantId);
  const patients = enabled
    ? (state.tenantId === currentTenantId ? state.patients : fallbackPatients)
    : [];

  useEffect(() => {
    let active = true;

    if (!enabled) {
      setState({
        tenantId: currentTenantId,
        patients: [],
      });
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setState({
      tenantId: currentTenantId,
      patients: getPatientsByTenant(currentTenantId),
    });
    setLoading(true);

    fetchPatientsByTenant(currentTenantId)
      .then((nextPatients) => {
        if (active && nextPatients) {
          setState({
            tenantId: currentTenantId,
            patients: nextPatients,
          });
        }
      })
      .catch(() => {
        if (active) {
          setState({
            tenantId: currentTenantId,
            patients: getPatientsByTenant(currentTenantId),
          });
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [currentTenantId, enabled]);

  const createPatient = async (patient) => {
    if (!hasPermission('patients.manage')) throw new Error('This profile can only view patient records.');
    setCreating(true);

    try {
      const createdPatient = await createPatientByTenant(currentTenantId, patient);

      setState((previousState) => {
        const basePatients = previousState.tenantId === currentTenantId
          ? previousState.patients
          : getPatientsByTenant(currentTenantId);

        return {
          tenantId: currentTenantId,
          patients: [
            createdPatient,
            ...basePatients.filter((item) => item.id !== createdPatient.id),
          ],
        };
      });

      return createdPatient;
    } finally {
      setCreating(false);
    }
  };

  const updatePatient = async (patientId, patientPatch) => {
    if (!hasPermission('patients.manage')) throw new Error('This profile can only view patient records.');
    setUpdating(true);

    try {
      const updatedPatient = await updatePatientByTenant(currentTenantId, patientId, patientPatch);

      setState((previousState) => {
        const basePatients = previousState.tenantId === currentTenantId
          ? previousState.patients
          : getPatientsByTenant(currentTenantId);

        return {
          tenantId: currentTenantId,
          patients: basePatients.map((patient) => (
            patient.id === updatedPatient.id ? updatedPatient : patient
          )),
        };
      });

      return updatedPatient;
    } finally {
      setUpdating(false);
    }
  };

  const syncPatient = (patient) => {
    if (!patient?.id) {
      return null;
    }

    setState((previousState) => {
      const basePatients = previousState.tenantId === currentTenantId
        ? previousState.patients
        : getPatientsByTenant(currentTenantId);

      return {
        tenantId: currentTenantId,
        patients: [
          patient,
          ...basePatients.filter((item) => item.id !== patient.id),
        ],
      };
    });

    return patient;
  };

  return {
    patients,
    loading,
    creating,
    updating,
    createPatient,
    updatePatient,
    syncPatient,
  };
};
