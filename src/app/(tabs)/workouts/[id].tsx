import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useWorkouts } from "../../../hooks/useWorkouts";
import { markWorkoutComplete } from "../../../core/services/workout.service";
import { formatDisplayDate } from "../../../core/utils/date.util";
import { colors, fonts } from "../../../core/theme/tokens";

export default function WorkoutDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { workouts } = useWorkouts();
  const workout = workouts.find((w) => w.id === id);
  const [isSaving, setIsSaving] = useState(false);

  if (!workout) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: colors.textMuted, fontFamily: fonts.body }}>Workout not found.</Text>
      </View>
    );
  }

  async function handleMarkComplete() {
    setIsSaving(true);
    try {
      await markWorkoutComplete(workout!.id);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Text style={{ color: colors.text, fontFamily: fonts.heading, fontSize: 26 }}>{workout.name}</Text>
      {workout.description ? (
        <Text style={{ color: colors.textMuted, fontFamily: fonts.body }}>{workout.description}</Text>
      ) : null}

      <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 13 }}>
        {workout.completedDate
          ? `Completed ${formatDisplayDate(new Date(workout.completedDate))}`
          : "Not completed yet"}
      </Text>

      <View style={{ gap: 10 }}>
        {workout.exercises.map((exercise, index) => (
          <View key={`${exercise.id}-${index}`} style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 14 }}>
            <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 16 }}>{exercise.name}</Text>
            <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 13, marginTop: 2 }}>
              {exercise.sets} sets{exercise.reps ? ` x ${exercise.reps} reps` : ""}
              {exercise.weight ? ` @ ${exercise.weight}kg` : ""}
            </Text>
          </View>
        ))}
      </View>

      {!workout.completedDate && (
        <Pressable
          disabled={isSaving}
          onPress={handleMarkComplete}
          style={{
            backgroundColor: colors.accent,
            paddingVertical: 14,
            borderRadius: 10,
            alignItems: "center",
            opacity: isSaving ? 0.6 : 1,
          }}
        >
          {isSaving ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 16 }}>Mark complete</Text>
          )}
        </Pressable>
      )}
    </ScrollView>
  );
}
