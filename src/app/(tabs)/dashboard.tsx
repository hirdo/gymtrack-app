import { ScrollView, Text, View } from "react-native";
import { Link } from "expo-router";
import { useWorkouts } from "../../hooks/useWorkouts";
import { formatDisplayDate } from "../../core/utils/date.util";
import { colors, fonts } from "../../core/theme/tokens";

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        gap: 4,
      }}
    >
      <Text style={{ color: colors.primary, fontFamily: fonts.heading, fontSize: 28 }}>{value}</Text>
      <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 13 }}>{label}</Text>
    </View>
  );
}

export default function Dashboard() {
  const { streak, thisWeekCount, totalWorkouts, recent } = useWorkouts();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, gap: 16 }}>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <StatCard label="Day streak" value={streak} />
        <StatCard label="This week" value={thisWeekCount} />
        <StatCard label="Total" value={totalWorkouts} />
      </View>

      <Text style={{ color: colors.text, fontFamily: fonts.heading, fontSize: 20, marginTop: 8 }}>
        Recent workouts
      </Text>

      {recent.length === 0 ? (
        <Text style={{ color: colors.textMuted, fontFamily: fonts.body }}>
          No workouts yet — log your first one from the Workouts tab.
        </Text>
      ) : (
        recent.map((workout) => (
          <Link
            key={workout.id}
            href={{ pathname: "/(tabs)/workouts/[id]", params: { id: workout.id } }}
            asChild
          >
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 14,
                gap: 2,
              }}
            >
              <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 16 }}>
                {workout.name}
              </Text>
              <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 13 }}>
                {workout.completedDate
                  ? `Completed ${formatDisplayDate(new Date(workout.completedDate))}`
                  : "Not completed yet"}
              </Text>
            </View>
          </Link>
        ))
      )}
    </ScrollView>
  );
}
