// Ported from gymtrack-web's ExerciseBundleService (src/app/core/services/exercise-bundle.service.ts).
// Angular signals + inject(AuthService) are replaced with plain functions that take `bundles`
// as an argument — the live subscription lives in src/hooks/useExerciseBundles.ts.
//
// Not ported (out of scope for this phase, deferred to the Admin phase): addBundle,
// updateBundle, deleteBundle (all admin-only writes).
import type { ExerciseBundle } from "../models/workout.model";

export const EXERCISE_BUNDLES_COLLECTION = "exerciseBundles";

export function sortBundlesByName(bundles: ExerciseBundle[]): ExerciseBundle[] {
  return [...bundles].sort((a, b) => a.name.localeCompare(b.name));
}

export function searchBundles(bundles: ExerciseBundle[], query: string): ExerciseBundle[] {
  const q = query.toLowerCase().trim();
  if (!q) return bundles;
  return bundles.filter((b) => b.name.toLowerCase().includes(q));
}
