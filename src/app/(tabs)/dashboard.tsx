// RN port of gymtrack-web's DashboardComponent. Skips the count-up number animation
// (CountUpDirective) as pure visual flourish — every data section, icon and the circular
// progress ring the web dashboard shows is kept (via Ionicons + RingProgress/react-native-svg).
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { useWorkouts } from "../../hooks/useWorkouts";
import { usePrograms } from "../../hooks/usePrograms";
import { useProfile } from "../../hooks/useProfile";
import { useExerciseLogs } from "../../hooks/useExerciseLogs";
import { getUserActiveWorkout } from "../../core/services/program.service";
import { logsForWorkout } from "../../core/services/exercise-log.service";
import { difficultyLabel, PROGRAM_DIFFICULTIES } from "../../core/models/workout.model";
import type { ExerciseLog, Workout } from "../../core/models/workout.model";
import { formatDisplayDate } from "../../core/utils/date.util";
import { RingProgress } from "../../components/RingProgress";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { colors, fonts } from "../../core/theme/tokens";

type IoniconName = keyof typeof Ionicons.glyphMap;

function StatCard({ label, value, tint, icon }: { label: string; value: number | string; tint: string; icon: IoniconName }) {
  return (
    <View style={{ flex: 1, minWidth: "45%", backgroundColor: colors.surface, borderRadius: 12, padding: 14, gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ color: colors.textMuted, fontFamily: fonts.bodySemiBold, fontSize: 11, textTransform: "uppercase" }}>{label}</Text>
        <Ionicons name={icon} size={16} color={tint} />
      </View>
      <Text style={{ color: tint, fontFamily: fonts.heading, fontSize: 26 }}>{value}</Text>
    </View>
  );
}

function QuickAction({ title, subtitle, icon, tint, onPress }: { title: string; subtitle: string; icon: IoniconName; tint: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ flex: 1, minWidth: "45%", backgroundColor: colors.surface, borderRadius: 12, padding: 14, gap: 8 }}>
      <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: tint + "1a", alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={17} color={tint} />
      </View>
      <View>
        <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 13 }}>{title}</Text>
        <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 11 }}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

function workoutCompletionPercent(workout: Workout, logs: ExerciseLog[]): number {
  const totalTarget = workout.exercises.reduce((sum, ex) => sum + (ex.sets || 0), 0);
  if (totalTarget === 0) return 0;
  const totalCompleted = logsForWorkout(logs, workout.id).reduce((sum, log) => sum + log.sets.length, 0);
  return Math.min(100, Math.round((totalCompleted / totalTarget) * 100));
}

export default function Dashboard() {
  const { workouts, isLoading: workoutsLoading, streak, thisWeekCount, totalWorkouts, completedWorkouts, recent } = useWorkouts();
  const { programs, isLoading: programsLoading } = usePrograms();
  const { profile } = useProfile();
  const { logs } = useExerciseLogs();

  const activeWorkout = getUserActiveWorkout(workouts);
  const activeProgram = activeWorkout ? programs.find((p) => p.id === activeWorkout.programId) : undefined;
  const activeProgramCompletedDays = activeWorkout?.programRunId
    ? workouts.filter((w) => w.programRunId === activeWorkout.programRunId && w.completedDate).length
    : 0;
  const activeProgramProgress =
    activeProgram && activeProgram.totalDays > 0
      ? Math.min(100, Math.round((activeProgramCompletedDays / activeProgram.totalDays) * 100))
      : 0;
  const activeProgramStars = activeProgram ? PROGRAM_DIFFICULTIES.find((d) => d.value === activeProgram.difficulty)?.stars ?? 0 : 0;

  if (workoutsLoading || programsLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <LoadingSpinner label="Loading your dashboard..." />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, gap: 18 }}>
      <View style={{ gap: 2 }}>
        <Text style={{ color: colors.textMuted, fontFamily: fonts.bodySemiBold, fontSize: 11, textTransform: "uppercase" }}>Welcome back</Text>
        <Text style={{ color: colors.text, fontFamily: fonts.heading, fontSize: 26, textTransform: "uppercase" }}>
          {profile?.firstName || "there"}
        </Text>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <StatCard label="Total Workouts" value={totalWorkouts} tint={colors.primary} icon="clipboard-outline" />
        <StatCard label="Completed" value={completedWorkouts} tint={colors.accent} icon="checkmark-circle-outline" />
        <StatCard label="This Week" value={thisWeekCount} tint={colors.warning} icon="trending-up-outline" />
        <StatCard label="Streak" value={`${streak}d`} tint={colors.primaryLight} icon="flame-outline" />
      </View>

      {activeProgram ? (
        <Pressable onPress={() => router.push({ pathname: "/(tabs)/programs/[id]", params: { id: activeProgram.id } })}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 14, padding: 16, gap: 8, borderWidth: 1, borderColor: colors.primary + "4d" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="trophy-outline" size={13} color={colors.textMuted} />
                <Text style={{ color: colors.textMuted, fontFamily: fonts.bodySemiBold, fontSize: 11, textTransform: "uppercase" }}>Active Program</Text>
              </View>
              <Text style={{ color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 12 }}>View ›</Text>
            </View>
            <Text style={{ color: colors.text, fontFamily: fonts.heading, fontSize: 19, textTransform: "uppercase" }}>{activeProgram.name}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.primary, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" }}>
              <Text style={{ fontSize: 11 }}>{"★".repeat(activeProgramStars)}{"☆".repeat(5 - activeProgramStars)}</Text>
              <Text style={{ color: colors.background, fontFamily: fonts.bodySemiBold, fontSize: 10, textTransform: "uppercase" }}>
                {difficultyLabel(activeProgram.difficulty)}
              </Text>
            </View>
            <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 12 }}>
              {activeProgramCompletedDays}/{activeProgram.totalDays} days completed · {activeProgram.sessionsPerWeek} times/week
            </Text>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.background, overflow: "hidden" }}>
              <View style={{ width: `${activeProgramProgress}%`, height: "100%", backgroundColor: colors.primary }} />
            </View>
          </View>
        </Pressable>
      ) : null}

      <View style={{ gap: 10 }}>
        <Text style={{ color: colors.text, fontFamily: fonts.heading, fontSize: 16, textTransform: "uppercase" }}>Quick Actions</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          <QuickAction title="New Workout" subtitle="Create a new workout plan" icon="add-circle-outline" tint={colors.primary} onPress={() => router.push("/(tabs)/workouts/new")} />
          <QuickAction title="My Workouts" subtitle="View all your workout plans" icon="list-outline" tint={colors.accent} onPress={() => router.push("/(tabs)/workouts")} />
          <QuickAction title="Schedule" subtitle="Plan your training week" icon="calendar-outline" tint={colors.warning} onPress={() => router.push("/(tabs)/schedule")} />
          <QuickAction title="Programs" subtitle="Training plans & progress" icon="clipboard-outline" tint={colors.primaryLight} onPress={() => router.push("/(tabs)/programs")} />
        </View>
      </View>

      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: colors.text, fontFamily: fonts.heading, fontSize: 16, textTransform: "uppercase" }}>Recent Workouts</Text>
          <Text onPress={() => router.push("/(tabs)/workouts")} style={{ color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 12 }}>
            View all ›
          </Text>
        </View>

        {recent.length === 0 ? (
          <Text style={{ color: colors.textMuted, fontFamily: fonts.body }}>
            No workouts yet — log your first one from the Workouts tab.
          </Text>
        ) : (
          recent.map((workout) => (
            <Link key={workout.id} href={{ pathname: "/(tabs)/workouts/[id]", params: { id: workout.id } }} asChild>
              <Pressable style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
                <RingProgress
                  percent={workoutCompletionPercent(workout, logs)}
                  size={48}
                  strokeWidth={4}
                  color={workout.completedDate ? colors.accent : colors.primary}
                />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 15 }}>{workout.name}</Text>
                  <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 12 }}>
                    {workout.exercises.length} exercises · {workout.category}
                  </Text>
                </View>
                {workout.completedDate ? (
                  <Text style={{ color: colors.accent, fontFamily: fonts.bodySemiBold, fontSize: 11 }}>
                    Done {formatDisplayDate(new Date(workout.completedDate))}
                  </Text>
                ) : workout.scheduledDate ? (
                  <Text style={{ color: colors.warning, fontFamily: fonts.bodySemiBold, fontSize: 11 }}>Scheduled</Text>
                ) : (
                  <Text style={{ color: colors.textMuted, fontFamily: fonts.bodySemiBold, fontSize: 11 }}>Pending</Text>
                )}
              </Pressable>
            </Link>
          ))
        )}
      </View>
    </ScrollView>
  );
}
