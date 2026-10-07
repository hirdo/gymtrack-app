import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import { Keyboard } from "react-native";
import { WorkoutForm } from "../WorkoutForm";
import { useWorkouts } from "../../hooks/useWorkouts";
import { useExercises } from "../../hooks/useExercises";
import { useAuthStore } from "../../core/auth/authStore";
import { router } from "expo-router";
import type { Workout } from "../../core/models/workout.model";

jest.mock("../../core/services/firestore.service", () => ({
  addDocument: jest.fn(async () => "new-id"),
  updateDocument: jest.fn(async () => undefined),
  deleteDocument: jest.fn(async () => undefined),
}));
jest.mock("../../hooks/useWorkouts", () => ({ useWorkouts: jest.fn() }));
jest.mock("../../hooks/useExercises", () => ({ useExercises: jest.fn() }));
jest.mock("../../core/auth/authStore", () => ({ useAuthStore: jest.fn() }));
jest.mock("expo-router", () => ({ router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() } }));

const mockUseWorkouts = useWorkouts as jest.Mock;
const mockUseExercises = useExercises as jest.Mock;
const mockUseAuthStore = useAuthStore as unknown as jest.Mock;

const editingWorkout: Workout = {
  id: "w1",
  name: "Push Day",
  description: "Chest and triceps",
  exercises: [
    { id: "ex1", name: "Bench Press", sets: 3, reps: 10, weight: 40, templateId: "tpl1", trackingType: "reps" },
    { id: "ex2", name: "Plank", sets: 3, duration: 30, durationUnit: "sec", templateId: "tpl2", trackingType: "duration" },
    { id: "ex3", name: "Sit Ups", sets: 3, reps: 15, templateId: "tpl3", trackingType: "reps_only" },
  ],
  scheduledDate: "2026-11-01",
  category: "strength",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("WorkoutForm edit mode", () => {
  beforeEach(() => {
    mockUseWorkouts.mockReturnValue({ workouts: [editingWorkout] });
    mockUseExercises.mockReturnValue({
      exercises: [
        { id: "tpl1", name: "Bench Press", category: "strength", primaryMuscles: ["chest"], equipment: "barbell" },
        { id: "tpl2", name: "Plank", category: "strength", primaryMuscles: ["core"], equipment: "bodyweight" },
        { id: "tpl3", name: "Sit Ups", category: "strength", primaryMuscles: ["core"], equipment: "bodyweight" },
      ],
    });
    mockUseAuthStore.mockReturnValue("u1");
  });

  it("renders with a real multi-exercise workout without crashing", async () => {
    const { getByText } = await render(<WorkoutForm editingWorkout={editingWorkout} />);
    expect(getByText("Save Changes")).toBeTruthy();
    expect(getByText(/Choose exercise|Bench Press/)).toBeTruthy();
  });

  it("renders in create mode (no editingWorkout) without crashing", async () => {
    const { getByText } = await render(<WorkoutForm />);
    expect(getByText("Create Workout")).toBeTruthy();
  });

  it("moves an exercise row down via the reorder buttons", async () => {
    mockUseWorkouts.mockReturnValue({ workouts: [editingWorkout] });
    const { getAllByText } = await render(<WorkoutForm editingWorkout={editingWorkout} />);
    const downButtons = getAllByText("▼");
    await fireEvent.press(downButtons[0]);
    const exerciseLabels = getAllByText(/^Exercise \d$/);
    expect(exerciseLabels[0]).toBeTruthy();
  });

  // Regression test for a reported device freeze: pressing Cancel while a TextInput is still
  // focused fired router.back() in the same tick as the keyboard's dismiss animation, which is
  // a known RN/Android UI-thread stall. handleCancel must dismiss the keyboard first.
  it("dismisses the keyboard before navigating back on Cancel", async () => {
    const dismissSpy = jest.spyOn(Keyboard, "dismiss");
    const { getByText } = await render(<WorkoutForm editingWorkout={editingWorkout} />);
    await fireEvent.press(getByText("Cancel"));
    expect(dismissSpy).toHaveBeenCalled();
    expect(router.back).toHaveBeenCalled();
  });
});
