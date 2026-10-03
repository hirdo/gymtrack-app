// RN equivalent of gymtrack-web's WorkoutService effect()+subscribe pair: subscribes to the
// current user's workouts in Firestore and derives the same stats the web dashboard shows.
import { useEffect, useMemo, useState } from "react";
import type { Workout } from "../core/models/workout.model";
import { subscribe, where } from "../core/services/firestore.service";
import {
  computeRecent,
  computeStreak,
  computeThisWeekCount,
  computeTotalWorkouts,
  computeCompletedWorkouts,
  WORKOUTS_COLLECTION,
} from "../core/services/workout.service";
import { useAuthStore } from "../core/auth/authStore";

export function useWorkouts() {
  const userId = useAuthStore((s) => s.userId);
  const [workouts, setWorkouts] = useState<Workout[]>([]);

  useEffect(() => {
    if (!userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting local cache when the signed-in user changes, not a render-time derivation
      setWorkouts([]);
      return;
    }
    return subscribe<Workout>(
      WORKOUTS_COLLECTION,
      (docs) => {
        const sorted = [...docs].sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
        setWorkouts(sorted);
      },
      where("userId", "==", userId)
    );
  }, [userId]);

  return useMemo(
    () => ({
      workouts,
      recent: computeRecent(workouts),
      streak: computeStreak(workouts),
      thisWeekCount: computeThisWeekCount(workouts),
      totalWorkouts: computeTotalWorkouts(workouts),
      completedWorkouts: computeCompletedWorkouts(workouts),
    }),
    [workouts]
  );
}
