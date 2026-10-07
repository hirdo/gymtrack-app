// RN port of gymtrack-web's ExercisePickerModalComponent — a full-screen modal to search/filter
// the exercise library and pick one exercise (single mode) or several (multiple mode, used for
// "alternative exercises", capped at maxSelect).
import { useEffect, useMemo, useState } from "react";
import { FlatList, Modal, Pressable, Text, TextInput, View } from "react-native";
import { useExercises } from "../hooks/useExercises";
import {
  ALL_EQUIPMENT,
  ALL_MUSCLE_GROUPS,
  searchExercises,
} from "../core/services/exercise-library.service";
import type { Equipment, ExerciseTemplate, MuscleGroup } from "../core/models/workout.model";
import { Select } from "./Select";
import { ZoomableThumbnail } from "./ZoomableThumbnail";
import { colors, fonts } from "../core/theme/tokens";

const MUSCLE_OPTIONS = ALL_MUSCLE_GROUPS.map((m) => ({ value: m, label: m }));
const EQUIPMENT_OPTIONS = ALL_EQUIPMENT.map((eq) => ({ value: eq, label: eq }));

interface ExercisePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (exercise: ExerciseTemplate) => void;
  multiple?: boolean;
  maxSelect?: number;
  excludeIds?: string[];
  preselectedIds?: string[];
  defaultMuscle?: MuscleGroup | null;
  onSelectMultiple?: (exercises: ExerciseTemplate[]) => void;
}

export function ExercisePickerModal({
  visible,
  onClose,
  onSelect,
  multiple = false,
  maxSelect = 5,
  excludeIds = [],
  preselectedIds = [],
  defaultMuscle = null,
  onSelectMultiple,
}: ExercisePickerModalProps) {
  const { exercises } = useExercises();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | "">("");
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | "">("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting filter/selection state when the modal transitions open, not a render-time derivation
      setSearchQuery("");
      setSelectedMuscle(defaultMuscle ?? "");
      setSelectedEquipment("");
      setSelectedIds(multiple ? preselectedIds : []);
    }
    // Reset only when the modal transitions open, mirroring the web version's ngOnChanges(open) —
    // not on every preselectedIds/defaultMuscle identity change while already open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const filteredExercises = useMemo(() => {
    let results = searchExercises(exercises, searchQuery);
    if (selectedMuscle) results = results.filter((e) => e.primaryMuscles.includes(selectedMuscle));
    if (selectedEquipment) results = results.filter((e) => e.equipment === selectedEquipment);
    if (excludeIds.length > 0) results = results.filter((e) => !excludeIds.includes(e.id));
    return results;
  }, [exercises, searchQuery, selectedMuscle, selectedEquipment, excludeIds]);

  function handlePress(exercise: ExerciseTemplate) {
    if (!multiple) {
      onSelect(exercise);
      onClose();
      return;
    }
    setSelectedIds((ids) => {
      if (ids.includes(exercise.id)) return ids.filter((id) => id !== exercise.id);
      if (ids.length >= maxSelect) return ids;
      return [...ids, exercise.id];
    });
  }

  function handleConfirmMultiple() {
    const chosen = exercises.filter((e) => selectedIds.includes(e.id));
    onSelectMultiple?.(chosen);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 50 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 }}>
          <Text style={{ color: colors.text, fontFamily: fonts.heading, fontSize: 20, textTransform: "uppercase" }}>
            {multiple ? `Alternatives (${selectedIds.length}/${maxSelect})` : "Choose Exercise"}
          </Text>
          <Pressable onPress={onClose} style={{ padding: 4 }}>
            <Text style={{ color: colors.textMuted, fontSize: 20 }}>✕</Text>
          </Pressable>
        </View>

        <FlatList
          key={multiple ? "picker-multi" : "picker-single"}
          data={filteredExercises}
          keyExtractor={(e) => e.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={{ padding: 16, paddingBottom: multiple ? 90 : 16, gap: 12 }}
          keyboardShouldPersistTaps="handled"
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
          renderItem={({ item }) => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <Pressable
                onPress={() => handlePress(item)}
                style={{
                  flex: 1,
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  padding: 12,
                  gap: 8,
                  borderWidth: isSelected ? 2 : 0,
                  borderColor: colors.primary,
                }}
              >
                {item.imageUrl ? (
                  <ZoomableThumbnail
                    uri={item.imageUrl}
                    alt={item.name}
                    style={{ width: "100%", height: 80, borderRadius: 8, backgroundColor: colors.text }}
                    resizeMode="contain"
                  />
                ) : null}
                <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 13 }} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 11, textTransform: "capitalize" }}>
                  {item.equipment}
                </Text>
                {isSelected ? (
                  <Text style={{ color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11, position: "absolute", top: 8, right: 8 }}>✓</Text>
                ) : null}
              </Pressable>
            );
          }}
        />

        {multiple ? (
          <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.secondary }}>
            <Pressable
              disabled={selectedIds.length === 0}
              onPress={handleConfirmMultiple}
              style={{ backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: "center", opacity: selectedIds.length === 0 ? 0.5 : 1 }}
            >
              <Text style={{ color: colors.background, fontFamily: fonts.bodySemiBold, fontSize: 15 }}>
                Confirm ({selectedIds.length})
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
