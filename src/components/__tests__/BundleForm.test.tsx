import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import { Keyboard } from "react-native";
import { BundleForm } from "../BundleForm";
import { useExercises } from "../../hooks/useExercises";
import { router } from "expo-router";
import type { ExerciseBundle } from "../../core/models/workout.model";

jest.mock("../../core/services/firestore.service", () => ({
  addDocument: jest.fn(async () => "new-id"),
  updateDocument: jest.fn(async () => undefined),
  deleteDocument: jest.fn(async () => undefined),
}));
jest.mock("../../hooks/useExercises", () => ({ useExercises: jest.fn() }));
jest.mock("../../core/auth/authStore", () => ({ useAuthStore: jest.fn(() => "u1") }));
jest.mock("expo-router", () => ({ router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() } }));

const mockUseExercises = useExercises as jest.Mock;

const editingBundle: ExerciseBundle = {
  id: "b1",
  name: "Chest Press Variations",
  mainExerciseId: "tpl1",
  alternativeExerciseIds: ["tpl2"],
};

describe("BundleForm edit mode", () => {
  beforeEach(() => {
    mockUseExercises.mockReturnValue({
      exercises: [
        { id: "tpl1", name: "Bench Press", category: "strength", primaryMuscles: ["chest"], equipment: "barbell", imageUrl: "https://example.com/bench.png" },
        { id: "tpl2", name: "Dumbbell Press", category: "strength", primaryMuscles: ["chest"], equipment: "dumbbell" },
      ],
    });
  });

  it("renders with a real bundle without crashing", async () => {
    const { getByText } = await render(<BundleForm editingBundle={editingBundle} />);
    expect(getByText("Save Changes")).toBeTruthy();
    expect(getByText("Bench Press")).toBeTruthy();
  });

  // Regression test for a reported device freeze: pressing Cancel while a TextInput is still
  // focused fired router.back() in the same tick as the keyboard's dismiss animation, which is
  // a known RN/Android UI-thread stall. handleCancel must dismiss the keyboard, then give the
  // dismiss animation a real head start (a short delay, not just issuing dismiss() first) before
  // navigating — calling dismiss() synchronously right before navigating was tried and still froze.
  it("dismisses the keyboard, then navigates back on Cancel after a short delay", async () => {
    const dismissSpy = jest.spyOn(Keyboard, "dismiss");
    const { getByText } = await render(<BundleForm editingBundle={editingBundle} />);
    await fireEvent.press(getByText("Cancel"));
    expect(dismissSpy).toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(router.back).toHaveBeenCalled();
  });
});
