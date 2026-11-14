import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import ExerciseLibrary from "../index";
import { useExercises } from "../../../../hooks/useExercises";
import { useExerciseBundles } from "../../../../hooks/useExerciseBundles";
import { useAuth } from "../../../../hooks/useAuth";

// Explicit factories so jest.mock never requires the real modules (which transitively pull in
// the firebase/firestore ESM build that Jest's transform can't parse, or — for useAuth — the
// Keycloak/expo-auth-session redirect-URI setup that needs a real app manifest at runtime).
jest.mock("../../../../hooks/useExercises", () => ({ useExercises: jest.fn() }));
jest.mock("../../../../hooks/useExerciseBundles", () => ({ useExerciseBundles: jest.fn() }));
jest.mock("../../../../hooks/useAuth", () => ({ useAuth: jest.fn() }));
// exercise-library.service.ts (imported directly by the screen for its pure helpers) now also
// imports the admin-only write functions from firestore.service — stub those at the
// firestore.service boundary so the real pure helpers still load and run.
jest.mock("../../../../core/services/firestore.service", () => ({
  addDocument: jest.fn(async () => "new-id"),
  updateDocument: jest.fn(async () => undefined),
  deleteDocument: jest.fn(async () => undefined),
}));

const mockUseExercises = useExercises as jest.Mock;
const mockUseExerciseBundles = useExerciseBundles as jest.Mock;
const mockUseAuth = useAuth as jest.Mock;

describe("ExerciseLibrary Bundles tab", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ isAdmin: false });
    mockUseExercises.mockReturnValue({
      exercises: [
        { id: "ex1", name: "Bench Press", category: "strength", primaryMuscles: ["chest"], equipment: "barbell" },
        { id: "ex2", name: "Push Up", category: "strength", primaryMuscles: ["chest"], equipment: "bodyweight" },
      ],
      muscleGroups: ["chest"],
      equipmentTypes: ["barbell", "bodyweight"],
    });
  });

  it("switches to Bundles tab and renders a fully-populated bundle", async () => {
    mockUseExerciseBundles.mockReturnValue({
      bundles: [
        { id: "b1", name: "Chest Bundle", mainExerciseId: "ex1", alternativeExerciseIds: ["ex2"] },
      ],
    });
    const { getByText } = await render(<ExerciseLibrary />);
    await fireEvent.press(getByText("Bundles"));
    expect(getByText("Chest Bundle")).toBeTruthy();
  });

  it("switches to Bundles tab with zero bundles", async () => {
    mockUseExerciseBundles.mockReturnValue({ bundles: [] });
    const { getByText } = await render(<ExerciseLibrary />);
    await fireEvent.press(getByText("Bundles"));
    expect(getByText(/No bundles match/)).toBeTruthy();
  });

  it("does not crash when alternativeExerciseIds is missing", async () => {
    mockUseExerciseBundles.mockReturnValue({
      bundles: [{ id: "b2", name: "Legacy Bundle", mainExerciseId: "ex1" }],
    });
    const { getByText } = await render(<ExerciseLibrary />);
    await expect(fireEvent.press(getByText("Bundles"))).resolves.not.toThrow();
    expect(getByText("Legacy Bundle")).toBeTruthy();
  });

  it("switches back and forth between tabs without the FlatList numColumns invariant", async () => {
    mockUseExerciseBundles.mockReturnValue({ bundles: [] });
    const { getByText } = await render(<ExerciseLibrary />);
    await fireEvent.press(getByText("Bundles"));
    await fireEvent.press(getByText("Exercises"));
    await fireEvent.press(getByText("Bundles"));
    expect(getByText(/No bundles match/)).toBeTruthy();
  });

  it("shows a loading spinner instead of the exercise grid while the first snapshot is still loading", async () => {
    mockUseExercises.mockReturnValue({ exercises: [], isLoading: true, muscleGroups: [], equipmentTypes: [] });
    mockUseExerciseBundles.mockReturnValue({ bundles: [] });
    const { getByText, queryByText } = await render(<ExerciseLibrary />);
    expect(getByText("Loading exercises...")).toBeTruthy();
    expect(queryByText("Bench Press")).toBeNull();
  });
});
