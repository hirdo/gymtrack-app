// RN port of gymtrack-web's BundlePickerModalComponent — lets a program's exercise row be
// filled from a saved bundle (main exercise + its alternates) in one tap, instead of picking
// the main exercise and each alternate separately.
import { useEffect, useMemo, useState } from "react";
import { FlatList, Modal, Pressable, Text, TextInput, View } from "react-native";
import { useExercises } from "../hooks/useExercises";
import { useExerciseBundles } from "../hooks/useExerciseBundles";
import { ALL_MUSCLE_GROUPS, getExerciseById } from "../core/services/exercise-library.service";
import { searchBundles } from "../core/services/exercise-bundle.service";
import type { ExerciseBundle, MuscleGroup } from "../core/models/workout.model";
import { Select } from "./Select";
import { ZoomableThumbnail } from "./ZoomableThumbnail";
import { colors, fonts } from "../core/theme/tokens";

const MUSCLE_OPTIONS = ALL_MUSCLE_GROUPS.map((m) => ({ value: m, label: m }));

interface BundlePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (bundle: ExerciseBundle) => void;
}

export function BundlePickerModal({ visible, onClose, onSelect }: BundlePickerModalProps) {
  const { bundles } = useExerciseBundles();
  const { exercises } = useExercises();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | "">("");

  useEffect(() => {
    if (visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting filter state when the modal transitions open, not a render-time derivation
      setSearchQuery("");
      setSelectedMuscle("");
    }
  }, [visible]);

  const filteredBundles = useMemo(() => {
    let results = searchBundles(bundles, searchQuery);
    if (selectedMuscle) {
      results = results.filter((b) => (getExerciseById(exercises, b.mainExerciseId)?.primaryMuscles ?? []).includes(selectedMuscle));
    }
    return results;
  }, [bundles, searchQuery, selectedMuscle, exercises]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 50 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 }}>
          <Text style={{ color: colors.text, fontFamily: fonts.heading, fontSize: 20, textTransform: "uppercase" }}>Choose Bundle</Text>
          <Pressable onPress={onClose} style={{ padding: 4 }}>
            <Text style={{ color: colors.textMuted, fontSize: 20 }}>✕</Text>
          </Pressable>
        </View>

        <FlatList
          data={filteredBundles}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={{ marginBottom: 12, gap: 10 }}>
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search bundles..."
                placeholderTextColor={colors.textMuted}
                style={{ backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: colors.text, fontFamily: fonts.body }}
              />
              <Select label="Muscle Group" value={selectedMuscle} placeholder="All Muscles" options={MUSCLE_OPTIONS} onChange={setSelectedMuscle} />
            </View>
          }
          ListEmptyComponent={
            <Text style={{ color: colors.textMuted, fontFamily: fonts.body, textAlign: "center", marginTop: 40 }}>
              No bundles match your search.
            </Text>
          }
          renderItem={({ item: bundle }) => {
            const main = getExerciseById(exercises, bundle.mainExerciseId);
            return (
              <Pressable
                onPress={() => {
                  onSelect(bundle);
                  onClose();
                }}
                style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.surface, borderRadius: 12, padding: 12 }}
              >
                {main?.imageUrl ? (
                  <ZoomableThumbnail uri={main.imageUrl} alt={bundle.name} style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: colors.text }} />
                ) : null}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 14 }}>{bundle.name}</Text>
                  <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 12 }} numberOfLines={1}>
                    {main?.name ?? "Unknown exercise"}
                    {bundle.alternativeExerciseIds.length > 0
                      ? ` · ${bundle.alternativeExerciseIds.length} alternate${bundle.alternativeExerciseIds.length > 1 ? "s" : ""}`
                      : ""}
                  </Text>
                </View>
                <Text style={{ color: colors.textMuted }}>›</Text>
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}
