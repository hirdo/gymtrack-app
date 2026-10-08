// RN port of gymtrack-web's WorkoutListComponent: category filter, a "From Your Program"
// section (program-generated workouts, visible only while their run is still active) and a
// "My Workouts" section (self-created), each card showing Completed/Scheduled/Pending status.
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Link, router } from "expo-router";
import { useWorkouts } from "../../../hooks/useWorkouts";
import { getUserActiveWorkout } from "../../../core/services/program.service";
import { formatDisplayDate, parseLocalDate } from "../../../core/utils/date.util";
import type { Workout, WorkoutCategory } from "../../../core/models/workout.model";
import { LoadingSpinner } from "../../../components/LoadingSpinner";
import { colors, fonts } from "../../../core/theme/tokens";

const CATEGORIES: { value: WorkoutCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "strength", label: "Strength" },
  { value: "cardio", label: "Cardio" },
  { value: "flexibility", label: "Flexibility" },
  { value: "hiit", label: "HIIT" },
  { value: "custom", label: "Custom" },
];

function WorkoutStatus({ workout }: { workout: Workout }) {
  if (workout.completedDate) {
    return (
      <Text style={{ color: colors.accent, fontFamily: fonts.bodySemiBold, fontSize: 11 }}>
        Completed {formatDisplayDate(new Date(workout.completedDate))}
      </Text>
    );
  }
  if (workout.scheduledDate) {
    return <Text style={{ color: colors.warning, fontFamily: fonts.bodySemiBold, fontSize: 11 }}>Scheduled</Text>;
  }
  return <Text style={{ color: colors.textMuted, fontFamily: fonts.bodySemiBold, fontSize: 11 }}>Pending</Text>;
}

function WorkoutCard({ workout }: { workout: Workout }) {
  return (
    <Link href={{ pathname: "/(tabs)/workouts/[id]", params: { id: workout.id } }} asChild>
      <Pressable style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 14, gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ backgroundColor: colors.background, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 10, textTransform: "uppercase" }}>
              {workout.category}
            </Text>
          </View>
          {workout.scheduledDate ? (
            <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 11 }}>
              {formatDisplayDate(parseLocalDate(workout.scheduledDate))}
            </Text>
          ) : null}
        </View>
        <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 16 }}>{workout.name}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
          <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 12 }}>{workout.exercises.length} exercises</Text>
          <WorkoutStatus workout={workout} />
        </View>
      </Pressable>
    </Link>
  );
}

export default function WorkoutsList() {
  const { workouts, isLoading } = useWorkouts();
  const [selectedCategory, setSelectedCategory] = useState<WorkoutCategory | "all">("all");

  const activeRunId = getUserActiveWorkout(workouts)?.programRunId;
  const visibleWorkouts = useMemo(
    () => workouts.filter((w) => !w.programRunId || w.programRunId === activeRunId),
    [workouts, activeRunId]
  );
  const categoryFiltered = useMemo(
    () => (selectedCategory === "all" ? visibleWorkouts : visibleWorkouts.filter((w) => w.category === selectedCategory)),
    [visibleWorkouts, selectedCategory]
  );

  const programWorkouts = useMemo(
    () => categoryFiltered.filter((w) => !!w.programId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [categoryFiltered]
  );
  const selfCreatedWorkouts = useMemo(
    () =>
      categoryFiltered
        .filter((w) => !w.programId)
        .sort((a, b) => (a.scheduledDate || "9999-99-99").localeCompare(b.scheduledDate || "9999-99-99")),
    [categoryFiltered]
  );

  const isEmpty = programWorkouts.length === 0 && selfCreatedWorkouts.length === 0;

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <LoadingSpinner label="Loading workouts..." />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 90, gap: 18 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.value;
            return (
              <Pressable
                key={cat.value}
                onPress={() => setSelectedCategory(cat.value)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 8,
                  backgroundColor: active ? colors.primary : colors.surface,
                }}
              >
                <Text style={{ color: active ? colors.background : colors.textMuted, fontFamily: fonts.bodySemiBold, fontSize: 12, textTransform: "uppercase" }}>
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {isEmpty ? (
          <View style={{ alignItems: "center", paddingVertical: 48, gap: 12 }}>
            <Text style={{ color: colors.textMuted, fontFamily: fonts.heading, fontSize: 16 }}>
              {selectedCategory === "all" ? "No workouts yet" : `No ${selectedCategory} workouts`}
            </Text>
            {selectedCategory === "all" ? (
              <Pressable onPress={() => router.push("/(tabs)/workouts/new")} style={{ backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20 }}>
                <Text style={{ color: colors.background, fontFamily: fonts.bodySemiBold, fontSize: 13 }}>Create Your First Workout</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => setSelectedCategory("all")} style={{ backgroundColor: colors.surface, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20 }}>
                <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 13 }}>Show All Workouts</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <>
            {programWorkouts.length > 0 ? (
              <View style={{ gap: 10 }}>
                <Text style={{ color: colors.text, fontFamily: fonts.heading, fontSize: 16, textTransform: "uppercase" }}>From Your Program</Text>
                {programWorkouts.map((w) => (
                  <WorkoutCard key={w.id} workout={w} />
                ))}
              </View>
            ) : null}

            {selfCreatedWorkouts.length > 0 ? (
              <View style={{ gap: 10 }}>
                <Text style={{ color: colors.text, fontFamily: fonts.heading, fontSize: 16, textTransform: "uppercase" }}>My Workouts</Text>
                {selfCreatedWorkouts.map((w) => (
                  <WorkoutCard key={w.id} workout={w} />
                ))}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <Pressable
        onPress={() => router.push("/(tabs)/workouts/new")}
        style={{
          position: "absolute",
          right: 20,
          bottom: 20,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.primary,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: colors.text, fontSize: 28, lineHeight: 28 }}>+</Text>
      </Pressable>
    </View>
  );
}
