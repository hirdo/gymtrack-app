// RN port of gymtrack-web's ExerciseCreateComponent (admin-only create/edit for the exercise
// library). The one deferred-from-Phase-2 CRUD screen this migration plan promised for the
// Admin phase.
import { useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useAuthStore } from "../core/auth/authStore";
import { addExercise, updateExercise, ALL_EQUIPMENT, ALL_MUSCLE_GROUPS } from "../core/services/exercise-library.service";
import { uploadImage } from "../core/services/cloudinary.service";
import type { Equipment, ExerciseTemplate, ExerciseTrackingType, MuscleGroup, TimeUnit, WorkoutCategory } from "../core/models/workout.model";
import { Select } from "./Select";
import { colors, fonts } from "../core/theme/tokens";

const CATEGORY_OPTIONS: { value: WorkoutCategory; label: string }[] = [
  { value: "strength", label: "Strength" },
  { value: "cardio", label: "Cardio" },
  { value: "flexibility", label: "Flexibility" },
  { value: "hiit", label: "HIIT" },
  { value: "custom", label: "Custom" },
];

const TRACKING_OPTIONS: { value: ExerciseTrackingType; label: string }[] = [
  { value: "reps", label: "Sets x Reps x Weight" },
  { value: "reps_only", label: "Sets x Reps" },
  { value: "duration", label: "Sets x Duration" },
];

const EQUIPMENT_OPTIONS = ALL_EQUIPMENT.map((e) => ({ value: e, label: e }));

interface ExerciseFormProps {
  editingExercise?: ExerciseTemplate;
}

export function ExerciseForm({ editingExercise }: ExerciseFormProps) {
  const userId = useAuthStore((s) => s.userId);
  const isEditMode = !!editingExercise;

  const [name, setName] = useState(editingExercise?.name ?? "");
  const [category, setCategory] = useState<WorkoutCategory>(editingExercise?.category ?? "strength");
  const [equipment, setEquipment] = useState<Equipment>(editingExercise?.equipment ?? "barbell");
  const [trackingType, setTrackingType] = useState<ExerciseTrackingType>(editingExercise?.trackingType ?? "reps");
  const [selectedMuscles, setSelectedMuscles] = useState<Set<MuscleGroup>>(new Set(editingExercise?.primaryMuscles ?? []));
  const [recommendedReps, setRecommendedReps] = useState<number | null>(editingExercise?.recommendedReps ?? null);
  const [recommendedWeight, setRecommendedWeight] = useState<number | null>(editingExercise?.recommendedWeight ?? null);
  const [recommendedDuration, setRecommendedDuration] = useState<number | null>(
    editingExercise?.recommendedDuration != null
      ? editingExercise.recommendedDurationUnit === "sec"
        ? editingExercise.recommendedDuration
        : editingExercise.recommendedDuration / 60
      : null
  );
  const [recommendedDurationUnit, setRecommendedDurationUnit] = useState<TimeUnit>(editingExercise?.recommendedDurationUnit ?? "min");
  const [instructions, setInstructions] = useState(editingExercise?.instructions ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(editingExercise?.imageUrl ?? null);
  const [pickedImage, setPickedImage] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const canSubmit = name.trim().length > 0 && selectedMuscles.size > 0 && !submitting;

  function toggleMuscle(muscle: MuscleGroup) {
    setSelectedMuscles((prev) => {
      const next = new Set(prev);
      if (next.has(muscle)) next.delete(muscle);
      else next.add(muscle);
      return next;
    });
  }

  async function handlePickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setPickedImage({ uri: asset.uri, name: asset.fileName ?? "exercise.jpg", type: asset.mimeType ?? "image/jpeg" });
    setImageUrl(asset.uri);
  }

  async function handleSubmit() {
    if (!userId || !canSubmit) return;
    setSubmitting(true);
    setUploadError(null);
    try {
      const data = {
        name: name.trim(),
        category,
        equipment,
        trackingType,
        primaryMuscles: Array.from(selectedMuscles),
        recommendedReps: trackingType !== "duration" ? recommendedReps ?? undefined : undefined,
        recommendedWeight: trackingType === "reps" ? recommendedWeight ?? undefined : undefined,
        recommendedDuration:
          trackingType === "duration" && recommendedDuration != null
            ? Math.round(recommendedDurationUnit === "sec" ? recommendedDuration : recommendedDuration * 60)
            : undefined,
        recommendedDurationUnit: trackingType === "duration" && recommendedDuration != null ? recommendedDurationUnit : undefined,
        instructions: instructions.trim() || undefined,
      };

      let exerciseId: string;
      if (isEditMode && editingExercise) {
        exerciseId = editingExercise.id;
        await updateExercise(exerciseId, data);
      } else {
        const exercise = await addExercise(data, userId);
        exerciseId = exercise.id;
      }

      if (pickedImage) {
        try {
          const uploadedUrl = await uploadImage(pickedImage);
          await updateExercise(exerciseId, { imageUrl: uploadedUrl });
        } catch (e) {
          setUploadError(e instanceof Error ? e.message : "Image upload failed.");
          return;
        }
      }

      router.replace({ pathname: "/(tabs)/exercises/[id]", params: { id: exerciseId } });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Pressable onPress={handlePickImage} style={{ alignSelf: "center" }}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={{ width: 120, height: 120, borderRadius: 12, backgroundColor: colors.text }} resizeMode="contain" />
        ) : (
          <View style={{ width: 120, height: 120, borderRadius: 12, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 12 }}>Add Photo</Text>
          </View>
        )}
      </Pressable>
      {uploadError ? <Text style={{ color: colors.error, fontFamily: fonts.body, fontSize: 12, textAlign: "center" }}>{uploadError}</Text> : null}

      <View style={{ gap: 6 }}>
        <Text style={{ color: colors.textMuted, fontFamily: fonts.bodySemiBold, fontSize: 11, textTransform: "uppercase" }}>Exercise Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Barbell Bench Press"
          placeholderTextColor={colors.textMuted}
          style={{ backgroundColor: colors.surface, color: colors.text, fontFamily: fonts.body, borderRadius: 10, padding: 12 }}
        />
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Select label="Category" value={category} placeholder="Category" options={CATEGORY_OPTIONS} onChange={(v) => v && setCategory(v)} />
        </View>
        <View style={{ flex: 1 }}>
          <Select label="Equipment" value={equipment} placeholder="Equipment" options={EQUIPMENT_OPTIONS} onChange={(v) => v && setEquipment(v)} />
        </View>
      </View>

      <Select label="Tracking Type" value={trackingType} placeholder="Tracking Type" options={TRACKING_OPTIONS} onChange={(v) => v && setTrackingType(v)} />

      <View style={{ gap: 8 }}>
        <Text style={{ color: colors.textMuted, fontFamily: fonts.bodySemiBold, fontSize: 11, textTransform: "uppercase" }}>
          Primary Muscles {selectedMuscles.size === 0 ? "(select at least one)" : ""}
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {ALL_MUSCLE_GROUPS.map((m) => {
            const active = selectedMuscles.has(m);
            return (
              <Pressable
                key={m}
                onPress={() => toggleMuscle(m)}
                style={{ backgroundColor: active ? colors.primary : colors.surface, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 }}
              >
                <Text style={{ color: active ? colors.background : colors.textMuted, fontFamily: fonts.bodySemiBold, fontSize: 12, textTransform: "uppercase" }}>{m}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {trackingType === "duration" ? (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <NumField label={`Recommended Duration (${recommendedDurationUnit})`} value={recommendedDuration} onChange={setRecommendedDuration} onLabelPress={() => setRecommendedDurationUnit((u) => (u === "sec" ? "min" : "sec"))} />
        </View>
      ) : (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <NumField label="Recommended Reps" value={recommendedReps} onChange={setRecommendedReps} />
          {trackingType === "reps" ? <NumField label="Recommended Weight (kg)" value={recommendedWeight} onChange={setRecommendedWeight} /> : null}
        </View>
      )}

      <View style={{ gap: 6 }}>
        <Text style={{ color: colors.textMuted, fontFamily: fonts.bodySemiBold, fontSize: 11, textTransform: "uppercase" }}>Instructions (optional)</Text>
        <TextInput
          value={instructions}
          onChangeText={setInstructions}
          multiline
          placeholder="Step-by-step form cues..."
          placeholderTextColor={colors.textMuted}
          style={{ backgroundColor: colors.surface, color: colors.text, fontFamily: fonts.body, borderRadius: 10, padding: 12, minHeight: 90 }}
        />
      </View>

      <View style={{ flexDirection: "row", gap: 10, marginBottom: 24 }}>
        <Pressable
          disabled={!canSubmit}
          onPress={handleSubmit}
          style={{ flex: 1, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: "center", opacity: canSubmit ? 1 : 0.5 }}
        >
          {submitting ? <ActivityIndicator color={colors.background} /> : <Text style={{ color: colors.background, fontFamily: fonts.bodySemiBold, fontSize: 15 }}>{isEditMode ? "Save Changes" : "Create Exercise"}</Text>}
        </Pressable>
        <Pressable disabled={submitting} onPress={() => router.back()} style={{ backgroundColor: colors.surface, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 20, alignItems: "center" }}>
          <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 15 }}>Cancel</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function NumField({ label, value, onChange, onLabelPress }: { label: string; value: number | null; onChange: (v: number | null) => void; onLabelPress?: () => void }) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Pressable onPress={onLabelPress} disabled={!onLabelPress}>
        <Text style={{ color: onLabelPress ? colors.primary : colors.textMuted, fontFamily: fonts.body, fontSize: 11, textTransform: "uppercase" }}>{label}</Text>
      </Pressable>
      <TextInput
        value={value === null ? "" : String(value)}
        onChangeText={(t) => onChange(t === "" ? null : Number(t))}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor={colors.textMuted}
        style={{ backgroundColor: colors.surface, borderRadius: 8, paddingVertical: 10, textAlign: "center", color: colors.text, fontFamily: fonts.heading, fontSize: 16 }}
      />
    </View>
  );
}
