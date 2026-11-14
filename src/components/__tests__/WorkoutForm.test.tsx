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
  // a known RN/Android UI-thread stall. handleCancel must dismiss the keyboard, then give the
  // dismiss animation a real head start (a short delay, not just issuing dismiss() first) before
  // navigating — calling dismiss() synchronously right before navigating was tried and still froze.
  it("dismisses the keyboard, then navigates back on Cancel after a short delay", async () => {
    const dismissSpy = jest.spyOn(Keyboard, "dismiss");
    const { getByText } = await render(<WorkoutForm editingWorkout={editingWorkout} />);
    await fireEvent.press(getByText("Cancel"));
    expect(dismissSpy).toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(router.back).toHaveBeenCalled();
  });

  // Regression test for a reported "Back has to be pressed twice" bug: this screen is reached
  // via push() from the workout detail screen, so saving must go back() (popping this screen off,
  // leaving exactly one detail screen underneath) rather than replace() (which would leave the
  // pre-edit detail screen stacked underneath a second, newly-pushed copy of it).
  it("navigates back (not replace) after saving in edit mode", async () => {
    const { getByText } = await render(<WorkoutForm editingWorkout={editingWorkout} />);
    await fireEvent.press(getByText("Save Changes"));
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(router.back).toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  // Regression test for a reported freeze + missing Back button right after creating a workout.
  // The "new workout" screen is presented with `presentation: "modal"` (workouts/_layout.tsx);
  // replace()-ing that modal screen's content with the plain pushed-card detail screen left the
  // native modal/card transitions fighting each other. The fix is back() (closing the modal,
  // returning to the list already underneath) immediately followed by push() of the detail
  // screen as a normal card — never replace() across that modal boundary.
  it("closes the modal and pushes the detail screen (not replace) after creating a workout", async () => {
    mockUseWorkouts.mockReturnValue({ workouts: [] });
    const { getByText, getByPlaceholderText } = await render(<WorkoutForm />);
    await fireEvent.changeText(getByPlaceholderText("e.g. Push day"), "Leg Day");
    await fireEvent.press(getByText("Choose exercise…"));
    await fireEvent.press(getByText("Bench Press"));
    await fireEvent.press(getByText("Create Workout"));
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(router.back).toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith({ pathname: "/(tabs)/workouts/[id]", params: { id: "new-id" } });
    expect(router.replace).not.toHaveBeenCalled();
  });
});
