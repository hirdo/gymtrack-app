import { Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useWorkouts } from "../../../../hooks/useWorkouts";
import { WorkoutForm } from "../../../../components/WorkoutForm";
import { colors, fonts } from "../../../../core/theme/tokens";

export default function EditWorkout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { workouts } = useWorkouts();
  const workout = workouts.find((w) => w.id === id);

  if (!workout) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: colors.textMuted, fontFamily: fonts.body }}>Workout not found.</Text>
      </View>
    );
  }

  return <WorkoutForm editingWorkout={workout} />;
}
