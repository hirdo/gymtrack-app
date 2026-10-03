import { FlatList, Pressable, Text, View } from "react-native";
import { Link, router } from "expo-router";
import { useWorkouts } from "../../../hooks/useWorkouts";
import { formatDisplayDate } from "../../../core/utils/date.util";
import { colors, fonts } from "../../../core/theme/tokens";

export default function WorkoutsList() {
  const { workouts } = useWorkouts();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={workouts}
        keyExtractor={(w) => w.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListEmptyComponent={
          <Text style={{ color: colors.textMuted, fontFamily: fonts.body, textAlign: "center", marginTop: 40 }}>
            No workouts yet. Tap + to log your first one.
          </Text>
        }
        renderItem={({ item }) => (
          <Link href={{ pathname: "/(tabs)/workouts/[id]", params: { id: item.id } }} asChild>
            <Pressable
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 14,
                gap: 2,
              }}
            >
              <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 16 }}>{item.name}</Text>
              <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 13 }}>
                {item.completedDate
                  ? `Completed ${formatDisplayDate(new Date(item.completedDate))}`
                  : "Not completed yet"}
              </Text>
            </Pressable>
          </Link>
        )}
      />

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
