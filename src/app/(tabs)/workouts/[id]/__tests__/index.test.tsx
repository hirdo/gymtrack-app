import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { render } from "@testing-library/react-native";
import WorkoutDetail from "../index";
import { useWorkouts } from "../../../../../hooks/useWorkouts";
import { useExerciseLogs } from "../../../../../hooks/useExerciseLogs";
import { useAuthStore } from "../../../../../core/auth/authStore";
import type { Workout } from "../../../../../core/models/workout.model";

jest.mock("../../../../../core/services/firestore.service", () => ({
  addDocument: jest.fn(async () => "new-id"),
  updateDocument: jest.fn(async () => undefined),
  deleteDocument: jest.fn(async () => undefined),
}));
jest.mock("../../../../../hooks/useWorkouts", () => ({ useWorkouts: jest.fn() }));
jest.mock("../../../../../hooks/useExerciseLogs", () => ({ useExerciseLogs: jest.fn() }));
jest.mock("../../../../../core/auth/authStore", () => ({ useAuthStore: jest.fn() }));
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({ id: "w1" })),
}));

const mockUseWorkouts = useWorkouts as jest.Mock;
const mockUseExerciseLogs = useExerciseLogs as jest.Mock;
const mockUseAuthStore = useAuthStore as unknown as jest.Mock;

const freshWorkout: Workout = {
  id: "w1",
  name: "Push Day",
  exercises: [{ id: "ex1", name: "Bench Press", sets: 3, reps: 10, templateId: "tpl1", trackingType: "reps" }],
  category: "strength",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("WorkoutDetail", () => {
  beforeEach(() => {
    mockUseAuthStore.mockReturnValue("u1");
    mockUseExerciseLogs.mockReturnValue({ logs: [] });
  });

  it("shows Start Workout and the Edit icon, but no Complete button, for a never-trained workout", async () => {
    mockUseWorkouts.mockReturnValue({ workouts: [freshWorkout] });
    const { getByText, queryByText } = await render(<WorkoutDetail />);
    expect(getByText("Start Workout")).toBeTruthy();
    expect(queryByText("Complete")).toBeNull();
  });

  it("shows Continue Workout and Complete side by side once trained, and hides the Edit icon", async () => {
    mockUseWorkouts.mockReturnValue({ workouts: [freshWorkout] });
    mockUseExerciseLogs.mockReturnValue({
      logs: [
        {
          id: "log1",
          workoutId: "w1",
          exerciseIndex: 0,
          exerciseName: "Bench Press",
          trackingType: "reps",
          sets: [{ setNumber: 1, reps: 10, weight: 40 }],
        },
      ],
    });
    const { getByText } = await render(<WorkoutDetail />);
    expect(getByText("Continue Workout")).toBeTruthy();
    expect(getByText("Complete")).toBeTruthy();
  });
});
