// RN equivalent of gymtrack-web's ExerciseLogService effect()+subscribe pair: subscribes to all
// of the current user's exercise logs (not just the current workout — getExerciseHistory needs
// to search across every workout) and exposes the same derived lookups as plain functions.
import { useEffect, useState } from "react";
import type { ExerciseLog } from "../core/models/workout.model";
import { subscribe, where } from "../core/services/firestore.service";
import { EXERCISE_LOGS_COLLECTION } from "../core/services/exercise-log.service";
import { useAuthStore } from "../core/auth/authStore";

export function useExerciseLogs() {
  const userId = useAuthStore((s) => s.userId);
  const [logs, setLogs] = useState<ExerciseLog[]>([]);

  useEffect(() => {
    if (!userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting local cache when the signed-in user changes, not a render-time derivation
      setLogs([]);
      return;
    }
    return subscribe<ExerciseLog>(EXERCISE_LOGS_COLLECTION, setLogs, where("userId", "==", userId));
  }, [userId]);

  return { logs };
}
