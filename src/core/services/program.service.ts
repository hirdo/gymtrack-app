// Ported from gymtrack-web's ProgramService (src/app/core/services/program.service.ts).
// Angular signals/computed + inject() are replaced with plain functions, mirroring the pattern
// already used for workout.service.ts / exercise-log.service.ts. The live subscription lives in
// src/hooks/usePrograms.ts.
import type { Exercise, ExerciseLog, ExerciseTemplate, TrainingProgram, Workout } from "../models/workout.model";
import { addDocument, deleteDocument, updateDocument } from "./firestore.service";
import { addWorkout, deleteWorkout } from "./workout.service";
import { deleteLogsForWorkout } from "./exercise-log.service";
import { getExerciseById } from "./exercise-library.service";
import { uid } from "../utils/id.util";

export const PROGRAMS_COLLECTION = "programs";

export function sortProgramsByUpdated(programs: TrainingProgram[]): TrainingProgram[] {
  return [...programs].sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}

export function getVisiblePrograms(programs: TrainingProgram[], isAdmin: boolean): TrainingProgram[] {
  return isAdmin ? programs : programs.filter((p) => p.isActive);
}

// The workout that defines the user's currently active program run: any not-yet-completed
// generated workout. Resolves on its own once every day of the program has been completed.
export function getUserActiveWorkout(workouts: Workout[]): Workout | undefined {
  return workouts.find((w) => w.programId && !w.completedDate);
}

export async function createProgram(
  program: Omit<TrainingProgram, "id" | "userId" | "createdAt" | "updatedAt">,
  userId: string
): Promise<TrainingProgram> {
  const now = new Date().toISOString();
  const data = { ...program, userId, createdAt: now, updatedAt: now };
  const id = await addDocument(PROGRAMS_COLLECTION, data);
  return { ...data, id } as TrainingProgram;
}

export async function updateProgram(id: string, changes: Partial<TrainingProgram>): Promise<void> {
  await updateDocument(PROGRAMS_COLLECTION, id, { ...changes, updatedAt: new Date().toISOString() });
}

export async function deleteProgram(id: string): Promise<void> {
  await deleteDocument(PROGRAMS_COLLECTION, id);
}

export async function setProgramActive(id: string, active: boolean): Promise<void> {
  await updateDocument(PROGRAMS_COLLECTION, id, { isActive: active, updatedAt: new Date().toISOString() });
}

/**
 * Chooses a program to follow: generates one Workout per program day (no scheduledDate — the
 * user assigns that later from the workout itself). If the user already has a different active
 * program (one with incomplete generated workouts), that program's not-yet-completed workouts
 * are deleted first, replacing it with this one.
 */
export async function chooseProgram(
  program: TrainingProgram,
  workouts: Workout[],
  logs: ExerciseLog[],
  exercises: ExerciseTemplate[],
  userId: string
): Promise<void> {
  const activeWorkout = getUserActiveWorkout(workouts);
  const currentActiveRunId = activeWorkout?.programRunId;
  if (currentActiveRunId) {
    const staleWorkouts = workouts.filter((w) => w.programRunId === currentActiveRunId && !w.completedDate);
    for (const w of staleWorkouts) {
      await deleteLogsForWorkout(logs, w.id);
      await deleteWorkout(w.id);
    }
  }

  const programRunId = uid();

  for (const day of program.days) {
    const dayExercises: Exercise[] = day.exercises.map((e) => ({
      id: uid(),
      name: e.exerciseName,
      trackingType: e.trackingType,
      sets: e.targetSets,
      reps: e.targetReps,
      weight: e.targetWeight,
      duration: e.targetDuration,
      durationUnit: e.targetDurationUnit,
      restTime: e.restTime,
      restTimeUnit: e.restTimeUnit,
      imageUrl: getExerciseById(exercises, e.exerciseId)?.imageUrl,
      templateId: e.exerciseId,
      alternativeExerciseIds: e.alternativeExerciseIds,
    }));

    await addWorkout(userId, {
      name: `${program.name} - Day ${day.dayNumber + 1}: ${day.name}`,
      category: "strength",
      exercises: dayExercises,
      programId: program.id,
      programRunId,
    });
  }
}
