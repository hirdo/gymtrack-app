import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import { Keyboard } from "react-native";
import { ExerciseForm } from "../ExerciseForm";
import { router } from "expo-router";
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

  // Regression test for a reported device freeze: pressing Cancel while a TextInput is still
  // focused fired router.back() in the same tick as the keyboard's dismiss animation, which is
  // a known RN/Android UI-thread stall. handleCancel must dismiss the keyboard, then give the
  // dismiss animation a real head start (a short delay, not just issuing dismiss() first) before
  // navigating — calling dismiss() synchronously right before navigating was tried and still froze.
  it("dismisses the keyboard, then navigates back on Cancel after a short delay", async () => {
    const dismissSpy = jest.spyOn(Keyboard, "dismiss");
    const { getByText } = await render(<ExerciseForm editingExercise={editingExercise} />);
    await fireEvent.press(getByText("Cancel"));
    expect(dismissSpy).toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(router.back).toHaveBeenCalled();
  });

  // Regression test for a reported "Back has to be pressed twice" bug: this screen is reached
  // via push() from the exercise detail screen, so saving must go back() (popping this screen
  // off, leaving exactly one detail screen underneath) rather than replace() (which would leave
  // the pre-edit detail screen stacked underneath a second, newly-pushed copy of it).
  it("navigates back (not replace) after saving in edit mode", async () => {
    const { getByText } = await render(<ExerciseForm editingExercise={editingExercise} />);
    await fireEvent.press(getByText("Save Changes"));
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(router.back).toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
