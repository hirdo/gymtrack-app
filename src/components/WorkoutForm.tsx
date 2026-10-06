// RN port of gymtrack-web's WorkoutCreateComponent — shared by the "new workout" and "edit
// workout" routes.
//
// Exercise rows are reordered with Up/Down buttons rather than real drag-and-drop:
// react-native-draggable-flatlist (via react-native-reanimated's Worklets native module)
// crashed this screen to a blank white screen on open — the native Worklets module isn't
// actually available at runtime in this app (confirmed by a jest-expo render test, which hit
// the exact same failure at import time), despite reanimated/gesture-handler being present as
// JS dependencies. Being present in node_modules doesn't mean the matching native module is
// actually initialized — a lesson learned the hard way; don't reintroduce this dependency
// without first proving a real render works on-device.
import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, Text, TextInput, View } from "react-native";
import type { ListRenderItemInfo } from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "../core/auth/authStore";
import { useWorkouts } from "../hooks/useWorkouts";
import { useExercises } from "../hooks/useExercises";
import { addWorkout, updateWorkout } from "../core/services/workout.service";
import { getExerciseById } from "../core/services/exercise-library.service";
import { toLocalDateString } from "../core/utils/date.util";
import { uid } from "../core/utils/id.util";
import type { Exercise, ExerciseTemplate, ExerciseTrackingType, TimeUnit, Workout, WorkoutCategory } from "../core/models/workout.model";
import { ExercisePickerModal } from "./ExercisePickerModal";
import { DatePickerField } from "./DatePickerField";
import { Select } from "./Select";
import { colors, fonts } from "../core/theme/tokens";

const CATEGORY_OPTIONS: { value: WorkoutCategory; label: string }[] = [
  { value: "strength", label: "Strength" },
  { value: "cardio", label: "Cardio" },
  { value: "flexibility", label: "Flexibility" },
  { value: "hiit", label: "HIIT" },
  { value: "custom", label: "Custom" },
];

interface ExerciseRow {
  rowId: string;
  exerciseId: string | null;
  trackingType: ExerciseTrackingType;
  name: string;
  imageUrl: string | null;
  sets: number;
  reps: number | null;
  weight: number | null;
  duration: number | null;
  durationUnit: TimeUnit;
  notes: string;
  alternativeExerciseIds: string[];
}

function emptyRow(): ExerciseRow {
  return {
    rowId: uid(),
    exerciseId: null,
    trackingType: "reps",
    name: "",
    imageUrl: null,
    sets: 3,
    reps: 12,
    weight: null,
    duration: null,
    durationUnit: "min",
    notes: "",
    alternativeExerciseIds: [],
  };
}

function rowFromExercise(ex: Exercise): ExerciseRow {
  const durationUnit: TimeUnit = ex.durationUnit ?? "min";
  return {
    rowId: uid(),
    exerciseId: ex.templateId ?? null,
    trackingType: ex.trackingType ?? "reps",
    name: ex.name,
    imageUrl: ex.imageUrl ?? null,
    sets: ex.sets,
    reps: ex.reps ?? null,
    weight: ex.weight ?? null,
    duration: ex.duration != null ? (durationUnit === "sec" ? ex.duration : ex.duration / 60) : null,
    durationUnit,
    notes: ex.notes ?? "",
    alternativeExerciseIds: ex.alternativeExerciseIds ?? [],
  };
}

interface WorkoutFormProps {
  editingWorkout?: Workout;
}

export function WorkoutForm({ editingWorkout }: WorkoutFormProps) {
  const userId = useAuthStore((s) => s.userId);
  const { workouts } = useWorkouts();
  const { exercises: libraryExercises } = useExercises();

  const scheduleOnlyMode = !!editingWorkout?.programId;
  const isEditMode = !!editingWorkout;

  const [name, setName] = useState(editingWorkout?.name ?? "");
  const [description, setDescription] = useState(editingWorkout?.description ?? "");
  const [category, setCategory] = useState<WorkoutCategory>(editingWorkout?.category ?? "strength");
  const [scheduledDate, setScheduledDate] = useState<string | null>(editingWorkout?.scheduledDate ?? null);
  const [rows, setRows] = useState<ExerciseRow[]>(() =>
    editingWorkout && editingWorkout.exercises.length > 0 ? editingWorkout.exercises.map(rowFromExercise) : [emptyRow()]
  );
  const [submitting, setSubmitting] = useState(false);
  const [dateConflictName, setDateConflictName] = useState<string | null>(null);

  const [pickerTarget, setPickerTarget] = useState<string | null>(null);
  const [altPickerTarget, setAltPickerTarget] = useState<string | null>(null);

  const minDate = toLocalDateString(new Date());

  const canSubmit = name.trim().length > 0 && rows.every((r) => r.name.trim().length > 0) && !submitting;

  function updateRow(rowId: string, patch: Partial<ExerciseRow>) {
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)));
  }

  function addExerciseRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeExerciseRow(rowId: string) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.rowId !== rowId) : prev));
  }

  function moveExerciseRow(index: number, direction: -1 | 1) {
    setRows((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function toggleDurationUnit(row: ExerciseRow) {
    const newUnit: TimeUnit = row.durationUnit === "sec" ? "min" : "sec";
    const newValue = row.duration != null ? (newUnit === "sec" ? row.duration * 60 : row.duration / 60) : row.duration;
    updateRow(row.rowId, { duration: newValue, durationUnit: newUnit });
  }

  function applyPickedExercise(rowId: string, exercise: ExerciseTemplate) {
    const trackingType = exercise.trackingType ?? "reps";
    if (trackingType === "duration") {
      const durationUnit: TimeUnit = exercise.recommendedDurationUnit ?? "min";
      const durationValue = exercise.recommendedDuration != null ? (durationUnit === "sec" ? exercise.recommendedDuration : exercise.recommendedDuration / 60) : null;
      updateRow(rowId, {
        exerciseId: exercise.id,
        trackingType,
        name: exercise.name,
        imageUrl: exercise.imageUrl ?? null,
        sets: 1,
        reps: null,
        weight: null,
        duration: durationValue,
        durationUnit,
        alternativeExerciseIds: [],
      });
    } else if (trackingType === "reps_only") {
      updateRow(rowId, {
        exerciseId: exercise.id,
        trackingType,
        name: exercise.name,
        imageUrl: exercise.imageUrl ?? null,
        reps: exercise.recommendedReps ?? 12,
        weight: null,
        duration: null,
        alternativeExerciseIds: [],
      });
    } else {
      updateRow(rowId, {
        exerciseId: exercise.id,
        trackingType,
        name: exercise.name,
        imageUrl: exercise.imageUrl ?? null,
        reps: exercise.recommendedReps ?? 12,
        weight: exercise.recommendedWeight ?? null,
        duration: null,
        alternativeExerciseIds: [],
      });
    }
  }

  const altPickerRow = rows.find((r) => r.rowId === altPickerTarget);
  const altDefaultMuscle = useMemo(() => {
    if (!altPickerRow?.exerciseId) return null;
    return getExerciseById(libraryExercises, altPickerRow.exerciseId)?.primaryMuscles?.[0] ?? null;
  }, [altPickerRow, libraryExercises]);

  async function handleSubmit() {
    if (!userId || !canSubmit) return;

    if (scheduledDate) {
      const conflict = workouts.find((w) => w.scheduledDate === scheduledDate && w.id !== editingWorkout?.id);
      if (conflict) {
        setDateConflictName(conflict.name);
        return;
      }
    }
    setDateConflictName(null);

    const exercises: Exercise[] = rows.map((r) => ({
      id: uid(),
      templateId: r.exerciseId ?? undefined,
      trackingType: r.trackingType,
      name: r.name,
      imageUrl: r.imageUrl ?? undefined,
      sets: r.sets,
      reps: r.reps ?? undefined,
      weight: r.weight ?? undefined,
      duration: r.duration != null ? Math.round(r.durationUnit === "sec" ? r.duration : r.duration * 60) : undefined,
      durationUnit: r.duration != null ? r.durationUnit : undefined,
      notes: r.notes || undefined,
      alternativeExerciseIds: r.alternativeExerciseIds.length > 0 ? r.alternativeExerciseIds : undefined,
    }));

    setSubmitting(true);
    try {
      if (isEditMode && editingWorkout) {
        if (scheduleOnlyMode) {
          await updateWorkout(editingWorkout.id, { scheduledDate: scheduledDate ?? undefined });
        } else {
          await updateWorkout(editingWorkout.id, {
            name: name.trim(),
            description: description.trim() || undefined,
            category,
            scheduledDate: scheduledDate ?? undefined,
            exercises,
          });
        }
        router.replace({ pathname: "/(tabs)/workouts/[id]", params: { id: editingWorkout.id } });
      } else {
        const workout = await addWorkout(userId, {
          name: name.trim(),
          description: description.trim() || undefined,
          category,
          scheduledDate: scheduledDate ?? undefined,
          exercises,
        });
        router.replace({ pathname: "/(tabs)/workouts/[id]", params: { id: workout.id } });
      }
    } finally {
      setSubmitting(false);
    }
  }

  function renderExerciseRow({ item: row, index }: ListRenderItemInfo<ExerciseRow>) {
    return (
      <View>
        <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 12, gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 13, textTransform: "uppercase" }}>
              Exercise {index + 1}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              {!scheduleOnlyMode ? (
                <>
                  <Pressable disabled={index === 0} onPress={() => moveExerciseRow(index, -1)} style={{ opacity: index === 0 ? 0.3 : 1 }}>
                    <Text style={{ color: colors.textMuted, fontSize: 16 }}>▲</Text>
                  </Pressable>
                  <Pressable disabled={index === rows.length - 1} onPress={() => moveExerciseRow(index, 1)} style={{ opacity: index === rows.length - 1 ? 0.3 : 1 }}>
                    <Text style={{ color: colors.textMuted, fontSize: 16 }}>▼</Text>
                  </Pressable>
                </>
              ) : null}
              {rows.length > 1 && !scheduleOnlyMode ? (
                <Pressable onPress={() => removeExerciseRow(row.rowId)}>
                  <Text style={{ color: colors.error, fontSize: 13 }}>Remove</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          <Pressable
            disabled={scheduleOnlyMode}
            onPress={() => setPickerTarget(row.rowId)}
            style={{ backgroundColor: colors.background, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 8 }}
          >
            {row.imageUrl ? (
              <Image source={{ uri: row.imageUrl }} style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: colors.text }} />
            ) : null}
            <Text style={{ flex: 1, color: row.name ? colors.text : colors.textMuted, fontFamily: fonts.body, fontSize: 14 }} numberOfLines={1}>
              {row.name || "Choose exercise…"}
            </Text>
            <Text style={{ color: colors.textMuted }}>▾</Text>
          </Pressable>

          {row.trackingType === "duration" ? (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <NumField label="Sets" value={row.sets} onChange={(v) => updateRow(row.rowId, { sets: v ?? 1 })} disabled={scheduleOnlyMode} />
              <NumField
                label={`Duration (${row.durationUnit})`}
                value={row.duration}
                onChange={(v) => updateRow(row.rowId, { duration: v })}
                disabled={scheduleOnlyMode}
                onLabelPress={scheduleOnlyMode ? undefined : () => toggleDurationUnit(row)}
              />
            </View>
          ) : row.trackingType === "reps_only" ? (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <NumField label="Sets" value={row.sets} onChange={(v) => updateRow(row.rowId, { sets: v ?? 1 })} disabled={scheduleOnlyMode} />
              <NumField label="Reps" value={row.reps} onChange={(v) => updateRow(row.rowId, { reps: v })} disabled={scheduleOnlyMode} />
            </View>
          ) : (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <NumField label="Sets" value={row.sets} onChange={(v) => updateRow(row.rowId, { sets: v ?? 1 })} disabled={scheduleOnlyMode} />
              <NumField label="Reps" value={row.reps} onChange={(v) => updateRow(row.rowId, { reps: v })} disabled={scheduleOnlyMode} />
              <NumField label="Weight (kg)" value={row.weight} onChange={(v) => updateRow(row.rowId, { weight: v })} disabled={scheduleOnlyMode} />
            </View>
          )}

          <TextInput
            value={row.notes}
            onChangeText={(t) => updateRow(row.rowId, { notes: t })}
            editable={!scheduleOnlyMode}
            placeholder="Notes (optional)"
            placeholderTextColor={colors.textMuted}
            style={{ backgroundColor: colors.background, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, color: colors.text, fontFamily: fonts.body, fontSize: 13 }}
          />

          <View style={{ gap: 6 }}>
            <Text style={{ color: colors.textMuted, fontFamily: fonts.bodySemiBold, fontSize: 10, textTransform: "uppercase" }}>
              Alternatives (optional, max 5)
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {row.alternativeExerciseIds.map((altId) => {
                const alt = getExerciseById(libraryExercises, altId);
                return (
                  <View key={altId} style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.background, borderRadius: 8, paddingLeft: 4, paddingRight: 8, paddingVertical: 4 }}>
                    {alt?.imageUrl ? <Image source={{ uri: alt.imageUrl }} style={{ width: 22, height: 22, borderRadius: 5, backgroundColor: colors.text }} /> : null}
                    <Text style={{ color: colors.text, fontFamily: fonts.body, fontSize: 11 }}>{alt?.name ?? "?"}</Text>
                    {!scheduleOnlyMode ? (
                      <Pressable onPress={() => updateRow(row.rowId, { alternativeExerciseIds: row.alternativeExerciseIds.filter((id) => id !== altId) })}>
                        <Text style={{ color: colors.textMuted, fontSize: 11 }}>✕</Text>
                      </Pressable>
                    ) : null}
                  </View>
                );
              })}
            </View>
            {!scheduleOnlyMode && row.alternativeExerciseIds.length < 5 ? (
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
        data={rows}
        keyExtractor={(r) => r.rowId}
        renderItem={renderExerciseRow}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <View style={{ gap: 14, marginBottom: 16 }}>
            {scheduleOnlyMode ? (
              <View style={{ backgroundColor: colors.surface, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.primary }}>
                <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 12 }}>
                  This workout was generated from a program, so its name and exercises are locked. You can still change its scheduled date below.
                </Text>
              </View>
            ) : null}

            <View style={{ gap: 6 }}>
              <Text style={{ color: colors.textMuted, fontFamily: fonts.bodySemiBold, fontSize: 11, textTransform: "uppercase" }}>Workout Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                editable={!scheduleOnlyMode}
                placeholder="e.g. Push day"
                placeholderTextColor={colors.textMuted}
                style={{ backgroundColor: colors.surface, color: colors.text, fontFamily: fonts.body, borderRadius: 10, padding: 12 }}
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text style={{ color: colors.textMuted, fontFamily: fonts.bodySemiBold, fontSize: 11, textTransform: "uppercase" }}>
                Description (optional)
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                editable={!scheduleOnlyMode}
                multiline
                placeholder="Brief description..."
                placeholderTextColor={colors.textMuted}
                style={{ backgroundColor: colors.surface, color: colors.text, fontFamily: fonts.body, borderRadius: 10, padding: 12, minHeight: 60 }}
              />
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1, opacity: scheduleOnlyMode ? 0.5 : 1 }} pointerEvents={scheduleOnlyMode ? "none" : "auto"}>
                <Select label="Category" value={category} placeholder="Category" options={CATEGORY_OPTIONS} onChange={(v) => v && setCategory(v)} />
              </View>
              <View style={{ flex: 1 }}>
                <DatePickerField label="Schedule Date" value={scheduledDate} onChange={setScheduledDate} minDate={minDate} />
              </View>
            </View>

            {dateConflictName ? (
              <Text style={{ color: colors.error, fontFamily: fonts.body, fontSize: 12 }}>
                You already have &ldquo;{dateConflictName}&rdquo; scheduled on this date. Pick a different date.
              </Text>
            ) : null}

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ color: colors.text, fontFamily: fonts.heading, fontSize: 18, textTransform: "uppercase" }}>Exercises</Text>
              {!scheduleOnlyMode ? (
                <Pressable onPress={addExerciseRow} style={{ backgroundColor: colors.surface, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 }}>
                  <Text style={{ color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 13 }}>+ Add Exercise</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        }
        ListFooterComponent={
          <View style={{ flexDirection: "row", gap: 10, marginTop: 8, marginBottom: 24 }}>
            <Pressable
              disabled={!canSubmit}
              onPress={handleSubmit}
              style={{ flex: 1, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: "center", opacity: canSubmit ? 1 : 0.5 }}
            >
              {submitting ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={{ color: colors.background, fontFamily: fonts.bodySemiBold, fontSize: 15 }}>
                  {isEditMode ? "Save Changes" : "Create Workout"}
                </Text>
              )}
            </Pressable>
            <Pressable
              disabled={submitting}
              onPress={() => router.back()}
              style={{ backgroundColor: colors.surface, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 20, alignItems: "center" }}
            >
              <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 15 }}>Cancel</Text>
            </Pressable>
          </View>
        }
      />

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
          if (altPickerTarget) updateRow(altPickerTarget, { alternativeExerciseIds: chosen.map((e) => e.id) });
        }}
      />
    </View>
  );
}

function NumField({
  label,
  value,
  onChange,
  disabled,
  onLabelPress,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  disabled?: boolean;
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
        editable={!disabled}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor={colors.textMuted}
        style={{ backgroundColor: colors.background, borderRadius: 8, paddingVertical: 10, textAlign: "center", color: colors.text, fontFamily: fonts.heading, fontSize: 16 }}
      />
    </View>
  );
}
