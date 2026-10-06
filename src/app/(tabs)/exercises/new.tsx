import { Redirect } from "expo-router";
import { useAuth } from "../../../hooks/useAuth";
import { ExerciseForm } from "../../../components/ExerciseForm";

export default function NewExercise() {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Redirect href="/(tabs)/exercises" />;
  return <ExerciseForm />;
}
