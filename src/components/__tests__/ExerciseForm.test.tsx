import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import { ExerciseForm } from "../ExerciseForm";
import type { ExerciseTemplate } from "../../core/models/workout.model";

const mockUpdateDocument = jest.fn(async (..._args: unknown[]) => undefined);
jest.mock("../../core/services/firestore.service", () => ({
  addDocument: jest.fn(async () => "new-id"),
  updateDocument: (...args: unknown[]) => mockUpdateDocument(...args),
  deleteDocument: jest.fn(async () => undefined),
}));
jest.mock("../../core/auth/authStore", () => ({ useAuthStore: jest.fn(() => "u1") }));
jest.mock("expo-router", () => ({ router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() } }));
jest.mock("expo-image-picker", () => ({ requestMediaLibraryPermissionsAsync: jest.fn(), launchImageLibraryAsync: jest.fn() }));

const editingExercise: ExerciseTemplate = {
  id: "e1",
  name: "Bench Press",
  category: "strength",
  equipment: "barbell",
  trackingType: "reps",
  primaryMuscles: ["chest"],
  instructions: "Old instructions",
};

describe("ExerciseForm edit mode - instructions save", () => {
  beforeEach(() => {
    mockUpdateDocument.mockClear();
  });

  it("saves edited instructions text", async () => {
    const { getByText, getByDisplayValue } = await render(<ExerciseForm editingExercise={editingExercise} />);
    const instructionsInput = getByDisplayValue("Old instructions");
    await fireEvent.changeText(instructionsInput, "New instructions text");
    await fireEvent.press(getByText("Save Changes"));
    expect(mockUpdateDocument).toHaveBeenCalled();
    const call = mockUpdateDocument.mock.calls[0] as unknown as [string, string, Record<string, unknown>];
    expect(call[2].instructions).toBe("New instructions text");
  });
});
