import { Redirect, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { useAuth } from "../../../../hooks/useAuth";
import { useExercises } from "../../../../hooks/useExercises";
import { getExerciseById } from "../../../../core/services/exercise-library.service";
import { ExerciseForm } from "../../../../components/ExerciseForm";
import { colors, fonts } from "../../../../core/theme/tokens";

export default function EditExercise() {
  const { isAdmin } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { exercises } = useExercises();
  const exercise = getExerciseById(exercises, id);

  if (!isAdmin) return <Redirect href="/(tabs)/exercises" />;

  if (!exercise) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: colors.textMuted, fontFamily: fonts.body }}>Exercise not found.</Text>
      </View>
    );
  }

  return <ExerciseForm editingExercise={exercise} />;
}
