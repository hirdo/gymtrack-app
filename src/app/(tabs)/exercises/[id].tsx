import { useMemo } from "react";
import { FlatList, Image, Pressable, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useExercises } from "../../../hooks/useExercises";
import { getAlternatives, getExerciseById } from "../../../core/services/exercise-library.service";
import { formatDurationValue } from "../../../core/utils/date.util";
import { colors, fonts } from "../../../core/theme/tokens";

export default function ExerciseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { exercises } = useExercises();

  const exercise = useMemo(() => (id ? getExerciseById(exercises, id) : undefined), [exercises, id]);
  const alternatives = useMemo(() => (exercise ? getAlternatives(exercises, exercise.id).slice(0, 6) : []), [exercises, exercise]);

  if (!exercise) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", gap: 16, padding: 24 }}>
        <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 16 }}>Exercise not found</Text>
        <Pressable onPress={() => router.back()} style={{ backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20 }}>
          <Text style={{ color: colors.background, fontFamily: fonts.bodySemiBold }}>Back to Library</Text>
        </Pressable>
      </View>
    );
  }

  const hasRecommended = exercise.recommendedReps || exercise.recommendedWeight || exercise.recommendedDuration;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, gap: 16 }}>
      <View style={{ gap: 10 }}>
        <Text style={{ color: colors.text, fontFamily: fonts.heading, fontSize: 28, textTransform: "uppercase" }}>{exercise.name}</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11, textTransform: "uppercase" }}>{exercise.category}</Text>
          </View>
          <View style={{ backgroundColor: colors.surface, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ color: colors.textMuted, fontFamily: fonts.bodySemiBold, fontSize: 11, textTransform: "capitalize" }}>{exercise.equipment}</Text>
          </View>
        </View>
      </View>

      {exercise.imageUrl ? (
        <Image
          source={{ uri: exercise.imageUrl }}
          style={{ width: "100%", height: 220, borderRadius: 16, backgroundColor: colors.text }}
          resizeMode="contain"
        />
      ) : null}

      <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 14, gap: 10 }}>
        <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 13, textTransform: "uppercase" }}>Target Muscles</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {(exercise.primaryMuscles ?? []).map((m) => (
            <View key={m} style={{ backgroundColor: colors.background, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 }}>
              <Text style={{ color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11, textTransform: "uppercase" }}>{m}</Text>
            </View>
          ))}
          {(exercise.secondaryMuscles ?? []).map((m) => (
            <View key={m} style={{ backgroundColor: colors.background, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 }}>
              <Text style={{ color: colors.textMuted, fontFamily: fonts.bodySemiBold, fontSize: 11, textTransform: "uppercase" }}>{m}</Text>
            </View>
          ))}
        </View>
      </View>

      {exercise.instructions ? (
        <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 14, gap: 8 }}>
          <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 13, textTransform: "uppercase" }}>Instructions</Text>
          <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 13, lineHeight: 20 }}>{exercise.instructions}</Text>
        </View>
      ) : null}

      {hasRecommended ? (
        <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 14, gap: 8, borderWidth: 1, borderColor: colors.primary + "4d" }}>
          <Text style={{ color: colors.textMuted, fontFamily: fonts.bodySemiBold, fontSize: 11, textTransform: "uppercase" }}>Recommended</Text>
          <View style={{ flexDirection: "row", gap: 20 }}>
            {exercise.recommendedReps ? (
              <Text style={{ color: colors.primary, fontFamily: fonts.heading, fontSize: 24 }}>
                {exercise.recommendedReps}
                <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 13 }}> reps</Text>
              </Text>
            ) : null}
            {exercise.recommendedWeight ? (
              <Text style={{ color: colors.primary, fontFamily: fonts.heading, fontSize: 24 }}>
                {exercise.recommendedWeight}
                <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 13 }}> kg</Text>
              </Text>
            ) : null}
            {exercise.recommendedDuration ? (
              <Text style={{ color: colors.primary, fontFamily: fonts.heading, fontSize: 24 }}>
                {formatDurationValue(exercise.recommendedDuration, exercise.recommendedDurationUnit)}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {alternatives.length > 0 ? (
        <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 14, gap: 10 }}>
          <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 13, textTransform: "uppercase" }}>Similar Exercises</Text>
          <FlatList
            data={alternatives}
            keyExtractor={(a) => a.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            renderItem={({ item: alt }) => (
              <Pressable
                onPress={() => router.push({ pathname: "/(tabs)/exercises/[id]", params: { id: alt.id } })}
                style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 8, borderRadius: 10 }}
              >
                {alt.imageUrl ? (
                  <Image source={{ uri: alt.imageUrl }} style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: colors.text }} resizeMode="contain" />
                ) : (
                  <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: colors.primary, fontFamily: fonts.bodySemiBold }}>{alt.name.charAt(0)}</Text>
                  </View>
                )}
                <View>
                  <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 13 }}>{alt.name}</Text>
                  <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 11, textTransform: "capitalize" }}>{alt.equipment}</Text>
                </View>
              </Pressable>
            )}
          />
        </View>
      ) : null}
    </ScrollView>
  );
}
