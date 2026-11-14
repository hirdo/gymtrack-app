import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { usePrograms } from "../../../../hooks/usePrograms";
import { useExercises } from "../../../../hooks/useExercises";
import { useWorkouts } from "../../../../hooks/useWorkouts";
import { useExerciseLogs } from "../../../../hooks/useExerciseLogs";
import { useAuth } from "../../../../hooks/useAuth";
import { getExerciseById } from "../../../../core/services/exercise-library.service";
import { chooseProgram, deleteProgram, getUserActiveWorkout, setProgramActive } from "../../../../core/services/program.service";
import { PROGRAM_DIFFICULTIES, difficultyLabel } from "../../../../core/models/workout.model";
import { formatDurationValue } from "../../../../core/utils/date.util";
import { ZoomableThumbnail } from "../../../../components/ZoomableThumbnail";
import { colors, fonts } from "../../../../core/theme/tokens";

export default function ProgramDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { programs } = usePrograms();
  const { exercises } = useExercises();
  const { workouts } = useWorkouts();
  const { logs } = useExerciseLogs();
  const { isAdmin, userId } = useAuth();

  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());
  const [choosing, setChoosing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [replaceConfirm, setReplaceConfirm] = useState<{ name: string } | null>(null);

  const raw = programs.find((p) => p.id === id);
  const program = raw && (raw.isActive || isAdmin) ? raw : undefined;

  const activeWorkout = getUserActiveWorkout(workouts);
  const isMyActiveProgram = !!program && activeWorkout?.programId === program.id;

  if (!program) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", gap: 16 }}>
        <Text style={{ color: colors.textMuted, fontFamily: fonts.body }}>Program not found.</Text>
        <Pressable onPress={() => router.back()} style={{ backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20 }}>
          <Text style={{ color: colors.background, fontFamily: fonts.bodySemiBold }}>Back to Programs</Text>
        </Pressable>
      </View>
    );
  }

  const stars = PROGRAM_DIFFICULTIES.find((d) => d.value === program.difficulty)?.stars ?? 0;

  function toggleDay(dayNumber: number) {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayNumber)) next.delete(dayNumber);
      else next.add(dayNumber);
      return next;
    });
  }

  async function doChoose() {
    if (!userId || choosing) return;
    setChoosing(true);
    try {
      await chooseProgram(program!, workouts, logs, exercises, userId);
      router.push("/(tabs)/workouts");
    } finally {
      setChoosing(false);
    }
  }

  function handleChoosePress() {
    if (activeWorkout && activeWorkout.programId !== program!.id) {
      const current = programs.find((p) => p.id === activeWorkout.programId);
      setReplaceConfirm({ name: current?.name ?? "your current program" });
      return;
    }
    doChoose();
  }

  async function handlePublishToggle() {
    if (publishing) return;
    setPublishing(true);
    try {
      await setProgramActive(program!.id, !program!.isActive);
    } finally {
      setPublishing(false);
    }
  }

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteProgram(program!.id);
      router.replace("/(tabs)/programs");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, gap: 16 }}>
      <View style={{ gap: 10 }}>
        <Text style={{ color: colors.text, fontFamily: fonts.heading, fontSize: 26, textTransform: "uppercase" }}>{program.name}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.primary, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontSize: 12 }}>{"★".repeat(stars)}{"☆".repeat(5 - stars)}</Text>
            <Text style={{ color: colors.background, fontFamily: fonts.bodySemiBold, fontSize: 11, textTransform: "uppercase" }}>
              {difficultyLabel(program.difficulty)}
            </Text>
          </View>
          <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 13 }}>
            {program.totalDays} days · {program.sessionsPerWeek} times/week
          </Text>
          {program.isActive ? (
            <Text style={{ color: colors.accent, fontFamily: fonts.bodySemiBold, fontSize: 12 }}>✓ Published</Text>
          ) : isAdmin ? (
            <Text style={{ color: colors.warning, fontFamily: fonts.bodySemiBold, fontSize: 12 }}>Draft</Text>
          ) : null}
        </View>
      </View>

      {program.description ? (
        <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 13, lineHeight: 20 }}>{program.description}</Text>
      ) : null}

      <View style={{ gap: 10 }}>
        {isMyActiveProgram ? (
          <View style={{ backgroundColor: colors.accent + "1a", borderRadius: 10, paddingVertical: 12, alignItems: "center" }}>
            <Text style={{ color: colors.accent, fontFamily: fonts.bodySemiBold, fontSize: 14 }}>✓ Your Active Program</Text>
          </View>
        ) : (
          <Pressable disabled={choosing} onPress={handleChoosePress} style={{ backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 14, alignItems: "center", opacity: choosing ? 0.6 : 1 }}>
            {choosing ? <ActivityIndicator color={colors.background} /> : <Text style={{ color: colors.background, fontFamily: fonts.bodySemiBold, fontSize: 15 }}>Choose Program</Text>}
          </Pressable>
        )}

        {isAdmin ? (
          <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
            <Pressable disabled={publishing} onPress={handlePublishToggle} style={{ backgroundColor: colors.surface, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 }}>
              <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 13 }}>
                {publishing ? "..." : program.isActive ? "Unpublish" : "Publish"}
              </Text>
            </Pressable>
            <Pressable onPress={() => router.push({ pathname: "/(tabs)/programs/[id]/edit", params: { id: program.id } })} style={{ backgroundColor: colors.surface, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 }}>
              <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 13 }}>Edit</Text>
            </Pressable>
            {confirmingDelete ? (
              <>
                <Pressable disabled={deleting} onPress={handleDelete} style={{ backgroundColor: colors.error, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 }}>
                  <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 13 }}>{deleting ? "..." : "Confirm Delete"}</Text>
                </Pressable>
                <Pressable onPress={() => setConfirmingDelete(false)} style={{ backgroundColor: colors.surface, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 }}>
                  <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 13 }}>Cancel</Text>
                </Pressable>
              </>
            ) : (
              <Pressable onPress={() => setConfirmingDelete(true)} style={{ backgroundColor: colors.surface, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 }}>
                <Text style={{ color: colors.error, fontFamily: fonts.bodySemiBold, fontSize: 13 }}>Delete</Text>
              </Pressable>
            )}
          </View>
        ) : null}
      </View>

      <View style={{ gap: 10 }}>
        <Text style={{ color: colors.text, fontFamily: fonts.heading, fontSize: 18, textTransform: "uppercase" }}>Training Days</Text>
        {program.days.map((day) => {
          const expanded = expandedDays.has(day.dayNumber);
          return (
            <View key={day.dayNumber} style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 14, gap: expanded ? 10 : 0 }}>
              <Pressable onPress={() => toggleDay(day.dayNumber)} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 14, flex: 1 }} numberOfLines={1}>
                  <Text style={{ color: colors.primary }}>Day {day.dayNumber + 1}:{"  "}</Text>
                  {day.name}
                  <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 11 }}> · {day.exercises.length} exercise{day.exercises.length === 1 ? "" : "s"}</Text>
                </Text>
                <Text style={{ color: colors.textMuted }}>{expanded ? "▴" : "▾"}</Text>
              </Pressable>
              {expanded
                ? day.exercises.map((ex) => {
                    const img = getExerciseById(exercises, ex.exerciseId)?.imageUrl;
                    return (
                      <View key={ex.exerciseId} style={{ backgroundColor: colors.background, borderRadius: 10, padding: 10, gap: 8 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                          {img ? (
                            <ZoomableThumbnail uri={img} alt={ex.exerciseName} style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: colors.text }} />
                          ) : null}
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.text, fontFamily: fonts.body, fontSize: 13 }}>{ex.exerciseName}</Text>
                            <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 11 }}>
                              {ex.trackingType === "duration"
                                ? `${ex.targetSets} × ${formatDurationValue(ex.targetDuration ?? 0, ex.targetDurationUnit)}`
                                : `${ex.targetSets} × ${ex.targetReps}${ex.targetWeight ? ` · ${ex.targetWeight}kg` : ""}`}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })
                : null}
            </View>
          );
        })}
      </View>

      {replaceConfirm ? (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#000000a0", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 20, gap: 12, width: "100%" }}>
            <Text style={{ color: colors.text, fontFamily: fonts.heading, fontSize: 16, textTransform: "uppercase" }}>Replace Active Program?</Text>
            <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 13, lineHeight: 19 }}>
              You&apos;re currently following {replaceConfirm.name}. Choosing this program will delete any not-yet-completed workouts from it.
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable onPress={() => setReplaceConfirm(null)} style={{ flex: 1, backgroundColor: colors.background, borderRadius: 10, paddingVertical: 12, alignItems: "center" }}>
                <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setReplaceConfirm(null);
                  doChoose();
                }}
                style={{ flex: 1, backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 12, alignItems: "center" }}
              >
                <Text style={{ color: colors.background, fontFamily: fonts.bodySemiBold }}>Replace It</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}
