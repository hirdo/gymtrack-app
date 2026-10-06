// RN port of gymtrack-web's ProgramCreateComponent (admin-only). Real drag-and-drop for both
// days and exercises-within-a-day, each via its own react-native-draggable-flatlist instance —
// nesting two DraggableFlatLists doesn't work, so day reordering gets its own full-screen modal
// instead of being a second list nested inside the exercise list.
//
// Scope cut vs. web: "duplicate a range of days" (an admin power-tool for cloning e.g. days 1-3
// as 4-6) is left out; single-day duplicate is kept.
import { useMemo, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from "react-native-draggable-flatlist";
import { router } from "expo-router";
import { useExercises } from "../hooks/useExercises";
import { useAuthStore } from "../core/auth/authStore";
import { createProgram, updateProgram } from "../core/services/program.service";
import { getExerciseById } from "../core/services/exercise-library.service";
import { uid } from "../core/utils/id.util";
import { PROGRAM_DIFFICULTIES } from "../core/models/workout.model";
import type { ExerciseTemplate, ExerciseTrackingType, ProgramDay, ProgramDifficulty, TimeUnit, TrainingProgram } from "../core/models/workout.model";
import { ExercisePickerModal } from "./ExercisePickerModal";
import { Select } from "./Select";
import { colors, fonts } from "../core/theme/tokens";

const DIFFICULTY_OPTIONS = PROGRAM_DIFFICULTIES.map((d) => ({ value: d.value, label: `${"★".repeat(d.stars)} ${d.label}` }));

interface ProgramExerciseRow {
  rowId: string;
  exerciseId: string;
  exerciseName: string;
  trackingType: ExerciseTrackingType;
  targetSets: number;
  targetReps: number | null;
  targetWeight: number | null;
  targetDuration: number | null;
  targetDurationUnit: TimeUnit;
  restTime: number | null;
  restTimeUnit: TimeUnit;
  alternativeExerciseIds: string[];
}

interface DayRow {
  dayKey: string;
  name: string;
  exercises: ProgramExerciseRow[];
}

function emptyExerciseRow(): ProgramExerciseRow {
  return {
    rowId: uid(),
    exerciseId: uid(),
    exerciseName: "",
    trackingType: "reps",
    targetSets: 3,
    targetReps: 12,
    targetWeight: null,
    targetDuration: null,
    targetDurationUnit: "min",
    restTime: 2,
    restTimeUnit: "min",
    alternativeExerciseIds: [],
  };
}

function emptyDay(): DayRow {
  return { dayKey: uid(), name: "", exercises: [emptyExerciseRow()] };
}

function dayRowFromProgramDay(day: ProgramDay): DayRow {
  return {
    dayKey: uid(),
    name: day.name,
    exercises: day.exercises.map((ex) => {
      const durationUnit: TimeUnit = ex.targetDurationUnit ?? "min";
      const restTimeUnit: TimeUnit = ex.restTimeUnit ?? "min";
      return {
        rowId: uid(),
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        trackingType: ex.trackingType ?? "reps",
        targetSets: ex.targetSets,
        targetReps: ex.targetReps ?? null,
        targetWeight: ex.targetWeight ?? null,
        targetDuration: ex.targetDuration != null ? (durationUnit === "sec" ? ex.targetDuration : ex.targetDuration / 60) : null,
        targetDurationUnit: durationUnit,
        restTime: ex.restTime != null ? (restTimeUnit === "sec" ? ex.restTime : ex.restTime / 60) : null,
        restTimeUnit,
        alternativeExerciseIds: ex.alternativeExerciseIds ?? [],
      };
    }),
  };
}

interface ProgramFormProps {
  editingProgram?: TrainingProgram;
}

export function ProgramForm({ editingProgram }: ProgramFormProps) {
  const { exercises: libraryExercises } = useExercises();
  const userId = useAuthStore((s) => s.userId);
  const isEditMode = !!editingProgram;

  const [name, setName] = useState(editingProgram?.name ?? "");
  const [description, setDescription] = useState(editingProgram?.description ?? "");
  const [difficulty, setDifficulty] = useState<ProgramDifficulty>(editingProgram?.difficulty ?? "intermediate");
  const [sessionsPerWeek, setSessionsPerWeek] = useState(editingProgram?.sessionsPerWeek ?? 4);
  const [days, setDays] = useState<DayRow[]>(() =>
    editingProgram && editingProgram.days.length > 0 ? editingProgram.days.map(dayRowFromProgramDay) : [emptyDay()]
  );
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [reorderDaysOpen, setReorderDaysOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [pickerTarget, setPickerTarget] = useState<string | null>(null);
  const [altPickerTarget, setAltPickerTarget] = useState<string | null>(null);

  const currentDay = days[currentDayIndex] ?? days[0];

  const canSubmit = name.trim().length > 0 && days.every((d) => d.name.trim().length > 0 && d.exercises.every((e) => e.exerciseName.trim().length > 0)) && !submitting;

  function updateDay(dayKey: string, patch: Partial<DayRow>) {
    setDays((prev) => prev.map((d) => (d.dayKey === dayKey ? { ...d, ...patch } : d)));
  }

  function updateExerciseRow(rowId: string, patch: Partial<ProgramExerciseRow>) {
    setDays((prev) => prev.map((d) => ({ ...d, exercises: d.exercises.map((e) => (e.rowId === rowId ? { ...e, ...patch } : e)) })));
  }

  function addDay() {
    setDays((prev) => [...prev, emptyDay()]);
    setCurrentDayIndex(days.length);
  }

  function removeDay(index: number) {
    if (days.length <= 1) return;
    setDays((prev) => prev.filter((_, i) => i !== index));
    setCurrentDayIndex((i) => Math.max(0, Math.min(i, days.length - 2)));
  }

  function duplicateDay(index: number) {
    const source = days[index];
    const clone: DayRow = {
      dayKey: uid(),
      name: source.name,
      exercises: source.exercises.map((e) => ({ ...e, rowId: uid() })),
    };
    setDays((prev) => [...prev, clone]);
  }

  function addExerciseToCurrentDay() {
    updateDay(currentDay.dayKey, { exercises: [...currentDay.exercises, emptyExerciseRow()] });
  }

  function removeExerciseRow(rowId: string) {
    if (currentDay.exercises.length <= 1) return;
    updateDay(currentDay.dayKey, { exercises: currentDay.exercises.filter((e) => e.rowId !== rowId) });
  }

  function toggleUnit(row: ProgramExerciseRow, field: "duration" | "rest") {
    if (field === "duration") {
      const newUnit: TimeUnit = row.targetDurationUnit === "sec" ? "min" : "sec";
      const newValue = row.targetDuration != null ? (newUnit === "sec" ? row.targetDuration * 60 : row.targetDuration / 60) : row.targetDuration;
      updateExerciseRow(row.rowId, { targetDuration: newValue, targetDurationUnit: newUnit });
    } else {
      const newUnit: TimeUnit = row.restTimeUnit === "sec" ? "min" : "sec";
      const newValue = row.restTime != null ? (newUnit === "sec" ? row.restTime * 60 : row.restTime / 60) : row.restTime;
      updateExerciseRow(row.rowId, { restTime: newValue, restTimeUnit: newUnit });
    }
  }

  function applyPickedExercise(rowId: string, exercise: ExerciseTemplate) {
    const trackingType = exercise.trackingType ?? "reps";
    const durationUnit: TimeUnit = exercise.recommendedDurationUnit ?? "min";
    const restTimeUnit: TimeUnit = exercise.recommendedRestTimeUnit ?? "min";
    const targetDuration = exercise.recommendedDuration != null ? (durationUnit === "sec" ? exercise.recommendedDuration : exercise.recommendedDuration / 60) : null;
    const restTime = exercise.recommendedRestTime != null ? (restTimeUnit === "sec" ? exercise.recommendedRestTime : exercise.recommendedRestTime / 60) : null;

    if (trackingType === "duration") {
      updateExerciseRow(rowId, {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        trackingType,
        targetSets: 1,
        targetReps: null,
        targetWeight: null,
        targetDuration,
        targetDurationUnit: durationUnit,
        restTime,
        restTimeUnit,
        alternativeExerciseIds: [],
      });
    } else if (trackingType === "reps_only") {
      updateExerciseRow(rowId, {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        trackingType,
        targetReps: exercise.recommendedReps ?? 12,
        targetWeight: null,
        targetDuration: null,
        restTime,
        restTimeUnit,
        alternativeExerciseIds: [],
      });
    } else {
      updateExerciseRow(rowId, {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        trackingType,
        targetReps: exercise.recommendedReps ?? 12,
        targetWeight: exercise.recommendedWeight ?? null,
        targetDuration: null,
        restTime,
        restTimeUnit,
        alternativeExerciseIds: [],
      });
    }
  }

  const altPickerRow = currentDay.exercises.find((e) => e.rowId === altPickerTarget);
  const altDefaultMuscle = useMemo(() => {
    if (!altPickerRow?.exerciseId) return null;
    return getExerciseById(libraryExercises, altPickerRow.exerciseId)?.primaryMuscles?.[0] ?? null;
  }, [altPickerRow, libraryExercises]);

  async function handleSubmit() {
    if (!canSubmit) return;
    const builtDays: ProgramDay[] = days.map((d, dayNumber) => ({
      dayNumber,
      name: d.name.trim(),
      exercises: d.exercises.map((e) => ({
        exerciseId: e.exerciseId,
        exerciseName: e.exerciseName,
        trackingType: e.trackingType,
        targetSets: e.targetSets,
        targetReps: e.targetReps ?? undefined,
        targetWeight: e.targetWeight ?? undefined,
        targetDuration: e.targetDuration != null ? Math.round(e.targetDurationUnit === "sec" ? e.targetDuration : e.targetDuration * 60) : undefined,
        targetDurationUnit: e.targetDuration != null ? e.targetDurationUnit : undefined,
        restTime: e.restTime != null ? Math.round(e.restTimeUnit === "sec" ? e.restTime : e.restTime * 60) : undefined,
        restTimeUnit: e.restTime != null ? e.restTimeUnit : undefined,
        alternativeExerciseIds: e.alternativeExerciseIds.length > 0 ? e.alternativeExerciseIds : undefined,
      })),
    }));

    setSubmitting(true);
    try {
      if (isEditMode && editingProgram) {
        await updateProgram(editingProgram.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          difficulty,
          totalDays: builtDays.length,
          sessionsPerWeek,
          days: builtDays,
        });
        router.replace({ pathname: "/(tabs)/programs/[id]", params: { id: editingProgram.id } });
      } else {
        if (!userId) return;
        const program = await createProgram(
          {
            name: name.trim(),
            description: description.trim() || undefined,
            difficulty,
            totalDays: builtDays.length,
            sessionsPerWeek,
            days: builtDays,
            isActive: false,
            currentDay: 0,
            completedSessions: 0,
          },
          userId
        );
        router.replace({ pathname: "/(tabs)/programs/[id]", params: { id: program.id } });
      }
    } finally {
      setSubmitting(false);
    }
  }

  function renderExerciseRow({ item: row, drag, isActive }: RenderItemParams<ProgramExerciseRow>) {
    return (
      <ScaleDecorator>
        <View style={{ backgroundColor: isActive ? colors.secondary : colors.surface, borderRadius: 12, padding: 14, marginBottom: 12, gap: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Pressable onLongPress={drag} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ color: colors.textMuted, fontSize: 16 }}>☰</Text>
              <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 12 }}>Drag to reorder</Text>
            </Pressable>
            {currentDay.exercises.length > 1 ? (
              <Pressable onPress={() => removeExerciseRow(row.rowId)}>
                <Text style={{ color: colors.error, fontSize: 13 }}>Remove</Text>
              </Pressable>
            ) : null}
          </View>

          <Pressable
            onPress={() => setPickerTarget(row.rowId)}
            style={{ backgroundColor: colors.background, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 8 }}
          >
            <Text style={{ flex: 1, color: row.exerciseName ? colors.text : colors.textMuted, fontFamily: fonts.body, fontSize: 14 }} numberOfLines={1}>
              {row.exerciseName || "Choose exercise…"}
            </Text>
            <Text style={{ color: colors.textMuted }}>▾</Text>
          </Pressable>

          <View style={{ flexDirection: "row", gap: 10 }}>
            {row.trackingType === "duration" ? (
              <>
                <NumField label="Sets" value={row.targetSets} onChange={(v) => updateExerciseRow(row.rowId, { targetSets: v ?? 1 })} />
                <NumField label={`Duration (${row.targetDurationUnit})`} value={row.targetDuration} onChange={(v) => updateExerciseRow(row.rowId, { targetDuration: v })} onLabelPress={() => toggleUnit(row, "duration")} />
              </>
            ) : row.trackingType === "reps_only" ? (
              <>
                <NumField label="Sets" value={row.targetSets} onChange={(v) => updateExerciseRow(row.rowId, { targetSets: v ?? 1 })} />
                <NumField label="Reps" value={row.targetReps} onChange={(v) => updateExerciseRow(row.rowId, { targetReps: v })} />
              </>
            ) : (
              <>
                <NumField label="Sets" value={row.targetSets} onChange={(v) => updateExerciseRow(row.rowId, { targetSets: v ?? 1 })} />
                <NumField label="Reps" value={row.targetReps} onChange={(v) => updateExerciseRow(row.rowId, { targetReps: v })} />
                <NumField label="Weight" value={row.targetWeight} onChange={(v) => updateExerciseRow(row.rowId, { targetWeight: v })} />
              </>
            )}
          </View>
          <NumField label={`Rest (${row.restTimeUnit})`} value={row.restTime} onChange={(v) => updateExerciseRow(row.rowId, { restTime: v })} onLabelPress={() => toggleUnit(row, "rest")} />

          <View style={{ gap: 6 }}>
            <Text style={{ color: colors.textMuted, fontFamily: fonts.bodySemiBold, fontSize: 10, textTransform: "uppercase" }}>Alternatives</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {row.alternativeExerciseIds.map((altId) => {
                const alt = getExerciseById(libraryExercises, altId);
                return (
                  <View key={altId} style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.background, borderRadius: 8, paddingLeft: 4, paddingRight: 8, paddingVertical: 4 }}>
                    {alt?.imageUrl ? <Image source={{ uri: alt.imageUrl }} style={{ width: 22, height: 22, borderRadius: 5, backgroundColor: colors.text }} /> : null}
                    <Text style={{ color: colors.text, fontFamily: fonts.body, fontSize: 11 }}>{alt?.name ?? "?"}</Text>
                    <Pressable onPress={() => updateExerciseRow(row.rowId, { alternativeExerciseIds: row.alternativeExerciseIds.filter((a) => a !== altId) })}>
                      <Text style={{ color: colors.textMuted, fontSize: 11 }}>✕</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
            {row.alternativeExerciseIds.length < 5 ? (
              <Pressable onPress={() => setAltPickerTarget(row.rowId)}>
                <Text style={{ color: colors.primary, fontFamily: fonts.body, fontSize: 12 }}>+ Add Alternative</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </ScaleDecorator>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <DraggableFlatList
        data={currentDay.exercises}
        keyExtractor={(e) => e.rowId}
        onDragEnd={({ data }) => updateDay(currentDay.dayKey, { exercises: data })}
        renderItem={renderExerciseRow}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <View style={{ gap: 14, marginBottom: 16 }}>
            <View style={{ gap: 6 }}>
              <Text style={{ color: colors.textMuted, fontFamily: fonts.bodySemiBold, fontSize: 11, textTransform: "uppercase" }}>Program Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Strength Foundations"
                placeholderTextColor={colors.textMuted}
                style={{ backgroundColor: colors.surface, color: colors.text, fontFamily: fonts.body, borderRadius: 10, padding: 12 }}
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text style={{ color: colors.textMuted, fontFamily: fonts.bodySemiBold, fontSize: 11, textTransform: "uppercase" }}>Description (optional)</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                multiline
                placeholder="Brief description..."
                placeholderTextColor={colors.textMuted}
                style={{ backgroundColor: colors.surface, color: colors.text, fontFamily: fonts.body, borderRadius: 10, padding: 12, minHeight: 60 }}
              />
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Select label="Difficulty" value={difficulty} placeholder="Difficulty" options={DIFFICULTY_OPTIONS} onChange={(v) => v && setDifficulty(v)} />
              </View>
              <View style={{ flex: 1 }}>
                <NumField label="Sessions / Week" value={sessionsPerWeek} onChange={(v) => setSessionsPerWeek(v ?? 1)} />
              </View>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ color: colors.text, fontFamily: fonts.heading, fontSize: 18, textTransform: "uppercase" }}>Training Days</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable onPress={() => setReorderDaysOpen(true)} style={{ backgroundColor: colors.surface, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10 }}>
                  <Text style={{ color: colors.textMuted, fontFamily: fonts.bodySemiBold, fontSize: 12 }}>Reorder</Text>
                </Pressable>
                <Pressable onPress={addDay} style={{ backgroundColor: colors.surface, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10 }}>
                  <Text style={{ color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 12 }}>+ Add Day</Text>
                </Pressable>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {days.map((d, i) => (
                <Pressable
                  key={d.dayKey}
                  onPress={() => setCurrentDayIndex(i)}
                  style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, marginRight: 8, backgroundColor: i === currentDayIndex ? colors.primary : colors.surface }}
                >
                  <Text style={{ color: i === currentDayIndex ? colors.background : colors.textMuted, fontFamily: fonts.bodySemiBold, fontSize: 12 }}>
                    Day {i + 1}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
              <TextInput
                value={currentDay.name}
                onChangeText={(t) => updateDay(currentDay.dayKey, { name: t })}
                placeholder="Day name, e.g. Push"
                placeholderTextColor={colors.textMuted}
                style={{ flex: 1, backgroundColor: colors.surface, color: colors.text, fontFamily: fonts.body, borderRadius: 10, padding: 12 }}
              />
              <Pressable onPress={() => duplicateDay(currentDayIndex)} style={{ backgroundColor: colors.surface, borderRadius: 10, padding: 12 }}>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>Duplicate</Text>
              </Pressable>
              {days.length > 1 ? (
                <Pressable onPress={() => removeDay(currentDayIndex)} style={{ backgroundColor: colors.surface, borderRadius: 10, padding: 12 }}>
                  <Text style={{ color: colors.error, fontSize: 13 }}>Remove Day</Text>
                </Pressable>
              ) : null}
            </View>

            <Pressable onPress={addExerciseToCurrentDay} style={{ backgroundColor: colors.surface, borderRadius: 8, paddingVertical: 8, alignItems: "center" }}>
              <Text style={{ color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 13 }}>+ Add Exercise to Day {currentDayIndex + 1}</Text>
            </Pressable>
          </View>
        }
        ListFooterComponent={
          <View style={{ flexDirection: "row", gap: 10, marginTop: 8, marginBottom: 24 }}>
            <Pressable
              disabled={!canSubmit}
              onPress={handleSubmit}
              style={{ flex: 1, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: "center", opacity: canSubmit ? 1 : 0.5 }}
            >
              {submitting ? <ActivityIndicator color={colors.background} /> : <Text style={{ color: colors.background, fontFamily: fonts.bodySemiBold, fontSize: 15 }}>{isEditMode ? "Save Changes" : "Create Program"}</Text>}
            </Pressable>
            <Pressable disabled={submitting} onPress={() => router.back()} style={{ backgroundColor: colors.surface, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 20, alignItems: "center" }}>
              <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 15 }}>Cancel</Text>
            </Pressable>
          </View>
        }
      />

      <Modal visible={reorderDaysOpen} animationType="slide" onRequestClose={() => setReorderDaysOpen(false)}>
        <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 50 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12 }}>
            <Text style={{ color: colors.text, fontFamily: fonts.heading, fontSize: 18, textTransform: "uppercase" }}>Reorder Days</Text>
            <Pressable onPress={() => setReorderDaysOpen(false)}>
              <Text style={{ color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 14 }}>Done</Text>
            </Pressable>
          </View>
          <DraggableFlatList
            data={days}
            keyExtractor={(d) => d.dayKey}
            onDragEnd={({ data }) => setDays(data)}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item, drag, isActive, getIndex }: RenderItemParams<DayRow>) => (
              <ScaleDecorator>
                <Pressable
                  onLongPress={drag}
                  style={{ backgroundColor: isActive ? colors.secondary : colors.surface, borderRadius: 10, padding: 14, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 10 }}
                >
                  <Text style={{ color: colors.textMuted, fontSize: 16 }}>☰</Text>
                  <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 14 }}>
                    Day {(getIndex() ?? 0) + 1}: {item.name || "Untitled"}
                  </Text>
                </Pressable>
              </ScaleDecorator>
            )}
          />
        </View>
      </Modal>

      <ExercisePickerModal
        visible={pickerTarget !== null}
        onClose={() => setPickerTarget(null)}
        onSelect={(ex) => {
          if (pickerTarget) applyPickedExercise(pickerTarget, ex);
        }}
      />

      <ExercisePickerModal
        visible={altPickerTarget !== null}
        onClose={() => setAltPickerTarget(null)}
        multiple
        maxSelect={5}
        excludeIds={altPickerRow?.exerciseId ? [altPickerRow.exerciseId] : []}
        preselectedIds={altPickerRow?.alternativeExerciseIds ?? []}
        defaultMuscle={altDefaultMuscle}
        onSelect={() => {}}
        onSelectMultiple={(chosen) => {
          if (altPickerTarget) updateExerciseRow(altPickerTarget, { alternativeExerciseIds: chosen.map((e) => e.id) });
        }}
      />
    </View>
  );
}

function NumField({
  label,
  value,
  onChange,
  onLabelPress,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  onLabelPress?: () => void;
}) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Pressable onPress={onLabelPress} disabled={!onLabelPress}>
        <Text style={{ color: onLabelPress ? colors.primary : colors.textMuted, fontFamily: fonts.body, fontSize: 11, textTransform: "uppercase" }}>
          {label}
        </Text>
      </Pressable>
      <TextInput
        value={value === null ? "" : String(value)}
        onChangeText={(t) => onChange(t === "" ? null : Number(t))}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor={colors.textMuted}
        style={{ backgroundColor: colors.background, borderRadius: 8, paddingVertical: 10, textAlign: "center", color: colors.text, fontFamily: fonts.heading, fontSize: 16 }}
      />
    </View>
  );
}
