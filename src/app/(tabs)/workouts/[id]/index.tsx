import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useWorkouts } from "../../../../hooks/useWorkouts";
import { useExerciseLogs } from "../../../../hooks/useExerciseLogs";
import { useAuthStore } from "../../../../core/auth/authStore";
import { deleteWorkout, markWorkoutComplete } from "../../../../core/services/workout.service";
import { deleteLogsForWorkout, logsForWorkout, startWorkoutLogs } from "../../../../core/services/exercise-log.service";
import { formatDisplayDate } from "../../../../core/utils/date.util";
import { ZoomableThumbnail } from "../../../../components/ZoomableThumbnail";
import { colors, fonts } from "../../../../core/theme/tokens";

function IconButton({ icon, color, onPress }: { icon: keyof typeof Ionicons.glyphMap; color: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}
    >
      <Ionicons name={icon} size={18} color={color} />
    </Pressable>
  );
}

export default function WorkoutDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { workouts } = useWorkouts();
  const { logs } = useExerciseLogs();
  const userId = useAuthStore((s) => s.userId);
  const workout = workouts.find((w) => w.id === id);
  const [isStarting, setIsStarting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const workoutLogs = useMemo(() => (workout ? logsForWorkout(logs, workout.id) : []), [logs, workout]);
  const hasBeenTrained = workoutLogs.length > 0;

  if (!workout) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: colors.textMuted, fontFamily: fonts.body }}>Workout not found.</Text>
      </View>
    );
  }

  async function handleStartWorkout() {
    if (!userId || !workout || isStarting) return;
    setIsStarting(true);
    try {
      await startWorkoutLogs(workout, userId);
      router.push({ pathname: "/(tabs)/workouts/[id]/train", params: { id: workout.id } });
    } finally {
      setIsStarting(false);
    }
  }

  async function handleMarkComplete() {
    if (isCompleting) return;
    setIsCompleting(true);
    try {
      await markWorkoutComplete(workout!.id);
    } finally {
      setIsCompleting(false);
    }
  }

  async function handleDelete() {
    if (!workout || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteLogsForWorkout(logs, workout.id);
      await deleteWorkout(workout.id);
      router.back();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, gap: 16 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: colors.text, fontFamily: fonts.heading, fontSize: 26 }}>{workout.name}</Text>
          {workout.description ? (
            <Text style={{ color: colors.textMuted, fontFamily: fonts.body }}>{workout.description}</Text>
          ) : null}
          <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 13 }}>
            {workout.completedDate
              ? `Completed ${formatDisplayDate(new Date(workout.completedDate))}`
              : "Not completed yet"}
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {!workout.completedDate && !hasBeenTrained ? (
            <IconButton
              icon="pencil-outline"
              color={colors.text}
              onPress={() => router.push({ pathname: "/(tabs)/workouts/[id]/edit", params: { id: workout.id } })}
            />
          ) : null}
          {!workout.programId ? (
            <IconButton icon="trash-outline" color={colors.error} onPress={() => setConfirmingDelete(true)} />
          ) : null}
        </View>
      </View>

      {confirmingDelete ? (
        <View style={{ flexDirection: "row", gap: 10, alignItems: "center", backgroundColor: colors.surface, borderRadius: 12, padding: 12 }}>
          <Text style={{ color: colors.error, fontFamily: fonts.bodySemiBold, fontSize: 13, flex: 1 }}>Delete this workout?</Text>
          <Pressable
            disabled={isDeleting}
            onPress={handleDelete}
            style={{ backgroundColor: colors.error, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, opacity: isDeleting ? 0.6 : 1 }}
          >
            {isDeleting ? <ActivityIndicator color={colors.text} /> : <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 13 }}>Confirm</Text>}
          </Pressable>
          <Pressable disabled={isDeleting} onPress={() => setConfirmingDelete(false)} style={{ backgroundColor: colors.background, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 }}>
            <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 13 }}>Cancel</Text>
          </Pressable>
        </View>
      ) : null}

      {!workout.completedDate ? (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            disabled={isStarting}
            onPress={hasBeenTrained ? () => router.push({ pathname: "/(tabs)/workouts/[id]/train", params: { id: workout.id } }) : handleStartWorkout}
            style={{
              flex: 1,
              backgroundColor: colors.primary,
              paddingVertical: 14,
              borderRadius: 10,
              alignItems: "center",
              opacity: isStarting ? 0.6 : 1,
            }}
          >
            {isStarting ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={{ color: colors.background, fontFamily: fonts.bodySemiBold, fontSize: 16 }}>
                {hasBeenTrained ? "Continue Workout" : "Start Workout"}
              </Text>
            )}
          </Pressable>
          {/* Guarded by !isStarting: starting a never-trained workout writes its exercise logs
              before navigating to Train, and the live Firestore subscription can flip
              hasBeenTrained to true a moment before the navigation transition finishes — without
              this guard, the Complete button flashed on screen for an instant during that gap. */}
          {hasBeenTrained && !isStarting ? (
            <Pressable
              disabled={isCompleting}
              onPress={handleMarkComplete}
              style={{
                flex: 1,
                backgroundColor: colors.accent,
                paddingVertical: 14,
                borderRadius: 10,
                alignItems: "center",
                opacity: isCompleting ? 0.6 : 1,
              }}
            >
              {isCompleting ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 16 }}>Complete</Text>
              )}
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={{ gap: 10 }}>
        {workout.exercises.map((exercise, index) => {
          const exerciseLogs = workoutLogs.filter((l) => l.exerciseIndex === index);
          return (
            <View key={`${exercise.id}-${index}`} style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                {exercise.imageUrl ? (
                  <ZoomableThumbnail
                    uri={exercise.imageUrl}
                    alt={exercise.name}
                    style={{ width: 56, height: 56, borderRadius: 10, backgroundColor: colors.text }}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={{ width: 56, height: 56, borderRadius: 10, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: colors.primary, fontFamily: fonts.heading, fontSize: 18 }}>{index + 1}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 16 }}>{exercise.name}</Text>
                  <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 13, marginTop: 2 }}>
                    {exercise.sets} sets{exercise.reps ? ` x ${exercise.reps} reps` : ""}
                    {exercise.weight ? ` @ ${exercise.weight}kg` : ""}
                  </Text>
                </View>
              </View>

              {workout.completedDate && exerciseLogs.some((l) => l.sets.length > 0) ? (
                <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.secondary, gap: 6 }}>
                  <Text style={{ color: colors.textMuted, fontFamily: fonts.bodySemiBold, fontSize: 10, textTransform: "uppercase" }}>
                    Logged Sets
                  </Text>
                  {exerciseLogs.flatMap((log) =>
                    log.sets.map((set) => (
                      <View key={`${log.id}-${set.setNumber}`} style={{ flexDirection: "row", justifyContent: "space-between", backgroundColor: colors.background, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                        <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 12 }}>Set {set.setNumber}</Text>
                        {log.trackingType === "duration" ? (
                          <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 12 }}>{set.duration ?? 0}s</Text>
                        ) : log.trackingType === "reps_only" ? (
                          <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 12 }}>{set.reps} reps</Text>
                        ) : (
                          <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 12 }}>{set.weight}kg × {set.reps} reps</Text>
                        )}
                      </View>
                    ))
                  )}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
