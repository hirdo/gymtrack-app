import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { Link, router } from "expo-router";
import { useExercises } from "../../../hooks/useExercises";
import { useExerciseBundles } from "../../../hooks/useExerciseBundles";
import { useAuth } from "../../../hooks/useAuth";
import {
  ALL_EQUIPMENT,
  ALL_MUSCLE_GROUPS,
  getExerciseById,
  searchExercises,
} from "../../../core/services/exercise-library.service";
import { searchBundles } from "../../../core/services/exercise-bundle.service";
import type { Equipment, ExerciseBundle, ExerciseTemplate, MuscleGroup } from "../../../core/models/workout.model";
import { Select } from "../../../components/Select";
import { ZoomableThumbnail } from "../../../components/ZoomableThumbnail";
import { colors, fonts } from "../../../core/theme/tokens";

const MUSCLE_OPTIONS = ALL_MUSCLE_GROUPS.map((m) => ({ value: m, label: m }));
const EQUIPMENT_OPTIONS = ALL_EQUIPMENT.map((eq) => ({ value: eq, label: eq }));

const searchInputStyle = {
  backgroundColor: colors.surface,
  borderRadius: 10,
  paddingHorizontal: 14,
  paddingVertical: 10,
  color: colors.text,
  fontFamily: fonts.body,
} as const;

export default function ExerciseLibrary() {
  const [activeTab, setActiveTab] = useState<"exercises" | "bundles">("exercises");
  const { isAdmin } = useAuth();

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
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 16 }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
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
        {isAdmin ? (
          <Link href={activeTab === "exercises" ? "/(tabs)/exercises/new" : "/(tabs)/exercises/bundles/new"} asChild>
            <Pressable style={{ backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 }}>
              <Text style={{ color: colors.background, fontFamily: fonts.bodySemiBold, fontSize: 12 }}>
                + {activeTab === "exercises" ? "Exercise" : "Bundle"}
              </Text>
            </Pressable>
          </Link>
        ) : null}
      </View>

      {activeTab === "exercises" ? (
        <FlatList
          key="exercises-list"
          data={filteredExercises}
          keyExtractor={(e) => e.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={{ marginBottom: 12, gap: 10 }}>
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search exercises..."
                placeholderTextColor={colors.textMuted}
                style={searchInputStyle}
              />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Select label="Muscle Group" value={selectedMuscle} placeholder="All Muscles" options={MUSCLE_OPTIONS} onChange={setSelectedMuscle} />
                <Select label="Equipment" value={selectedEquipment} placeholder="All Equipment" options={EQUIPMENT_OPTIONS} onChange={setSelectedEquipment} />
              </View>
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
          key="bundles-list"
          data={filteredBundles}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={{ marginBottom: 12, gap: 10 }}>
              <TextInput
                value={bundleSearchQuery}
                onChangeText={setBundleSearchQuery}
                placeholder="Search bundles..."
                placeholderTextColor={colors.textMuted}
                style={searchInputStyle}
              />
              <Select label="Muscle Group" value={selectedBundleMuscle} placeholder="All Muscles" options={MUSCLE_OPTIONS} onChange={setSelectedBundleMuscle} />
            </View>
          }
          ListEmptyComponent={
            <Text style={{ color: colors.textMuted, fontFamily: fonts.body, textAlign: "center", marginTop: 40 }}>
              No bundles match your search. A bundle groups a main exercise with its alternates for reuse across programs.
            </Text>
          }
          renderItem={({ item }) => <BundleCard bundle={item} exercises={exercises} />}
        />
      )}
    </View>
  );
}

// Firestore data isn't guaranteed to match the TS model exactly (e.g. bundles created outside
// the normal form flow) — guard against a missing/null alternativeExerciseIds instead of
// trusting the type, which previously crashed this screen to a blank white screen in the
// production preview build (no red-box overlay there to surface the TypeError).
function BundleCard({ bundle, exercises }: { bundle: ExerciseBundle; exercises: ExerciseTemplate[] }) {
  const main = getExerciseById(exercises, bundle.mainExerciseId);
  const alternativeIds = bundle.alternativeExerciseIds ?? [];
  const { isAdmin } = useAuth();

  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 14, gap: 10 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 15, flex: 1 }}>{bundle.name}</Text>
        {isAdmin ? (
          <Pressable onPress={() => router.push({ pathname: "/(tabs)/exercises/bundles/[id]/edit", params: { id: bundle.id } })}>
            <Text style={{ color: colors.primary, fontFamily: fonts.body, fontSize: 12 }}>Edit</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {main?.imageUrl ? (
          <ZoomableThumbnail uri={main.imageUrl} alt={main.name} style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: colors.text }} />
        ) : null}
        <Text style={{ color: colors.text, fontFamily: fonts.body, fontSize: 13 }}>{main?.name ?? "Unknown exercise"}</Text>
      </View>
      {alternativeIds.length > 0 ? (
        <View style={{ gap: 6, borderTopWidth: 1, borderTopColor: colors.secondary, paddingTop: 10 }}>
          <Text style={{ color: colors.textMuted, fontFamily: fonts.bodySemiBold, fontSize: 10, textTransform: "uppercase" }}>
            Alternatives
          </Text>
          {alternativeIds.map((altId) => {
            const alt = getExerciseById(exercises, altId);
            return (
              <View key={altId} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {alt?.imageUrl ? (
                  <ZoomableThumbnail uri={alt.imageUrl} alt={alt.name} style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: colors.text }} />
                ) : null}
                <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 12 }}>{alt?.name ?? "Unknown exercise"}</Text>
              </View>
            );
          })}
        </View>
      ) : null}
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
        <ZoomableThumbnail
          uri={exercise.imageUrl}
          alt={exercise.name}
          style={{ width: "100%", height: 90, borderRadius: 8, backgroundColor: colors.text }}
          resizeMode="contain"
        />
      ) : null}
      <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 13 }} numberOfLines={2}>
        {exercise.name}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
        {(exercise.primaryMuscles ?? []).slice(0, 2).map((m) => (
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
