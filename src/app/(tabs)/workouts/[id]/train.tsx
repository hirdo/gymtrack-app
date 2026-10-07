// RN port of gymtrack-web's WorkoutTrainComponent. Rest/duration timers use absolute end-at
// timestamps (not a decrementing counter) recomputed on AppState 'active' — the RN equivalent
// of the web version's document.visibilitychange handling — so they stay correct across
// backgrounding instead of drifting or freezing while the JS thread is suspended.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useWorkouts } from "../../../../hooks/useWorkouts";
import { useExercises } from "../../../../hooks/useExercises";
import { useExerciseLogs } from "../../../../hooks/useExerciseLogs";
import { getExerciseById } from "../../../../core/services/exercise-library.service";
import {
  addAlternateLog,
  completeWorkoutLogs,
  deleteSet,
  getExerciseHistory,
  logSet as logSetAction,
  logsForWorkout,
  updateSet,
} from "../../../../core/services/exercise-log.service";
import { markWorkoutComplete } from "../../../../core/services/workout.service";
import { useAuthStore } from "../../../../core/auth/authStore";
import { formatDisplayDate, formatTime, parseLocalDate } from "../../../../core/utils/date.util";
import type { ExerciseLog, SetRecord } from "../../../../core/models/workout.model";
import { ZoomableThumbnail } from "../../../../components/ZoomableThumbnail";
import { colors, fonts } from "../../../../core/theme/tokens";

const DEFAULT_REST_SECONDS = 120;

function ProgressBar({ percent, color }: { percent: number; color: string }) {
  return (
    <View style={{ height: 6, backgroundColor: colors.background, borderRadius: 3, overflow: "hidden" }}>
      <View style={{ height: "100%", width: `${Math.min(100, Math.max(0, percent))}%`, backgroundColor: color }} />
    </View>
  );
}

function NumberField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
}) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 12 }}>{label}</Text>
      <TextInput
        value={value === null ? "" : String(value)}
        onChangeText={(t) => onChange(t === "" ? null : Number(t))}
        keyboardType="decimal-pad"
        placeholder={placeholder ?? "0"}
        placeholderTextColor={colors.textMuted}
        style={{
          backgroundColor: colors.surface,
          borderRadius: 10,
          paddingVertical: 12,
          textAlign: "center",
          color: colors.text,
          fontFamily: fonts.heading,
          fontSize: 18,
        }}
      />
    </View>
  );
}

export default function WorkoutTrain() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { workouts } = useWorkouts();
  const { exercises } = useExercises();
  const { logs } = useExerciseLogs();
  const userId = useAuthStore((s) => s.userId);

  const workout = workouts.find((w) => w.id === id);
  const workoutLogs = useMemo(() => (workout ? logsForWorkout(logs, workout.id) : []), [logs, workout]);

  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [weightInput, setWeightInput] = useState<number | null>(null);
  const [repsInput, setRepsInput] = useState<number | null>(null);
  const [logSetError, setLogSetError] = useState<string | null>(null);
  const [loggingSet, setLoggingSet] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [activeLogId, setActiveLogId] = useState<Record<number, string>>({});
  const [altSwapOpen, setAltSwapOpen] = useState(false);

  const [editingSet, setEditingSet] = useState<{ logId: string; setNumber: number } | null>(null);
  const [editWeightInput, setEditWeightInput] = useState<number | null>(null);
  const [editRepsInput, setEditRepsInput] = useState<number | null>(null);
  const [editDurationInput, setEditDurationInput] = useState<number | null>(null);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [restSeconds, setRestSeconds] = useState(0);
  const [restTotalSeconds, setRestTotalSeconds] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [restJustFinished, setRestJustFinished] = useState(false);

  const [durationRemaining, setDurationRemaining] = useState(0);
  const [durationRunning, setDurationRunning] = useState(false);
  const [durationJustFinished, setDurationJustFinished] = useState(false);
  const [durationTimerLogId, setDurationTimerLogId] = useState<string | null>(null);
  const [durationInput, setDurationInput] = useState<number | null>(null);

  const restEndAt = useRef<number | null>(null);
  const restInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationEndAt = useRef<number | null>(null);
  const durationInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalExercises = workout?.exercises.length ?? 0;

  const slots = useMemo(() => {
    if (!workout) return [];
    return workout.exercises.map((ex, i) => {
      const slotLogs = workoutLogs.filter((l) => l.exerciseIndex === i);
      const primary = [...slotLogs].sort((a, b) => a.startedAt.localeCompare(b.startedAt))[0];
      const completed = slotLogs.reduce((sum, l) => sum + l.sets.length, 0);
      const target = primary?.targetSets ?? ex.sets;
      return { index: i, name: ex.name, completed, target };
    });
  }, [workout, workoutLogs]);

  const logsForCurrentSlot = useMemo(
    () =>
      workoutLogs
        .filter((l) => l.exerciseIndex === currentExerciseIndex)
        .sort((a, b) => a.startedAt.localeCompare(b.startedAt)),
    [workoutLogs, currentExerciseIndex]
  );

  const currentLog: ExerciseLog | undefined = useMemo(() => {
    if (logsForCurrentSlot.length === 0) return undefined;
    const activeId = activeLogId[currentExerciseIndex];
    if (activeId) {
      const found = logsForCurrentSlot.find((l) => l.id === activeId);
      if (found) return found;
    }
    return logsForCurrentSlot[0];
  }, [logsForCurrentSlot, activeLogId, currentExerciseIndex]);

  const slotTargetSets = logsForCurrentSlot[0]?.targetSets ?? 0;
  const slotCompletedSets = logsForCurrentSlot.reduce((sum, l) => sum + l.sets.length, 0);
  const hasLoggedAnySet = workoutLogs.some((l) => l.sets.length > 0);

  const currentExerciseImage = useMemo(() => {
    if (!currentLog || !workout) return undefined;
    const slotExercise = workout.exercises[currentExerciseIndex];
    if (currentLog.exerciseTemplateId && currentLog.exerciseTemplateId === slotExercise?.templateId) {
      return slotExercise.imageUrl;
    }
    return currentLog.exerciseTemplateId ? getExerciseById(exercises, currentLog.exerciseTemplateId)?.imageUrl : undefined;
  }, [currentLog, workout, currentExerciseIndex, exercises]);

  const currentExerciseAlternatives = useMemo(() => {
    if (!workout) return [];
    const slot = workout.exercises[currentExerciseIndex];
    if (!slot) return [];
    const ids = [slot.templateId, ...(slot.alternativeExerciseIds ?? [])].filter((v): v is string => !!v);
    return ids.map((eid) => getExerciseById(exercises, eid)).filter((e): e is NonNullable<typeof e> => !!e);
  }, [workout, currentExerciseIndex, exercises]);

  const currentExerciseHistory = useMemo(() => {
    if (!currentLog) return [];
    return getExerciseHistory(logs, currentLog.exerciseName, currentLog.exerciseTemplateId).slice(0, 5);
  }, [logs, currentLog]);

  const displayDurationRemaining = useMemo(() => {
    if (!currentLog || durationTimerLogId !== currentLog.id) return currentLog?.targetDuration ?? 0;
    return durationRemaining;
  }, [currentLog, durationTimerLogId, durationRemaining]);

  const displayDurationRunning = !!currentLog && durationTimerLogId === currentLog.id && durationRunning;
  const displayDurationJustFinished = !!currentLog && durationTimerLogId === currentLog.id && durationJustFinished;
  const displayDurationInput = !currentLog || durationTimerLogId !== currentLog.id ? null : durationInput;

  const overallProgress = useMemo(() => {
    const totalSets = slots.reduce((sum, s) => sum + s.target, 0);
    const completedSets = slots.reduce((sum, s) => sum + s.completed, 0);
    return totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;
  }, [slots]);

  // Redirect away from an already-completed workout, same as the web version.
  useEffect(() => {
    if (workout?.completedDate) {
      router.replace({ pathname: "/(tabs)/workouts/[id]", params: { id: workout.id } });
    }
  }, [workout]);

  // Elapsed timer, ticking from the earliest log's startedAt.
  useEffect(() => {
    const startedAt = workoutLogs.reduce<string | undefined>((min, l) => (!min || l.startedAt < min ? l.startedAt : min), undefined);
    if (!startedAt) return;
    const started = new Date(startedAt).getTime();
    const tick = () => setElapsedSeconds(Math.round((Date.now() - started) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [workoutLogs]);

  const tickRestTimer = useCallback(() => {
    if (restEndAt.current === null) return;
    const remaining = Math.max(0, Math.round((restEndAt.current - Date.now()) / 1000));
    setRestSeconds(remaining);
    if (remaining <= 0) {
      setRestJustFinished(true);
      if (restInterval.current) {
        clearInterval(restInterval.current);
        restInterval.current = null;
      }
    }
  }, []);

  function startRestTimer(seconds: number) {
    if (restInterval.current) clearInterval(restInterval.current);
    setRestTotalSeconds(seconds);
    restEndAt.current = Date.now() + seconds * 1000;
    setIsResting(true);
    setRestJustFinished(false);
    tickRestTimer();
    restInterval.current = setInterval(tickRestTimer, 1000);
  }

  function skipRest() {
    if (restInterval.current) {
      clearInterval(restInterval.current);
      restInterval.current = null;
    }
    restEndAt.current = null;
    setIsResting(false);
    setRestJustFinished(false);
    setRestSeconds(0);
  }

  // Depends on `logs`/`durationTimerLogId` (to look up the right log's target when the timer
  // finishes) — re-created when either changes so the AppState resume handler below never calls
  // a version of this holding a stale log/id from whatever render it originally mounted in.
  const stopDurationTimer = useCallback((finished: boolean) => {
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }
    setDurationRunning(false);
    const log = logs.find((l) => l.id === durationTimerLogId);
    const target = log?.targetDuration ?? 0;
    setDurationRemaining((prevRemaining) => {
      const elapsed = Math.max(0, target - prevRemaining);
      setDurationInput(elapsed);
      return prevRemaining;
    });
    if (finished) setDurationJustFinished(true);
  }, [logs, durationTimerLogId]);

  const tickDurationTimer = useCallback(() => {
    if (durationEndAt.current === null) return;
    const remaining = Math.max(0, Math.round((durationEndAt.current - Date.now()) / 1000));
    setDurationRemaining(remaining);
    if (remaining <= 0) {
      stopDurationTimer(true);
    }
  }, [stopDurationTimer]);

  function startDurationTimer() {
    if (!currentLog) return;
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }
    const remaining = durationTimerLogId === currentLog.id ? durationRemaining : 0;
    const baseRemaining = remaining > 0 ? remaining : currentLog.targetDuration ?? 0;
    setDurationTimerLogId(currentLog.id);
    durationEndAt.current = Date.now() + baseRemaining * 1000;
    setDurationRunning(true);
    setDurationJustFinished(false);
    tickDurationTimer();
    durationInterval.current = setInterval(tickDurationTimer, 1000);
  }

  function resetDurationTimer() {
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }
    setDurationRunning(false);
    setDurationJustFinished(false);
    durationEndAt.current = null;
    setDurationTimerLogId(null);
    setDurationRemaining(currentLog?.targetDuration ?? 0);
    setDurationInput(null);
  }

  // Re-sync both timers from their absolute end-at timestamps when the app returns to the
  // foreground, instead of letting a frozen JS timer leave them stale. Re-subscribing on every
  // render (cheap — one listener) keeps this closure's tickDurationTimer -> stopDurationTimer
  // chain reading current `logs`/`durationTimerLogId` instead of whatever they were on mount.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        tickRestTimer();
        tickDurationTimer();
      }
    });
    return () => sub.remove();
  }, [tickRestTimer, tickDurationTimer]);

  useEffect(() => {
    return () => {
      if (restInterval.current) clearInterval(restInterval.current);
      if (durationInterval.current) clearInterval(durationInterval.current);
    };
  }, []);

  function resetForNewSlot() {
    setLogSetError(null);
    setEditingSet(null);
    setWeightInput(null);
    setRepsInput(null);
  }

  function navigateExercise(index: number) {
    setCurrentExerciseIndex(index);
    setAltSwapOpen(false);
    resetForNewSlot();
  }

  async function switchToExercise(templateId: string) {
    if (!workout || !userId) return;
    if (currentLog?.exerciseTemplateId === templateId) {
      setAltSwapOpen(false);
      return;
    }
    const alternate = getExerciseById(exercises, templateId);
    if (!alternate) return;
    const logId = await addAlternateLog(logs, workout, currentExerciseIndex, alternate, userId);
    setActiveLogId((prev) => ({ ...prev, [currentExerciseIndex]: logId }));
    setAltSwapOpen(false);
    resetForNewSlot();
  }

  async function handleLogSet() {
    const log = currentLog;
    if (!log || loggingSet) return;

    if (log.trackingType === "duration") {
      if (displayDurationInput === null) {
        setLogSetError("Complete the timer or enter a duration before logging.");
        return;
      }
    } else {
      if (repsInput === null) {
        setLogSetError("Please enter reps before logging.");
        return;
      }
      if (log.trackingType === "reps" && weightInput === null) {
        setLogSetError("Please enter weight before logging.");
        return;
      }
    }

    let setRecord: SetRecord;
    if (log.trackingType === "duration") {
      setRecord = { setNumber: log.sets.length + 1, duration: displayDurationInput!, completedAt: new Date().toISOString() };
    } else if (log.trackingType === "reps_only") {
      setRecord = { setNumber: log.sets.length + 1, reps: repsInput!, completedAt: new Date().toISOString() };
    } else {
      setRecord = { setNumber: log.sets.length + 1, weight: weightInput!, reps: repsInput!, completedAt: new Date().toISOString() };
    }

    setLoggingSet(true);
    try {
      await logSetAction(log, setRecord);
      setLogSetError(null);
      setWeightInput(null);
      setRepsInput(null);
      if (log.trackingType === "duration") {
        resetDurationTimer();
      } else {
        setDurationInput(null);
      }
      startRestTimer(log.restTime ?? DEFAULT_REST_SECONDS);
    } finally {
      setLoggingSet(false);
    }
  }

  function startEditSet(logId: string, set: SetRecord) {
    setEditingSet({ logId, setNumber: set.setNumber });
    setEditWeightInput(set.weight ?? null);
    setEditRepsInput(set.reps ?? null);
    setEditDurationInput(set.duration ?? null);
  }

  async function saveEditSet(log: ExerciseLog) {
    if (!editingSet) return;
    const changes: Partial<SetRecord> =
      log.trackingType === "duration"
        ? { duration: editDurationInput ?? 0 }
        : log.trackingType === "reps_only"
          ? { reps: editRepsInput ?? 0 }
          : { weight: editWeightInput ?? 0, reps: editRepsInput ?? 0 };
    await updateSet(log, editingSet.setNumber, changes);
    setEditingSet(null);
  }

  async function completeTraining() {
    if (!workout || !hasLoggedAnySet || completing) return;
    setCompleting(true);
    await completeWorkoutLogs(logs, workout.id);
    await markWorkoutComplete(workout.id, elapsedSeconds);
    router.replace({ pathname: "/(tabs)/workouts/[id]", params: { id: workout.id } });
  }

  if (!workout) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: colors.textMuted, fontFamily: fonts.body }}>Workout not found.</Text>
      </View>
    );
  }

  if (completing) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", gap: 12 }}>
        <ActivityIndicator color={colors.primary} />
        <Text style={{ color: colors.textMuted, fontFamily: fonts.body }}>Finishing workout...</Text>
      </View>
    );
  }

  if (totalExercises === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Text style={{ color: colors.textMuted, fontFamily: fonts.body, textAlign: "center" }}>
          This workout has no exercises yet, so there&rsquo;s nothing to train.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, gap: 16 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: colors.text, fontFamily: fonts.heading, fontSize: 22, textTransform: "uppercase" }} numberOfLines={1}>
            {workout.name}
          </Text>
          <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 13 }}>{formatTime(elapsedSeconds)}</Text>
        </View>
        <Pressable
          disabled={!hasLoggedAnySet}
          onPress={completeTraining}
          style={{ backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, opacity: hasLoggedAnySet ? 1 : 0.4 }}
        >
          <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 14 }}>Finish</Text>
        </Pressable>
      </View>

      <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 14, gap: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ color: colors.textMuted, fontFamily: fonts.bodySemiBold, fontSize: 11, textTransform: "uppercase" }}>Overall Progress</Text>
          <Text style={{ color: colors.primary, fontFamily: fonts.heading, fontSize: 14 }}>{overallProgress}%</Text>
        </View>
        <ProgressBar percent={overallProgress} color={colors.primary} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {slots.map((slot) => (
          <Pressable
            key={slot.index}
            onPress={() => navigateExercise(slot.index)}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 10,
              marginRight: 8,
              backgroundColor:
                slot.index === currentExerciseIndex ? colors.primary : slot.completed >= slot.target ? colors.background : colors.surface,
              borderWidth: slot.index === currentExerciseIndex ? 0 : slot.completed >= slot.target ? 1 : 0,
              borderColor: colors.accent,
            }}
          >
            <Text
              style={{
                color: slot.index === currentExerciseIndex ? colors.background : slot.completed >= slot.target ? colors.accent : colors.textMuted,
                fontFamily: fonts.bodySemiBold,
                fontSize: 12,
                textTransform: "uppercase",
              }}
            >
              Exercise {slot.index + 1}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {currentLog ? (
        <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 14, gap: 14 }}>
          {currentExerciseImage ? (
            <ZoomableThumbnail
              uri={currentExerciseImage}
              alt={currentLog.exerciseName}
              style={{ width: "100%", height: 160, borderRadius: 12, backgroundColor: colors.text }}
              resizeMode="contain"
            />
          ) : null}

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: colors.text, fontFamily: fonts.heading, fontSize: 18, textTransform: "uppercase", flex: 1 }} numberOfLines={1}>
              <Text style={{ color: colors.primary }}>{currentExerciseIndex + 1}/{totalExercises} </Text>
              {currentLog.exerciseName}
            </Text>
            {currentExerciseAlternatives.length > 1 ? (
              <Pressable onPress={() => setAltSwapOpen(true)} style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: colors.textMuted, fontSize: 16 }}>⇄</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1, backgroundColor: colors.background, borderRadius: 10, padding: 10, alignItems: "center" }}>
              <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 10, textTransform: "uppercase" }}>Target Sets</Text>
              <Text style={{ color: colors.primary, fontFamily: fonts.heading, fontSize: 20 }}>{slotTargetSets}</Text>
            </View>
            {currentLog.trackingType === "duration" ? (
              <View style={{ flex: 1, backgroundColor: colors.background, borderRadius: 10, padding: 10, alignItems: "center" }}>
                <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 10, textTransform: "uppercase" }}>Target Duration</Text>
                <Text style={{ color: colors.accent, fontFamily: fonts.heading, fontSize: 20 }}>{formatTime(currentLog.targetDuration ?? 0)}</Text>
              </View>
            ) : (
              <View style={{ flex: 1, backgroundColor: colors.background, borderRadius: 10, padding: 10, alignItems: "center" }}>
                <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 10, textTransform: "uppercase" }}>Target Reps</Text>
                <Text style={{ color: colors.accent, fontFamily: fonts.heading, fontSize: 20 }}>{currentLog.targetReps}</Text>
              </View>
            )}
            <View style={{ flex: 1, backgroundColor: colors.background, borderRadius: 10, padding: 10, alignItems: "center" }}>
              <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 10, textTransform: "uppercase" }}>Completed</Text>
              <Text style={{ color: slotCompletedSets >= slotTargetSets ? colors.accent : colors.warning, fontFamily: fonts.heading, fontSize: 20 }}>
                {slotCompletedSets}/{slotTargetSets}
              </Text>
            </View>
          </View>

          {currentLog.trackingType === "reps" && currentLog.targetWeight ? (
            <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 12, textAlign: "center" }}>
              Recommended weight: <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold }}>{currentLog.targetWeight}kg</Text>
            </Text>
          ) : null}

          {isResting ? (
            <View style={{ alignItems: "center", gap: 8 }}>
              <Text style={{ color: colors.warning, fontFamily: fonts.bodySemiBold, fontSize: 11, textTransform: "uppercase" }}>Rest Timer</Text>
              {restJustFinished ? (
                <Text style={{ color: colors.warning, fontFamily: fonts.heading, fontSize: 24 }}>Let&apos;s go!</Text>
              ) : (
                <>
                  <Text style={{ color: colors.warning, fontFamily: fonts.heading, fontSize: 32 }}>{formatTime(restSeconds)}</Text>
                  <View style={{ width: "100%" }}>
                    <ProgressBar percent={(restSeconds / (restTotalSeconds || 1)) * 100} color={colors.warning} />
                  </View>
                </>
              )}
              <Pressable onPress={skipRest} style={{ paddingVertical: 8, paddingHorizontal: 12 }}>
                <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 13 }}>Skip Rest</Text>
              </Pressable>
            </View>
          ) : null}

          {currentLog.trackingType === "duration" ? (
            <View style={{ alignItems: "center", gap: 10 }}>
              <Text style={{ color: colors.text, fontFamily: fonts.heading, fontSize: 36 }}>{formatTime(displayDurationRemaining)}</Text>
              {displayDurationJustFinished ? (
                <Text style={{ color: colors.accent, fontFamily: fonts.bodySemiBold, fontSize: 11, textTransform: "uppercase" }}>Done!</Text>
              ) : null}
              <View style={{ width: "100%" }}>
                <ProgressBar percent={(displayDurationRemaining / (currentLog.targetDuration || 1)) * 100} color={colors.accent} />
              </View>
              <View style={{ flexDirection: "row", gap: 12 }}>
                {!displayDurationRunning ? (
                  <Pressable onPress={startDurationTimer} style={{ backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20 }}>
                    <Text style={{ color: colors.background, fontFamily: fonts.bodySemiBold }}>Start</Text>
                  </Pressable>
                ) : (
                  <Pressable onPress={() => stopDurationTimer(false)} style={{ backgroundColor: colors.secondary, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20 }}>
                    <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold }}>Stop</Text>
                  </Pressable>
                )}
                {displayDurationInput !== null || displayDurationRunning ? (
                  <Pressable onPress={resetDurationTimer} style={{ paddingVertical: 10, paddingHorizontal: 12 }}>
                    <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 13 }}>Reset</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : null}

          <View style={{ backgroundColor: colors.background, borderRadius: 10, padding: 14, gap: 10 }}>
            {currentLog.trackingType !== "duration" ? (
              <Text style={{ color: colors.textMuted, fontFamily: fonts.bodySemiBold, fontSize: 11, textTransform: "uppercase" }}>
                Log Set {currentLog.sets.length + 1}
              </Text>
            ) : null}
            {currentLog.trackingType === "reps_only" ? (
              <NumberField label="Reps" value={repsInput} onChange={setRepsInput} />
            ) : currentLog.trackingType !== "duration" ? (
              <View style={{ flexDirection: "row", gap: 10 }}>
                <NumberField label="Weight (kg)" value={weightInput} onChange={setWeightInput} />
                <NumberField label="Reps" value={repsInput} onChange={setRepsInput} />
              </View>
            ) : null}
            {logSetError ? (
              <Text style={{ color: colors.error, fontFamily: fonts.body, fontSize: 12, textAlign: "center" }}>{logSetError}</Text>
            ) : null}
            <Pressable
              disabled={loggingSet}
              onPress={handleLogSet}
              style={{ backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: "center", opacity: loggingSet ? 0.6 : 1 }}
            >
              {loggingSet ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={{ color: colors.background, fontFamily: fonts.bodySemiBold, fontSize: 15 }}>Log Set</Text>
              )}
            </Pressable>
          </View>

          {slotCompletedSets > 0 ? (
            <View style={{ gap: 8 }}>
              <Text style={{ color: colors.textMuted, fontFamily: fonts.bodySemiBold, fontSize: 11, textTransform: "uppercase" }}>Completed Sets</Text>
              {logsForCurrentSlot.flatMap((slotLog) =>
                slotLog.sets.map((set) => {
                  const isEditing = editingSet?.logId === slotLog.id && editingSet?.setNumber === set.setNumber;
                  if (isEditing) {
                    return (
                      <View key={`${slotLog.id}-${set.setNumber}`} style={{ backgroundColor: colors.background, borderRadius: 10, padding: 10, gap: 8 }}>
                        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                          <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 13, width: 52 }}>Set {set.setNumber}</Text>
                          {slotLog.trackingType === "duration" ? (
                            <NumberField label="" value={editDurationInput} onChange={setEditDurationInput} placeholder="sec" />
                          ) : slotLog.trackingType === "reps_only" ? (
                            <NumberField label="" value={editRepsInput} onChange={setEditRepsInput} placeholder="reps" />
                          ) : (
                            <>
                              <NumberField label="" value={editWeightInput} onChange={setEditWeightInput} placeholder="kg" />
                              <NumberField label="" value={editRepsInput} onChange={setEditRepsInput} placeholder="reps" />
                            </>
                          )}
                        </View>
                        <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12 }}>
                          <Pressable onPress={() => setEditingSet(null)}>
                            <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 13 }}>Cancel</Text>
                          </Pressable>
                          <Pressable onPress={() => saveEditSet(slotLog)}>
                            <Text style={{ color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 13 }}>Save</Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  }
                  return (
                    <View key={`${slotLog.id}-${set.setNumber}`} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.background, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 }}>
                      <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 13 }}>Set {set.setNumber}</Text>
                      {slotLog.trackingType === "duration" ? (
                        <Text style={{ color: colors.accent, fontFamily: fonts.heading, fontSize: 15 }}>{formatTime(set.duration ?? 0)}</Text>
                      ) : slotLog.trackingType === "reps_only" ? (
                        <Text style={{ color: colors.accent, fontFamily: fonts.heading, fontSize: 15 }}>{set.reps} reps</Text>
                      ) : (
                        <Text style={{ color: colors.text, fontFamily: fonts.heading, fontSize: 15 }}>
                          {set.weight}kg × <Text style={{ color: colors.accent }}>{set.reps} reps</Text>
                        </Text>
                      )}
                      <View style={{ flexDirection: "row", gap: 14 }}>
                        <Pressable onPress={() => startEditSet(slotLog.id, set)}>
                          <Text style={{ color: colors.textMuted, fontSize: 13 }}>Edit</Text>
                        </Pressable>
                        <Pressable onPress={() => deleteSet(slotLog, set.setNumber)}>
                          <Text style={{ color: colors.error, fontSize: 13 }}>Delete</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          ) : null}

          {currentExerciseHistory.length > 0 ? (
            <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: colors.secondary, paddingTop: 12 }}>
              <Text style={{ color: colors.textMuted, fontFamily: fonts.bodySemiBold, fontSize: 11, textTransform: "uppercase" }}>History</Text>
              {currentExerciseHistory.map((entry) => (
                <View key={entry.date} style={{ backgroundColor: colors.background, borderRadius: 8, padding: 10, gap: 6 }}>
                  <Text style={{ color: colors.textMuted, fontFamily: fonts.bodySemiBold, fontSize: 12 }}>
                    {formatDisplayDate(parseLocalDate(entry.date))}
                  </Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    {entry.sets.map((set) => (
                      <View key={set.setNumber} style={{ backgroundColor: colors.surface, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
                        <Text style={{ color: colors.text, fontFamily: fonts.body, fontSize: 11 }}>
                          {currentLog.trackingType === "duration"
                            ? formatTime(set.duration ?? 0)
                            : currentLog.trackingType === "reps_only"
                              ? `${set.reps} reps`
                              : `${set.weight}kg × ${set.reps}`}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Pressable
          disabled={currentExerciseIndex === 0}
          onPress={() => navigateExercise(currentExerciseIndex - 1)}
          style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 10, paddingVertical: 12, alignItems: "center", opacity: currentExerciseIndex === 0 ? 0.4 : 1 }}
        >
          <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold }}>Previous</Text>
        </Pressable>
        <Pressable
          disabled={currentExerciseIndex >= totalExercises - 1}
          onPress={() => navigateExercise(currentExerciseIndex + 1)}
          style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 10, paddingVertical: 12, alignItems: "center", opacity: currentExerciseIndex >= totalExercises - 1 ? 0.4 : 1 }}
        >
          <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold }}>Next</Text>
        </Pressable>
      </View>

      <Modal visible={altSwapOpen} transparent animationType="fade" onRequestClose={() => setAltSwapOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "#000000a0", justifyContent: "flex-end" }} onPress={() => setAltSwapOpen(false)}>
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: "70%", padding: 16, gap: 8 }}>
            <Text style={{ color: colors.text, fontFamily: fonts.heading, fontSize: 16, textTransform: "uppercase" }}>Swap Exercise</Text>
            {currentExerciseAlternatives.map((alt) => (
              <View
                key={alt.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  padding: 10,
                  borderRadius: 10,
                  backgroundColor: currentLog?.exerciseTemplateId === alt.id ? colors.background : "transparent",
                }}
              >
                {alt.imageUrl ? (
                  // A sibling of the selecting Pressable below, not nested inside it: a tappable
                  // image nested inside a tappable row left touch priority to RN's gesture-
                  // responder negotiation, which didn't reliably pick the small inner one.
                  <ZoomableThumbnail uri={alt.imageUrl} alt={alt.name} style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: colors.text }} />
                ) : (
                  <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: colors.background }} />
                )}
                <Pressable onPress={() => switchToExercise(alt.id)} style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
                  <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 13, flex: 1 }}>{alt.name}</Text>
                  {currentLog?.exerciseTemplateId === alt.id ? <Text style={{ color: colors.primary }}>✓</Text> : null}
                </Pressable>
              </View>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}
