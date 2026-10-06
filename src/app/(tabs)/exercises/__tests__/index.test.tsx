import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import ExerciseLibrary from "../index";
import { useExercises } from "../../../../hooks/useExercises";
import { useExerciseBundles } from "../../../../hooks/useExerciseBundles";

// Explicit factories so jest.mock never requires the real modules (which transitively pull in
// the firebase/firestore ESM build that Jest's transform can't parse).
jest.mock("../../../../hooks/useExercises", () => ({ useExercises: jest.fn() }));
jest.mock("../../../../hooks/useExerciseBundles", () => ({ useExerciseBundles: jest.fn() }));

const mockUseExercises = useExercises as jest.Mock;
const mockUseExerciseBundles = useExerciseBundles as jest.Mock;

describe("ExerciseLibrary Bundles tab", () => {
  beforeEach(() => {
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
});
