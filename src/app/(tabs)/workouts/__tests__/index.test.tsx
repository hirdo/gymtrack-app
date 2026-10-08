import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import WorkoutsList from "../index";
import { useWorkouts } from "../../../../hooks/useWorkouts";
import type { Workout } from "../../../../core/models/workout.model";

jest.mock("../../../../core/services/firestore.service", () => ({
  addDocument: jest.fn(async () => "new-id"),
  updateDocument: jest.fn(async () => undefined),
  deleteDocument: jest.fn(async () => undefined),
}));
jest.mock("../../../../hooks/useWorkouts", () => ({ useWorkouts: jest.fn() }));
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

const mockUseWorkouts = useWorkouts as jest.Mock;

// Not completed, so its program run is still active and the workout stays visible — matches
// gymtrack-web's "program workouts drop out once their run is fully completed" behavior.
const programWorkout: Workout = {
  id: "w1",
  name: "Push Day",
  exercises: [{ id: "ex1", name: "Bench Press", sets: 3, reps: 10, templateId: "tpl1", trackingType: "reps" }],
  category: "strength",
  programId: "p1",
  programRunId: "run1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const selfWorkout: Workout = {
  id: "w2",
  name: "My Custom Day",
  exercises: [{ id: "ex2", name: "Deadlift", sets: 3, reps: 5, templateId: "tpl2", trackingType: "reps" }],
  category: "custom",
  scheduledDate: "2026-02-01",
  createdAt: "2026-01-10T00:00:00.000Z",
  updatedAt: "2026-01-10T00:00:00.000Z",
};

describe("WorkoutsList", () => {
  beforeEach(() => {
    mockUseWorkouts.mockReturnValue({ workouts: [programWorkout, selfWorkout] });
  });

  it("splits workouts into From Your Program and My Workouts sections without crashing", async () => {
    const { getByText } = await render(<WorkoutsList />);
    expect(getByText("From Your Program")).toBeTruthy();
    expect(getByText("My Workouts")).toBeTruthy();
    expect(getByText("Push Day")).toBeTruthy();
    expect(getByText("My Custom Day")).toBeTruthy();
    expect(getByText("Scheduled")).toBeTruthy();
  });

  it("filters by category", async () => {
    const { getByText, queryByText } = await render(<WorkoutsList />);
    await fireEvent.press(getByText("Custom"));
    expect(getByText("My Custom Day")).toBeTruthy();
    expect(queryByText("Push Day")).toBeNull();
  });

  it("renders the empty state when there are no workouts", async () => {
    mockUseWorkouts.mockReturnValue({ workouts: [] });
    const { getByText } = await render(<WorkoutsList />);
    expect(getByText("No workouts yet")).toBeTruthy();
  });

  it("shows a loading spinner instead of the empty state while the first snapshot is still loading", async () => {
    mockUseWorkouts.mockReturnValue({ workouts: [], isLoading: true });
    const { getByText, queryByText } = await render(<WorkoutsList />);
    expect(getByText("Loading workouts...")).toBeTruthy();
    expect(queryByText("No workouts yet")).toBeNull();
  });
});
