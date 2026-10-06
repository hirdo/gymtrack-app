// Ported from gymtrack-web's ExerciseLibraryService (src/app/core/services/exercise-library.service.ts).
// Angular signals/computed + inject(AuthService) are replaced with plain functions that take
// `exercises` as an argument — the live subscription lives in src/hooks/useExercises.ts.
//
// Not ported (out of scope for this phase, deferred to the Admin phase): addExercise,
// updateExercise, deleteExercise, runTaxonomyMigration (all admin-only writes).
import type { Equipment, ExerciseTemplate, MuscleGroup } from "../models/workout.model";

export const EXERCISES_COLLECTION = "exercises";

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
