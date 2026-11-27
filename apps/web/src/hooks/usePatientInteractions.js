import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import {
  createPatientInteractionByTenant,
  fetchPatientInteractionTimeline,
  getPatientInteractionTimeline,
} from '@/repositories/index.js';

export const usePatientInteractions = (patient) => {
  const { currentTenantId } = useAuth();
  const [state, setState] = useState(() => ({
    patientId: patient?.id,
    timeline: getPatientInteractionTimeline(patient),
  }));
  const [loading, setLoading] = useState(false);
  const fallbackTimeline = getPatientInteractionTimeline(patient);
  const timeline = state.patientId === patient?.id ? state.timeline : fallbackTimeline;

  useEffect(() => {
    let active = true;

    setState({
      patientId: patient?.id,
      timeline: getPatientInteractionTimeline(patient),
    });

    if (!patient) {
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);

    fetchPatientInteractionTimeline(currentTenantId, patient)
      .then((nextTimeline) => {
        if (active && nextTimeline) {
          setState({
            patientId: patient.id,
            timeline: nextTimeline,
          });
        }
      })
      .catch(() => {
        if (active) {
          setState({
            patientId: patient.id,
            timeline: getPatientInteractionTimeline(patient),
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
  }, [currentTenantId, patient]);

  const recordPatientInteraction = useCallback(async (patientId, interaction) => {
    const createdInteraction = await createPatientInteractionByTenant(
      currentTenantId,
      patientId,
      interaction,
    );

    setState((previousState) => {
      if (!patient?.id || patient.id !== patientId || previousState.patientId !== patientId) {
        return previousState;
      }

      const previousTimeline = previousState.timeline || getPatientInteractionTimeline(patient);
      const nextLatestInteractions = [
        createdInteraction,
        ...(previousTimeline.latestInteractions || []).filter((item) => item.id !== createdInteraction.id),
      ].slice(0, 2);
      const nextJourneyInteractions = [
        createdInteraction,
        ...(previousTimeline.journeyInteractions || []).filter((item) => item.id !== createdInteraction.id),
      ];

      return {
        patientId,
        timeline: {
          latestInteractions: nextLatestInteractions,
          journeyInteractions: nextJourneyInteractions,
        },
      };
    });

    return createdInteraction;
  }, [currentTenantId, patient]);

  return {
    ...timeline,
    loading,
    recordPatientInteraction,
  };
};
