import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { render } from "@testing-library/react-native";
import Dashboard from "../dashboard";
import { useWorkouts } from "../../../hooks/useWorkouts";
import { usePrograms } from "../../../hooks/usePrograms";
import { useProfile } from "../../../hooks/useProfile";
import { useExerciseLogs } from "../../../hooks/useExerciseLogs";
import type { TrainingProgram, Workout } from "../../../core/models/workout.model";

jest.mock("../../../core/services/firestore.service", () => ({
  addDocument: jest.fn(async () => "new-id"),
  updateDocument: jest.fn(async () => undefined),
  deleteDocument: jest.fn(async () => undefined),
}));
jest.mock("../../../hooks/useWorkouts", () => ({ useWorkouts: jest.fn() }));
jest.mock("../../../hooks/usePrograms", () => ({ usePrograms: jest.fn() }));
jest.mock("../../../hooks/useProfile", () => ({ useProfile: jest.fn() }));
jest.mock("../../../hooks/useExerciseLogs", () => ({ useExerciseLogs: jest.fn() }));
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

const mockUseWorkouts = useWorkouts as jest.Mock;
const mockUsePrograms = usePrograms as jest.Mock;
const mockUseProfile = useProfile as jest.Mock;
const mockUseExerciseLogs = useExerciseLogs as jest.Mock;

const program: TrainingProgram = {
  id: "p1",
  userId: "u1",
  name: "Strength Foundations",
  difficulty: "intermediate",
  totalDays: 3,
  sessionsPerWeek: 4,
  days: [],
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const activeProgramWorkout: Workout = {
  id: "w1",
  name: "Strength Foundations - Day 1",
  exercises: [{ id: "ex1", name: "Squat", sets: 3, reps: 8, templateId: "tpl1", trackingType: "reps" }],
  category: "strength",
  programId: "p1",
  programRunId: "run1",
  createdAt: "2026-01-02T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

describe("Dashboard", () => {
  beforeEach(() => {
    mockUseProfile.mockReturnValue({ profile: { firstName: "Alex" }, isAdmin: false, updateAvatar: jest.fn() });
    mockUseExerciseLogs.mockReturnValue({ logs: [] });
  });

  it("renders with no workouts without crashing", async () => {
    mockUseWorkouts.mockReturnValue({
      workouts: [],
      recent: [],
      streak: 0,
      thisWeekCount: 0,
      totalWorkouts: 0,
      completedWorkouts: 0,
    });
    mockUsePrograms.mockReturnValue({ programs: [] });

    const { getByText } = await render(<Dashboard />);
    expect(getByText("Alex")).toBeTruthy();
    expect(getByText("Quick Actions")).toBeTruthy();
  });

  it("renders the active program widget and recent workouts without crashing", async () => {
    mockUseWorkouts.mockReturnValue({
      workouts: [activeProgramWorkout],
      recent: [activeProgramWorkout],
      streak: 2,
      thisWeekCount: 1,
      totalWorkouts: 5,
      completedWorkouts: 3,
    });
    mockUsePrograms.mockReturnValue({ programs: [program] });

    const { getByText } = await render(<Dashboard />);
    expect(getByText("Strength Foundations")).toBeTruthy();
    expect(getByText(/0\/3 days completed/)).toBeTruthy();
    expect(getByText("Strength Foundations - Day 1")).toBeTruthy();
  });
});
