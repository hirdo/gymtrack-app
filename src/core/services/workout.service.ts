// Ported from gymtrack-web's WorkoutService (src/app/core/services/workout.service.ts).
// Angular signals/computed + inject(AuthService) are replaced with plain functions that
// take `workouts`/`userId` as arguments — the live subscription itself lives in
// src/hooks/useWorkouts.ts (the RN equivalent of the Angular effect()+subscribe pair).
//
// Not ported (out of MVP scope): getAllWorkoutsForAdmin, runSessionsCleanupMigration.
import type { Workout } from "../models/workout.model";
import { toLocalDateString } from "../utils/date.util";
import { addDocument, updateDocument, deleteDocument } from "./firestore.service";

const COLLECTION = "workouts";

export function computeRecent(workouts: Workout[], count = 5): Workout[] {
  return [...workouts]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, count);
}

export function computeTotalWorkouts(workouts: Workout[]): number {
  return workouts.length;
}

export function computeCompletedWorkouts(workouts: Workout[]): number {
  return workouts.filter((w) => w.completedDate).length;
}

export function computeThisWeekCount(workouts: Workout[]): number {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const mondayISO = monday.toISOString();
  return workouts.filter((w) => w.completedDate && w.completedDate >= mondayISO).length;
}

export function computeStreak(workouts: Workout[]): number {
  const completed = workouts.filter((w) => w.completedDate);
  if (completed.length === 0) return 0;

  const uniqueDays = new Set(completed.map((w) => toLocalDateString(new Date(w.completedDate!))));
  const sortedDays = Array.from(uniqueDays).sort().reverse();

  const today = toLocalDateString(new Date());
  const yesterday = toLocalDateString(new Date(Date.now() - 86400000));

  if (sortedDays[0] !== today && sortedDays[0] !== yesterday) return 0;

  let count = 1;
  for (let i = 1; i < sortedDays.length; i++) {
    const prev = new Date(sortedDays[i - 1]);
    const curr = new Date(sortedDays[i]);
    const diffDays = (prev.getTime() - curr.getTime()) / 86400000;
    if (diffDays === 1) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

export async function addWorkout(
  userId: string,
  workout: Omit<Workout, "id" | "userId" | "createdAt" | "updatedAt">
): Promise<Workout> {
  const now = new Date().toISOString();
  const data = { ...workout, userId, createdAt: now, updatedAt: now };
  const id = await addDocument(COLLECTION, data);
  return { ...data, id };
}

export async function updateWorkout(id: string, changes: Partial<Workout>): Promise<void> {
  await updateDocument(COLLECTION, id, { ...changes, updatedAt: new Date().toISOString() });
}

export async function deleteWorkout(id: string): Promise<void> {
  await deleteDocument(COLLECTION, id);
}

export async function markWorkoutComplete(id: string, durationSeconds?: number): Promise<void> {
  await updateWorkout(id, {
    completedDate: new Date().toISOString(),
    ...(durationSeconds !== undefined ? { durationMinutes: Math.round(durationSeconds / 60) } : {}),
  });
}

export { COLLECTION as WORKOUTS_COLLECTION };
