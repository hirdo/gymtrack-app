import { useMemo, useState } from "react";
import { FlatList, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useExercises } from "../../../hooks/useExercises";
import { useExerciseBundles } from "../../../hooks/useExerciseBundles";
import {
  ALL_EQUIPMENT,
  ALL_MUSCLE_GROUPS,
  getExerciseById,
  searchExercises,
} from "../../../core/services/exercise-library.service";
import { searchBundles } from "../../../core/services/exercise-bundle.service";
import type { Equipment, ExerciseTemplate, MuscleGroup } from "../../../core/models/workout.model";
import { colors, fonts } from "../../../core/theme/tokens";

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 999,
        backgroundColor: active ? colors.primary : colors.surface,
        marginRight: 8,
      }}
    >
      <Text
        style={{
          color: active ? colors.background : colors.textMuted,
          fontFamily: fonts.bodySemiBold,
          fontSize: 12,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function ExerciseLibrary() {
  const [activeTab, setActiveTab] = useState<"exercises" | "bundles">("exercises");

  const { exercises } = useExercises();
  const { bundles } = useExerciseBundles();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | "">("");
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | "">("");

  const [bundleSearchQuery, setBundleSearchQuery] = useState("");
  const [selectedBundleMuscle, setSelectedBundleMuscle] = useState<MuscleGroup | "">("");

  const filteredExercises = useMemo(() => {
    let results = searchExercises(exercises, searchQuery);
    if (selectedMuscle) results = results.filter((e) => e.primaryMuscles.includes(selectedMuscle));
    if (selectedEquipment) results = results.filter((e) => e.equipment === selectedEquipment);
    return results;
  }, [exercises, searchQuery, selectedMuscle, selectedEquipment]);

  const filteredBundles = useMemo(() => {
    let results = searchBundles(bundles, bundleSearchQuery);
    if (selectedBundleMuscle) {
      results = results.filter((b) =>
        (getExerciseById(exercises, b.mainExerciseId)?.primaryMuscles ?? []).includes(selectedBundleMuscle)
      );
    }
    return results;
  }, [bundles, bundleSearchQuery, selectedBundleMuscle, exercises]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: "row", gap: 8, padding: 16, paddingBottom: 0 }}>
        <Pressable onPress={() => setActiveTab("exercises")} style={{ paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 2, borderBottomColor: activeTab === "exercises" ? colors.primary : "transparent" }}>
          <Text style={{ color: activeTab === "exercises" ? colors.primary : colors.textMuted, fontFamily: fonts.heading, fontSize: 14, textTransform: "uppercase" }}>
            Exercises
          </Text>
        </Pressable>
        <Pressable onPress={() => setActiveTab("bundles")} style={{ paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 2, borderBottomColor: activeTab === "bundles" ? colors.primary : "transparent" }}>
          <Text style={{ color: activeTab === "bundles" ? colors.primary : colors.textMuted, fontFamily: fonts.heading, fontSize: 14, textTransform: "uppercase" }}>
            Bundles
          </Text>
        </Pressable>
      </View>

      {activeTab === "exercises" ? (
        <FlatList
          data={filteredExercises}
          keyExtractor={(e) => e.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListHeaderComponent={
            <View style={{ marginBottom: 12, gap: 10 }}>
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search exercises..."
                placeholderTextColor={colors.textMuted}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  color: colors.text,
                  fontFamily: fonts.body,
                }}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Chip label="All Muscles" active={!selectedMuscle} onPress={() => setSelectedMuscle("")} />
                {ALL_MUSCLE_GROUPS.map((m) => (
                  <Chip key={m} label={m} active={selectedMuscle === m} onPress={() => setSelectedMuscle(m)} />
                ))}
              </ScrollView>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Chip label="All Equipment" active={!selectedEquipment} onPress={() => setSelectedEquipment("")} />
                {ALL_EQUIPMENT.map((eq) => (
                  <Chip key={eq} label={eq} active={selectedEquipment === eq} onPress={() => setSelectedEquipment(eq)} />
                ))}
              </ScrollView>
            </View>
          }
          ListEmptyComponent={
            <Text style={{ color: colors.textMuted, fontFamily: fonts.body, textAlign: "center", marginTop: 40 }}>
              No exercises match your filters.
            </Text>
          }
          renderItem={({ item }) => <ExerciseCard exercise={item} />}
        />
      ) : (
        <FlatList
          data={filteredBundles}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListHeaderComponent={
            <View style={{ marginBottom: 12, gap: 10 }}>
              <TextInput
                value={bundleSearchQuery}
                onChangeText={setBundleSearchQuery}
                placeholder="Search bundles..."
                placeholderTextColor={colors.textMuted}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  color: colors.text,
                  fontFamily: fonts.body,
                }}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Chip label="All Muscles" active={!selectedBundleMuscle} onPress={() => setSelectedBundleMuscle("")} />
                {ALL_MUSCLE_GROUPS.map((m) => (
                  <Chip key={m} label={m} active={selectedBundleMuscle === m} onPress={() => setSelectedBundleMuscle(m)} />
                ))}
              </ScrollView>
            </View>
          }
          ListEmptyComponent={
            <Text style={{ color: colors.textMuted, fontFamily: fonts.body, textAlign: "center", marginTop: 40 }}>
              No bundles match your search. A bundle groups a main exercise with its alternates for reuse across programs.
            </Text>
          }
          renderItem={({ item }) => {
            const main = getExerciseById(exercises, item.mainExerciseId);
            return (
              <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 14, gap: 10 }}>
                <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 15 }}>{item.name}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  {main?.imageUrl ? (
                    <Image source={{ uri: main.imageUrl }} style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: colors.text }} />
                  ) : null}
                  <Text style={{ color: colors.text, fontFamily: fonts.body, fontSize: 13 }}>{main?.name ?? "Unknown exercise"}</Text>
                </View>
                {item.alternativeExerciseIds.length > 0 ? (
                  <View style={{ gap: 6, borderTopWidth: 1, borderTopColor: colors.secondary, paddingTop: 10 }}>
                    <Text style={{ color: colors.textMuted, fontFamily: fonts.bodySemiBold, fontSize: 10, textTransform: "uppercase" }}>
                      Alternatives
                    </Text>
                    {item.alternativeExerciseIds.map((altId) => {
                      const alt = getExerciseById(exercises, altId);
                      return (
                        <View key={altId} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          {alt?.imageUrl ? (
                            <Image source={{ uri: alt.imageUrl }} style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: colors.text }} />
                          ) : null}
                          <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 12 }}>{alt?.name ?? "Unknown exercise"}</Text>
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

function ExerciseCard({ exercise }: { exercise: ExerciseTemplate }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/(tabs)/exercises/[id]", params: { id: exercise.id } })}
      style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: 12, gap: 8 }}
    >
      {exercise.imageUrl ? (
        <Image source={{ uri: exercise.imageUrl }} style={{ width: "100%", height: 90, borderRadius: 8, backgroundColor: colors.text }} resizeMode="contain" />
      ) : null}
      <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 13 }} numberOfLines={2}>
        {exercise.name}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
        {exercise.primaryMuscles.slice(0, 2).map((m) => (
          <View key={m} style={{ backgroundColor: colors.background, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 9, textTransform: "uppercase" }}>{m}</Text>
          </View>
        ))}
      </View>
      <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 11, textTransform: "capitalize" }}>
        {exercise.equipment} · {exercise.category}
      </Text>
    </Pressable>
  );
}
