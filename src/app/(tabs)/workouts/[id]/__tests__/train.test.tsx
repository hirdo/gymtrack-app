import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import WorkoutTrain from "../train";
import { useWorkouts } from "../../../../../hooks/useWorkouts";
import { useExercises } from "../../../../../hooks/useExercises";
import { useExerciseLogs } from "../../../../../hooks/useExerciseLogs";
import { useAuthStore } from "../../../../../core/auth/authStore";

// Mock at the firestore.service boundary (not exercise-log.service/workout.service) so the real
// pure logic in those modules — logsForWorkout filtering/sorting, getExerciseHistory — still
// runs for real; only the Firestore-writing primitives are stubbed. Mocking exercise-log.service
// wholesale would mean reproducing that logic in the test instead of exercising it.
jest.mock("../../../../../core/services/firestore.service", () => ({
  addDocument: jest.fn(async () => "new-log-id"),
  updateDocument: jest.fn(async () => undefined),
  deleteDocument: jest.fn(async () => undefined),
}));

jest.mock("../../../../../hooks/useWorkouts", () => ({ useWorkouts: jest.fn() }));
jest.mock("../../../../../hooks/useExercises", () => ({ useExercises: jest.fn() }));
jest.mock("../../../../../hooks/useExerciseLogs", () => ({ useExerciseLogs: jest.fn() }));
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({ id: "w1" })),
}));
jest.mock("../../../../../core/auth/authStore", () => ({ useAuthStore: jest.fn() }));

const mockUseWorkouts = useWorkouts as jest.Mock;
const mockUseExercises = useExercises as jest.Mock;
const mockUseExerciseLogs = useExerciseLogs as jest.Mock;
const mockUseAuthStore = useAuthStore as unknown as jest.Mock;

const workout = {
  id: "w1",
  name: "Push Day",
  exercises: [
    { id: "ex1", name: "Bench Press", sets: 3, reps: 10, weight: 40, templateId: "tpl1", trackingType: "reps" as const },
    { id: "ex2", name: "Plank", sets: 3, duration: 30, templateId: "tpl2", trackingType: "duration" as const },
  ],
  category: "strength" as const,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const repsLog = {
  id: "log1",
  userId: "u1",
  workoutId: "w1",
  exerciseIndex: 0,
  exerciseTemplateId: "tpl1",
  exerciseName: "Bench Press",
  trackingType: "reps" as const,
  date: "2026-01-01",
  targetSets: 3,
  targetReps: 10,
  targetWeight: 40,
  sets: [],
  startedAt: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const durationLog = {
  ...repsLog,
  id: "log2",
  exerciseIndex: 1,
  exerciseTemplateId: "tpl2",
  exerciseName: "Plank",
  trackingType: "duration" as const,
  targetDuration: 30,
  targetReps: undefined,
  targetWeight: undefined,
};

describe("WorkoutTrain", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWorkouts.mockReturnValue({ workouts: [workout] });
    mockUseExercises.mockReturnValue({
      exercises: [
        { id: "tpl1", name: "Bench Press", category: "strength", primaryMuscles: ["chest"], equipment: "barbell" },
        { id: "tpl2", name: "Plank", category: "strength", primaryMuscles: ["core"], equipment: "bodyweight" },
      ],
    });
    mockUseExerciseLogs.mockReturnValue({ logs: [repsLog, durationLog] });
    mockUseAuthStore.mockReturnValue("u1");
  });

  it("renders the first exercise slot without crashing", async () => {
    const { getByText } = await render(<WorkoutTrain />);
    expect(getByText("Push Day")).toBeTruthy();
    expect(getByText(/Bench Press/)).toBeTruthy();
    expect(getByText("Target Reps")).toBeTruthy();
  });

  it("logs a reps set and starts the rest timer", async () => {
    const { getByText, getAllByPlaceholderText } = await render(<WorkoutTrain />);
    const [weightField, repsField] = getAllByPlaceholderText("0");
    await fireEvent.changeText(weightField, "42");
    await fireEvent.changeText(repsField, "8");
    await fireEvent.press(getByText("Log Set"));
    expect(getByText("Rest Timer")).toBeTruthy();
  });

  it("switches to the duration exercise slot without crashing", async () => {
    const { getByText } = await render(<WorkoutTrain />);
    await fireEvent.press(getByText("Exercise 2"));
    expect(getByText(/Plank/)).toBeTruthy();
    expect(getByText("Start")).toBeTruthy();
  });
});
