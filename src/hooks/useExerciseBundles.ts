// RN equivalent of gymtrack-web's ExerciseBundleService constructor subscribe(): bundles are a
// public collection (no per-user filter).
import { useEffect, useState } from "react";
import type { ExerciseBundle } from "../core/models/workout.model";
import { subscribe } from "../core/services/firestore.service";
import { EXERCISE_BUNDLES_COLLECTION, sortBundlesByName } from "../core/services/exercise-bundle.service";

export function useExerciseBundles() {
  const [bundles, setBundles] = useState<ExerciseBundle[]>([]);

  useEffect(() => {
    return subscribe<ExerciseBundle>(EXERCISE_BUNDLES_COLLECTION, (docs) => {
      setBundles(sortBundlesByName(docs));
    });
  }, []);

  return { bundles };
}
