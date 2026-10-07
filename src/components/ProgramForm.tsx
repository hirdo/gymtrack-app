// RN port of gymtrack-web's ProgramCreateComponent (admin-only).
//
// Both days and exercises-within-a-day are reordered with Up/Down buttons rather than real
// drag-and-drop: react-native-draggable-flatlist (via react-native-reanimated's Worklets native
// module) crashed this screen to a blank white screen on open — the native Worklets module
// isn't actually available at runtime in this app (confirmed by a jest-expo render test, which
// hit the exact same failure at import time), despite reanimated/gesture-handler being present
// as JS dependencies. Don't reintroduce this dependency without first proving a real render
// works on-device.
import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import type { ListRenderItemInfo } from "react-native";
import { router } from "expo-router";
import { useExercises } from "../hooks/useExercises";
import { useAuthStore } from "../core/auth/authStore";
import { createProgram, updateProgram } from "../core/services/program.service";
import { getExerciseById } from "../core/services/exercise-library.service";
import { uid } from "../core/utils/id.util";
import { PROGRAM_DIFFICULTIES } from "../core/models/workout.model";
import type { ExerciseBundle, ExerciseTemplate, ExerciseTrackingType, ProgramDay, ProgramDifficulty, TimeUnit, TrainingProgram } from "../core/models/workout.model";
import { ExercisePickerModal } from "./ExercisePickerModal";
import { BundlePickerModal } from "./BundlePickerModal";
import { Select } from "./Select";
import { ZoomableThumbnail } from "./ZoomableThumbnail";
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
  const [bundlePickerTarget, setBundlePickerTarget] = useState<string | null>(null);
  const [duplicateRangeStart, setDuplicateRangeStart] = useState(1);
  const [duplicateRangeEnd, setDuplicateRangeEnd] = useState(1);

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

  // Copies Day `duplicateRangeStart`..`duplicateRangeEnd` as a new block appended to the end,
  // in the same order — e.g. duplicating Days 1-3 of a 3-day program adds Days 4-6 with
  // identical names/exercises. Mirrors gymtrack-web's duplicateDayRange().
  const canDuplicateRange = duplicateRangeStart >= 1 && duplicateRangeEnd >= duplicateRangeStart && duplicateRangeEnd <= days.length;

  function duplicateDayRange() {
    if (!canDuplicateRange) return;
    const clones: DayRow[] = days.slice(duplicateRangeStart - 1, duplicateRangeEnd).map((d) => ({
      dayKey: uid(),
      name: d.name,
      exercises: d.exercises.map((e) => ({ ...e, rowId: uid() })),
    }));
    setDays((prev) => [...prev, ...clones]);
  }

  function addExerciseToCurrentDay() {
    updateDay(currentDay.dayKey, { exercises: [...currentDay.exercises, emptyExerciseRow()] });
  }

  function removeExerciseRow(rowId: string) {
    if (currentDay.exercises.length <= 1) return;
    updateDay(currentDay.dayKey, { exercises: currentDay.exercises.filter((e) => e.rowId !== rowId) });
  }

  function moveExerciseRow(index: number, direction: -1 | 1) {
    const exercises = currentDay.exercises;
    const target = index + direction;
    if (target < 0 || target >= exercises.length) return;
    const next = [...exercises];
    [next[index], next[target]] = [next[target], next[index]];
    updateDay(currentDay.dayKey, { exercises: next });
  }

  function moveDay(index: number, direction: -1 | 1) {
    setDays((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
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

  function applyPickedBundle(rowId: string, bundle: ExerciseBundle) {
    const mainExercise = getExerciseById(libraryExercises, bundle.mainExerciseId);
    if (!mainExercise) return;
    applyPickedExercise(rowId, mainExercise);
    updateExerciseRow(rowId, { alternativeExerciseIds: bundle.alternativeExerciseIds });
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

  function renderExerciseRow({ item: row, index }: ListRenderItemInfo<ProgramExerciseRow>) {
    const rowImageUrl = row.exerciseId ? getExerciseById(libraryExercises, row.exerciseId)?.imageUrl : undefined;
    return (
      <View>
        <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 12, gap: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: colors.textMuted, fontFamily: fonts.bodySemiBold, fontSize: 12, textTransform: "uppercase" }}>
              Exercise {index + 1}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <Pressable disabled={index === 0} onPress={() => moveExerciseRow(index, -1)} style={{ opacity: index === 0 ? 0.3 : 1 }}>
                <Text style={{ color: colors.textMuted, fontSize: 16 }}>▲</Text>
              </Pressable>
              <Pressable disabled={index === currentDay.exercises.length - 1} onPress={() => moveExerciseRow(index, 1)} style={{ opacity: index === currentDay.exercises.length - 1 ? 0.3 : 1 }}>
                <Text style={{ color: colors.textMuted, fontSize: 16 }}>▼</Text>
              </Pressable>
              {currentDay.exercises.length > 1 ? (
                <Pressable onPress={() => removeExerciseRow(row.rowId)}>
                  <Text style={{ color: colors.error, fontSize: 13 }}>Remove</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={() => setPickerTarget(row.rowId)}
              style={{ flex: 1, backgroundColor: colors.background, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              {rowImageUrl ? (
                <ZoomableThumbnail uri={rowImageUrl} alt={row.exerciseName} style={{ width: 26, height: 26, borderRadius: 6, backgroundColor: colors.text }} />
              ) : null}
              <Text style={{ flex: 1, color: row.exerciseName ? colors.text : colors.textMuted, fontFamily: fonts.body, fontSize: 14 }} numberOfLines={1}>
                {row.exerciseName || "Choose exercise…"}
              </Text>
              <Text style={{ color: colors.textMuted }}>▾</Text>
            </Pressable>
            <Pressable
              onPress={() => setBundlePickerTarget(row.rowId)}
              style={{ backgroundColor: colors.background, borderRadius: 10, paddingHorizontal: 12, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ color: colors.textMuted, fontFamily: fonts.bodySemiBold, fontSize: 11 }}>Use{"\n"}Bundle</Text>
            </Pressable>
          </View>
          {!row.exerciseName.trim() ? (
            <Text style={{ color: colors.error, fontFamily: fonts.body, fontSize: 11 }}>Exercise is required.</Text>
          ) : null}

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
                    {alt?.imageUrl ? (
                      <ZoomableThumbnail uri={alt.imageUrl} alt={alt.name} style={{ width: 22, height: 22, borderRadius: 5, backgroundColor: colors.text }} />
                    ) : null}
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
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={currentDay.exercises}
        keyExtractor={(e) => e.rowId}
        renderItem={renderExerciseRow}
        contentContainerStyle={{ padding: 16 }}
        keyboardShouldPersistTaps="handled"
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
                <Select label="Difficulty" value={difficulty} placeholder="Difficulty" options={DIFFICULTY_OPTIONS} onChange={(v) => v && setDifficulty(v)} allowClear={false} />
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
            {!currentDay.name.trim() ? (
              <Text style={{ color: colors.error, fontFamily: fonts.body, fontSize: 11, marginTop: -8 }}>Day name is required.</Text>
            ) : null}

            <Pressable onPress={addExerciseToCurrentDay} style={{ backgroundColor: colors.surface, borderRadius: 8, paddingVertical: 8, alignItems: "center" }}>
              <Text style={{ color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 13 }}>+ Add Exercise to Day {currentDayIndex + 1}</Text>
            </Pressable>
          </View>
        }
        ListFooterComponent={
          <View style={{ gap: 14, marginTop: 8, marginBottom: 24 }}>
            {days.length > 1 ? (
              <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 14, gap: 10 }}>
                <Text style={{ color: colors.text, fontFamily: fonts.heading, fontSize: 14, textTransform: "uppercase" }}>Duplicate a Block of Days</Text>
                <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 12 }}>
                  Copy a range of days (e.g. Day 1-3) and append them as identical new days at the end.
                </Text>
                <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-end" }}>
                  <NumField label="From Day" value={duplicateRangeStart} onChange={(v) => setDuplicateRangeStart(v ?? 1)} />
                  <NumField label="To Day" value={duplicateRangeEnd} onChange={(v) => setDuplicateRangeEnd(v ?? 1)} />
                  <Pressable
                    disabled={!canDuplicateRange}
                    onPress={duplicateDayRange}
                    style={{ flex: 1, backgroundColor: colors.background, borderRadius: 10, paddingVertical: 12, alignItems: "center", opacity: canDuplicateRange ? 1 : 0.4 }}
                  >
                    <Text style={{ color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 12 }}>Duplicate as New Days</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {!canSubmit && !submitting ? (
              <Text style={{ color: colors.error, fontFamily: fonts.body, fontSize: 12 }}>
                {!name.trim() ? "Program name is required. " : ""}
                Every day needs a name and every exercise row needs an exercise selected before you can save.
              </Text>
            ) : null}

            <View style={{ flexDirection: "row", gap: 10 }}>
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
          <FlatList
            data={days}
            keyExtractor={(d) => d.dayKey}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item, index }: ListRenderItemInfo<DayRow>) => (
              <View
                style={{ backgroundColor: colors.surface, borderRadius: 10, padding: 14, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 14, flex: 1 }}>
                  Day {index + 1}: {item.name || "Untitled"}
                </Text>
                <Pressable disabled={index === 0} onPress={() => moveDay(index, -1)} style={{ opacity: index === 0 ? 0.3 : 1 }}>
                  <Text style={{ color: colors.textMuted, fontSize: 18 }}>▲</Text>
                </Pressable>
                <Pressable disabled={index === days.length - 1} onPress={() => moveDay(index, 1)} style={{ opacity: index === days.length - 1 ? 0.3 : 1 }}>
                  <Text style={{ color: colors.textMuted, fontSize: 18 }}>▼</Text>
                </Pressable>
              </View>
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

      <BundlePickerModal
        visible={bundlePickerTarget !== null}
        onClose={() => setBundlePickerTarget(null)}
        onSelect={(bundle) => {
          if (bundlePickerTarget) applyPickedBundle(bundlePickerTarget, bundle);
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
