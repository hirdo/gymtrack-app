// RN port of gymtrack-web's ExerciseBundleCreateComponent (admin-only).
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "../core/auth/authStore";
import { useExercises } from "../hooks/useExercises";
import { addBundle, updateBundle } from "../core/services/exercise-bundle.service";
import { getExerciseById } from "../core/services/exercise-library.service";
import type { ExerciseBundle } from "../core/models/workout.model";
import { ExercisePickerModal } from "./ExercisePickerModal";
import { ZoomableThumbnail } from "./ZoomableThumbnail";
import { colors, fonts } from "../core/theme/tokens";

interface BundleFormProps {
  editingBundle?: ExerciseBundle;
}

export function BundleForm({ editingBundle }: BundleFormProps) {
  const userId = useAuthStore((s) => s.userId);
  const { exercises } = useExercises();
  const isEditMode = !!editingBundle;

  const [name, setName] = useState(editingBundle?.name ?? "");
  const [mainExerciseId, setMainExerciseId] = useState<string | null>(editingBundle?.mainExerciseId ?? null);
  const [alternativeIds, setAlternativeIds] = useState<string[]>(editingBundle?.alternativeExerciseIds ?? []);
  const [mainPickerOpen, setMainPickerOpen] = useState(false);
  const [altPickerOpen, setAltPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const mainExercise = mainExerciseId ? getExerciseById(exercises, mainExerciseId) : undefined;
  const canSubmit = name.trim().length > 0 && !!mainExerciseId && !submitting;

  async function handleSubmit() {
    if (!userId || !canSubmit || !mainExerciseId) return;
    setSubmitting(true);
    try {
      if (isEditMode && editingBundle) {
        await updateBundle(editingBundle.id, { name: name.trim(), mainExerciseId, alternativeExerciseIds: alternativeIds });
        router.back();
      } else {
        await addBundle({ name: name.trim(), mainExerciseId, alternativeExerciseIds: alternativeIds }, userId);
        router.replace({ pathname: "/(tabs)/exercises", params: { tab: "bundles" } });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 16 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ gap: 6 }}>
        <Text style={{ color: colors.textMuted, fontFamily: fonts.bodySemiBold, fontSize: 11, textTransform: "uppercase" }}>Bundle Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Chest Press Variations"
          placeholderTextColor={colors.textMuted}
          style={{ backgroundColor: colors.surface, color: colors.text, fontFamily: fonts.body, borderRadius: 10, padding: 12 }}
        />
      </View>

      <View style={{ gap: 6 }}>
        <Text style={{ color: colors.textMuted, fontFamily: fonts.bodySemiBold, fontSize: 11, textTransform: "uppercase" }}>Main Exercise</Text>
        <Pressable
          onPress={() => setMainPickerOpen(true)}
          style={{ backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 10 }}
        >
          {mainExercise?.imageUrl ? (
            <ZoomableThumbnail uri={mainExercise.imageUrl} alt={mainExercise.name} style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: colors.text }} />
          ) : null}
          <Text style={{ flex: 1, color: mainExercise ? colors.text : colors.textMuted, fontFamily: fonts.body, fontSize: 14 }}>
            {mainExercise?.name ?? "Choose main exercise…"}
          </Text>
          <Text style={{ color: colors.textMuted }}>▾</Text>
        </Pressable>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={{ color: colors.textMuted, fontFamily: fonts.bodySemiBold, fontSize: 11, textTransform: "uppercase" }}>Alternatives (max 5)</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {alternativeIds.map((altId) => {
            const alt = getExerciseById(exercises, altId);
            return (
              <View key={altId} style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.surface, borderRadius: 8, paddingLeft: 4, paddingRight: 8, paddingVertical: 4 }}>
                {alt?.imageUrl ? (
                  <ZoomableThumbnail uri={alt.imageUrl} alt={alt.name} style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: colors.text }} />
                ) : null}
                <Text style={{ color: colors.text, fontFamily: fonts.body, fontSize: 12 }}>{alt?.name ?? "?"}</Text>
                <Pressable onPress={() => setAlternativeIds((prev) => prev.filter((a) => a !== altId))}>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>✕</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
        {alternativeIds.length < 5 && mainExerciseId ? (
          <Pressable onPress={() => setAltPickerOpen(true)}>
            <Text style={{ color: colors.primary, fontFamily: fonts.body, fontSize: 13 }}>+ Add Alternative</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
        <Pressable
          disabled={!canSubmit}
          onPress={handleSubmit}
          style={{ flex: 1, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: "center", opacity: canSubmit ? 1 : 0.5 }}
        >
          {submitting ? <ActivityIndicator color={colors.background} /> : <Text style={{ color: colors.background, fontFamily: fonts.bodySemiBold, fontSize: 15 }}>{isEditMode ? "Save Changes" : "Create Bundle"}</Text>}
        </Pressable>
        <Pressable disabled={submitting} onPress={() => router.back()} style={{ backgroundColor: colors.surface, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 20, alignItems: "center" }}>
          <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 15 }}>Cancel</Text>
        </Pressable>
      </View>

      <ExercisePickerModal
        visible={mainPickerOpen}
        onClose={() => setMainPickerOpen(false)}
        onSelect={(ex) => {
          setMainExerciseId(ex.id);
          setAlternativeIds([]);
        }}
      />

      <ExercisePickerModal
        visible={altPickerOpen}
        onClose={() => setAltPickerOpen(false)}
        multiple
        maxSelect={5}
        excludeIds={mainExerciseId ? [mainExerciseId] : []}
        preselectedIds={alternativeIds}
        defaultMuscle={mainExercise?.primaryMuscles?.[0] ?? null}
        onSelect={() => {}}
        onSelectMultiple={(chosen) => setAlternativeIds(chosen.map((e) => e.id))}
      />
    </ScrollView>
  );
}
