// RN equivalent of gymtrack-web's ExerciseLibraryService constructor subscribe(): the exercise
// catalog is a public collection (no per-user filter), unlike useWorkouts.
import { useEffect, useMemo, useState } from "react";
import type { ExerciseTemplate } from "../core/models/workout.model";
import { subscribe } from "../core/services/firestore.service";
import {
  EXERCISES_COLLECTION,
  getEquipmentTypes,
  getMuscleGroups,
  sortExercisesByName,
} from "../core/services/exercise-library.service";

export function useExercises() {
  const [exercises, setExercises] = useState<ExerciseTemplate[]>([]);

  useEffect(() => {
    return subscribe<ExerciseTemplate>(EXERCISES_COLLECTION, (docs) => {
      setExercises(sortExercisesByName(docs));
    });
  }, []);

  return useMemo(
    () => ({
      exercises,
      muscleGroups: getMuscleGroups(exercises),
      equipmentTypes: getEquipmentTypes(exercises),
    }),
    [exercises]
  );
}
