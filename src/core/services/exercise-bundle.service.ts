// Ported from gymtrack-web's ExerciseBundleService (src/app/core/services/exercise-bundle.service.ts).
// Angular signals + inject(AuthService) are replaced with plain functions that take `bundles`
// as an argument — the live subscription lives in src/hooks/useExerciseBundles.ts. Admin-role
// enforcement for the writes below happens at the UI layer (screens gated by isAdmin).
import type { ExerciseBundle } from "../models/workout.model";
import { addDocument, deleteDocument, updateDocument } from "./firestore.service";

export const EXERCISE_BUNDLES_COLLECTION = "exerciseBundles";

export async function addBundle(
  bundle: Omit<ExerciseBundle, "id" | "createdAt" | "updatedAt">,
  userId: string
): Promise<ExerciseBundle> {
  const now = new Date().toISOString();
  const data = { ...bundle, createdBy: userId, createdAt: now, updatedAt: now };
  const id = await addDocument(EXERCISE_BUNDLES_COLLECTION, data);
  return { ...data, id };
}

export async function updateBundle(id: string, changes: Partial<ExerciseBundle>): Promise<void> {
  await updateDocument(EXERCISE_BUNDLES_COLLECTION, id, { ...changes, updatedAt: new Date().toISOString() });
}

export async function deleteBundle(id: string): Promise<void> {
  await deleteDocument(EXERCISE_BUNDLES_COLLECTION, id);
}

export function sortBundlesByName(bundles: ExerciseBundle[]): ExerciseBundle[] {
  return [...bundles].sort((a, b) => a.name.localeCompare(b.name));
}

export function searchBundles(bundles: ExerciseBundle[], query: string): ExerciseBundle[] {
  const q = query.toLowerCase().trim();
  if (!q) return bundles;
  return bundles.filter((b) => b.name.toLowerCase().includes(q));
}
