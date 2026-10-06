import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import { ProgramForm } from "../ProgramForm";
import { useExercises } from "../../hooks/useExercises";
import { useAuthStore } from "../../core/auth/authStore";
import type { TrainingProgram } from "../../core/models/workout.model";

jest.mock("../../core/services/firestore.service", () => ({
  addDocument: jest.fn(async () => "new-id"),
  updateDocument: jest.fn(async () => undefined),
  deleteDocument: jest.fn(async () => undefined),
}));
jest.mock("../../hooks/useExercises", () => ({ useExercises: jest.fn() }));
jest.mock("../../core/auth/authStore", () => ({ useAuthStore: jest.fn() }));
jest.mock("expo-router", () => ({ router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() } }));

const mockUseExercises = useExercises as jest.Mock;
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
});
