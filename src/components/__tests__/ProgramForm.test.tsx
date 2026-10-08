import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import { Keyboard } from "react-native";
import { ProgramForm } from "../ProgramForm";
import { Toast } from "../Toast";
import { useExercises } from "../../hooks/useExercises";
import { useExerciseBundles } from "../../hooks/useExerciseBundles";
import { useAuthStore } from "../../core/auth/authStore";
import { router } from "expo-router";
import type { TrainingProgram } from "../../core/models/workout.model";

jest.mock("../../core/services/firestore.service", () => ({
  addDocument: jest.fn(async () => "new-id"),
  updateDocument: jest.fn(async () => undefined),
  deleteDocument: jest.fn(async () => undefined),
}));
jest.mock("../../hooks/useExercises", () => ({ useExercises: jest.fn() }));
jest.mock("../../hooks/useExerciseBundles", () => ({ useExerciseBundles: jest.fn() }));
jest.mock("../../core/auth/authStore", () => ({ useAuthStore: jest.fn() }));
jest.mock("expo-router", () => ({ router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() } }));

const mockUseExercises = useExercises as jest.Mock;
const mockUseExerciseBundles = useExerciseBundles as jest.Mock;
const mockUseAuthStore = useAuthStore as unknown as jest.Mock;

const editingProgram: TrainingProgram = {
  id: "p1",
  userId: "u1",
  name: "Strength Foundations",
  difficulty: "intermediate",
  totalDays: 2,
  sessionsPerWeek: 4,
  days: [
    {
      dayNumber: 0,
      name: "Push",
      exercises: [
        { exerciseId: "tpl1", exerciseName: "Bench Press", trackingType: "reps", targetSets: 3, targetReps: 10, targetWeight: 40 },
        { exerciseId: "tpl2", exerciseName: "Plank", trackingType: "duration", targetSets: 3, targetDuration: 30, targetDurationUnit: "sec" },
      ],
    },
    {
      dayNumber: 1,
      name: "Pull",
      exercises: [{ exerciseId: "tpl3", exerciseName: "Pull Ups", trackingType: "reps_only", targetSets: 3, targetReps: 8 }],
    },
  ],
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("ProgramForm edit mode", () => {
  beforeEach(() => {
    mockUseExercises.mockReturnValue({
      exercises: [
        { id: "tpl1", name: "Bench Press", category: "strength", primaryMuscles: ["chest"], equipment: "barbell" },
        { id: "tpl2", name: "Plank", category: "strength", primaryMuscles: ["core"], equipment: "bodyweight" },
        { id: "tpl3", name: "Pull Ups", category: "strength", primaryMuscles: ["back"], equipment: "bodyweight" },
      ],
    });
    mockUseAuthStore.mockReturnValue("u1");
    mockUseExerciseBundles.mockReturnValue({ bundles: [] });
  });

  it("renders with a real multi-day program without crashing", async () => {
    const { getByText } = await render(<ProgramForm editingProgram={editingProgram} />);
    expect(getByText("Save Changes")).toBeTruthy();
    expect(getByText("Bench Press")).toBeTruthy();
  });

  it("switches day tab and opens the reorder-days modal without crashing", async () => {
    const { getByText } = await render(<ProgramForm editingProgram={editingProgram} />);
    await fireEvent.press(getByText("Day 2"));
    expect(getByText("Pull Ups")).toBeTruthy();
    await fireEvent.press(getByText("Reorder"));
    expect(getByText("Reorder Days")).toBeTruthy();
  });

  it("renders in create mode (no editingProgram) without crashing", async () => {
    const { getByText } = await render(<ProgramForm />);
    expect(getByText("Create Program")).toBeTruthy();
  });

  // Regression test for a reported device freeze: pressing Cancel while a TextInput is still
  // focused fired router.back() in the same tick as the keyboard's dismiss animation, which is
  // a known RN/Android UI-thread stall. handleCancel must dismiss the keyboard, then give the
  // dismiss animation a real head start (a short delay, not just issuing dismiss() first) before
  // navigating — calling dismiss() synchronously right before navigating was tried and still froze.
  it("dismisses the keyboard, then navigates back on Cancel after a short delay", async () => {
    const dismissSpy = jest.spyOn(Keyboard, "dismiss");
    const { getByText } = await render(<ProgramForm editingProgram={editingProgram} />);
    await fireEvent.press(getByText("Cancel"));
    expect(dismissSpy).toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(router.back).toHaveBeenCalled();
  });

  // Regression test for a reported "Back has to be pressed twice" bug: this screen is reached
  // via push() from the program detail screen, so saving must go back() (popping this screen off,
  // leaving exactly one detail screen underneath) rather than replace() (which would leave the
  // pre-edit detail screen stacked underneath a second, newly-pushed copy of it).
  it("navigates back (not replace) after saving in edit mode", async () => {
    const { getByText } = await render(<ProgramForm editingProgram={editingProgram} />);
    await fireEvent.press(getByText("Save Changes"));
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(router.back).toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  // Regression test: Duplicate Day appended a new day at the far end of the horizontal day-tabs
  // scroller with no other visible change, so there was no signal the action had actually done
  // anything. It must now flash a confirmation toast.
  it("shows a toast confirmation after duplicating a day", async () => {
    const { getByText } = await render(
      <>
        <ProgramForm editingProgram={editingProgram} />
        <Toast />
      </>
    );
    await fireEvent.press(getByText("Duplicate"));
    expect(getByText(/Duplicated "Push" as Day 3/)).toBeTruthy();
  });
});
