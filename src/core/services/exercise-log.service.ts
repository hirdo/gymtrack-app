// Ported from gymtrack-web's ExerciseLogService (src/app/core/services/exercise-log.service.ts).
// Angular signals/computed + inject(AuthService) are replaced with plain functions that take
// `logs` as an argument — the live subscription lives in src/hooks/useExerciseLogs.ts.
import type { ExerciseLog, ExerciseTemplate, SetRecord, Workout } from "../models/workout.model";
import { toLocalDateString } from "../utils/date.util";
import { addDocument, deleteDocument, updateDocument } from "./firestore.service";

export const EXERCISE_LOGS_COLLECTION = "exercise_logs";

export function logsForWorkout(logs: ExerciseLog[], workoutId: string): ExerciseLog[] {
  return logs
    .filter((l) => l.workoutId === workoutId)
    .sort((a, b) => a.exerciseIndex - b.exerciseIndex);
}

export function completedLogs(logs: ExerciseLog[]): ExerciseLog[] {
  return logs.filter((l) => l.completedAt && l.sets.length > 0);
}

export function getExerciseHistory(
  logs: ExerciseLog[],
  exerciseName: string,
  templateId?: string
): { date: string; sets: SetRecord[] }[] {
  return completedLogs(logs)
    .filter((l) => (templateId ? l.exerciseTemplateId === templateId : l.exerciseName === exerciseName))
    .map((l) => ({ date: l.date, sets: l.sets }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function startWorkoutLogs(workout: Workout, userId: string): Promise<void> {
  const now = new Date().toISOString();
  const date = workout.scheduledDate || toLocalDateString(new Date());

  for (let i = 0; i < workout.exercises.length; i++) {
    const ex = workout.exercises[i];
    const data = {
      userId,
      workoutId: workout.id,
      exerciseIndex: i,
      exerciseTemplateId: ex.templateId,
      exerciseName: ex.name,
      trackingType: ex.trackingType || "reps",
      date,
      targetSets: ex.sets,
      targetReps: ex.reps,
      targetWeight: ex.weight,
      targetDuration: ex.duration,
      restTime: ex.restTime,
      sets: [],
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    await addDocument(EXERCISE_LOGS_COLLECTION, data);
  }
}

export async function addAlternateLog(
  logs: ExerciseLog[],
  workout: Workout,
  exerciseIndex: number,
  alternate: ExerciseTemplate,
  userId: string
): Promise<string> {
  const existing = logs.find(
    (l) => l.workoutId === workout.id && l.exerciseIndex === exerciseIndex && l.exerciseTemplateId === alternate.id
  );
  if (existing) return existing.id;

  const primary = logsForWorkout(logs, workout.id).find((l) => l.exerciseIndex === exerciseIndex);
  const now = new Date().toISOString();
  const trackingType = alternate.trackingType || "reps";
  const data = {
    userId,
    workoutId: workout.id,
    exerciseIndex,
    exerciseTemplateId: alternate.id,
    exerciseName: alternate.name,
    trackingType,
    date: primary?.date || toLocalDateString(new Date()),
    targetSets: primary?.targetSets ?? 3,
    targetReps: trackingType !== "duration" ? primary?.targetReps ?? alternate.recommendedReps : undefined,
    targetWeight: trackingType === "reps" ? primary?.targetWeight ?? alternate.recommendedWeight : undefined,
    targetDuration: trackingType === "duration" ? primary?.targetDuration ?? alternate.recommendedDuration : undefined,
    restTime: primary?.restTime,
    sets: [],
    startedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  return addDocument(EXERCISE_LOGS_COLLECTION, data);
}

export async function logSet(log: ExerciseLog, setRecord: SetRecord): Promise<void> {
  await updateDocument(EXERCISE_LOGS_COLLECTION, log.id, {
    sets: [...log.sets, setRecord],
    updatedAt: new Date().toISOString(),
  });
}

export async function updateSet(log: ExerciseLog, setNumber: number, changes: Partial<SetRecord>): Promise<void> {
  const sets = log.sets.map((s) => (s.setNumber === setNumber ? { ...s, ...changes } : s));
  await updateDocument(EXERCISE_LOGS_COLLECTION, log.id, { sets, updatedAt: new Date().toISOString() });
}

export async function deleteSet(log: ExerciseLog, setNumber: number): Promise<void> {
  const sets = log.sets
    .filter((s) => s.setNumber !== setNumber)
    .map((s, i) => ({ ...s, setNumber: i + 1 }));
  await updateDocument(EXERCISE_LOGS_COLLECTION, log.id, { sets, updatedAt: new Date().toISOString() });
}

export async function completeWorkoutLogs(logs: ExerciseLog[], workoutId: string): Promise<void> {
  const completedAt = new Date().toISOString();
  for (const log of logsForWorkout(logs, workoutId)) {
    await updateDocument(EXERCISE_LOGS_COLLECTION, log.id, { completedAt, updatedAt: completedAt });
  }
}

export async function deleteLogsForWorkout(logs: ExerciseLog[], workoutId: string): Promise<void> {
  for (const log of logs.filter((l) => l.workoutId === workoutId)) {
    await deleteDocument(EXERCISE_LOGS_COLLECTION, log.id);
  }
}
