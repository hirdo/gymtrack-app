// Ported from gymtrack-web's ExerciseLibraryService (src/app/core/services/exercise-library.service.ts).
// Angular signals/computed + inject(AuthService) are replaced with plain functions that take
// `exercises` as an argument — the live subscription lives in src/hooks/useExercises.ts.
//
// Not ported: runTaxonomyMigration (one-off legacy-taxonomy migration, not relevant to a fresh
// mobile client). Admin-role enforcement for the write functions below happens at the UI layer
// (screens are gated by isAdmin, matching how admin-only routes are gated on web) rather than
// inside these functions, since there's no Angular DI "inject(AuthService)" equivalent here.
import type { Equipment, ExerciseTemplate, MuscleGroup } from "../models/workout.model";
import { addDocument, deleteDocument, updateDocument } from "./firestore.service";

export const EXERCISES_COLLECTION = "exercises";

export async function addExercise(
  exercise: Omit<ExerciseTemplate, "id">,
  userId: string
): Promise<ExerciseTemplate> {
  const data = { ...exercise, isCustom: true, createdBy: userId };
  const id = await addDocument(EXERCISES_COLLECTION, data);
  return { ...data, id };
}

export async function updateExercise(id: string, changes: Partial<ExerciseTemplate>): Promise<void> {
  await updateDocument(EXERCISES_COLLECTION, id, changes);
}

export async function deleteExercise(id: string): Promise<void> {
  await deleteDocument(EXERCISES_COLLECTION, id);
}

export function sortExercisesByName(exercises: ExerciseTemplate[]): ExerciseTemplate[] {
  return [...exercises].sort((a, b) => a.name.localeCompare(b.name));
}

export function getMuscleGroups(exercises: ExerciseTemplate[]): MuscleGroup[] {
  const groups = new Set<MuscleGroup>();
  exercises.forEach((e) => (e.primaryMuscles ?? []).forEach((m) => groups.add(m)));
  return Array.from(groups).sort();
}

export function getEquipmentTypes(exercises: ExerciseTemplate[]): Equipment[] {
  const types = new Set<Equipment>();
  exercises.forEach((e) => types.add(e.equipment));
  return Array.from(types).sort();
}

export function getExerciseById(exercises: ExerciseTemplate[], id: string): ExerciseTemplate | undefined {
  return exercises.find((e) => e.id === id);
}

export function searchExercises(exercises: ExerciseTemplate[], query: string): ExerciseTemplate[] {
  const q = query.toLowerCase().trim();
  if (!q) return exercises;
  return exercises.filter((e) => e.name.toLowerCase().includes(q));
}

export function getAlternatives(exercises: ExerciseTemplate[], exerciseId: string): ExerciseTemplate[] {
  const exercise = getExerciseById(exercises, exerciseId);
  if (!exercise) return [];
  const exerciseMuscles = exercise.primaryMuscles ?? [];
  return exercises
    .filter((e) => e.id !== exerciseId && (e.primaryMuscles ?? []).some((m) => exerciseMuscles.includes(m)))
    .sort((a, b) => {
      const scoreA = (a.primaryMuscles ?? []).filter((m) => exerciseMuscles.includes(m)).length;
      const scoreB = (b.primaryMuscles ?? []).filter((m) => exerciseMuscles.includes(m)).length;
      return scoreB - scoreA || a.name.localeCompare(b.name);
    });
}

export const ALL_MUSCLE_GROUPS: MuscleGroup[] = [
  "chest", "back", "shoulders", "biceps", "triceps",
  "forearms", "core", "legs", "glutes", "stretch",
];

export const ALL_EQUIPMENT: Equipment[] = [
  "barbell", "dumbbell", "machine", "cable", "bodyweight", "other",
];
