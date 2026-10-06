import { FlatList, Pressable, Text, View } from "react-native";
import { Link } from "expo-router";
import { usePrograms } from "../../../hooks/usePrograms";
import { useAuth } from "../../../hooks/useAuth";
import { getVisiblePrograms } from "../../../core/services/program.service";
import { PROGRAM_DIFFICULTIES, difficultyLabel } from "../../../core/models/workout.model";
import { colors, fonts } from "../../../core/theme/tokens";

export default function ProgramList() {
  const { programs } = usePrograms();
  const { isAdmin } = useAuth();
  const visible = getVisiblePrograms(programs, isAdmin);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={visible}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListHeaderComponent={
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 13 }}>{visible.length} programs</Text>
            {isAdmin ? (
              <Link href="/(tabs)/programs/new" asChild>
                <Pressable style={{ backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 }}>
                  <Text style={{ color: colors.background, fontFamily: fonts.bodySemiBold, fontSize: 13 }}>+ New Program</Text>
                </Pressable>
              </Link>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <Text style={{ color: colors.textMuted, fontFamily: fonts.body, textAlign: "center", marginTop: 40 }}>
            No training programs yet.
          </Text>
        }
        renderItem={({ item }) => {
          const stars = PROGRAM_DIFFICULTIES.find((d) => d.value === item.difficulty)?.stars ?? 0;
          return (
            <Link href={{ pathname: "/(tabs)/programs/[id]", params: { id: item.id } }} asChild>
              <Pressable style={{ backgroundColor: colors.surface, borderRadius: 14, padding: 18, gap: 10, borderWidth: item.isActive ? 1 : 0, borderColor: colors.primary }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <Text style={{ color: colors.text, fontFamily: fonts.heading, fontSize: 18, textTransform: "uppercase", flex: 1 }}>{item.name}</Text>
                  {isAdmin && !item.isActive ? (
                    <View style={{ backgroundColor: colors.warning + "26", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ color: colors.warning, fontFamily: fonts.bodySemiBold, fontSize: 10, textTransform: "uppercase" }}>Draft</Text>
                    </View>
                  ) : null}
                  {item.isActive ? (
                    <View style={{ backgroundColor: colors.accent + "26", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ color: colors.accent, fontFamily: fonts.bodySemiBold, fontSize: 10, textTransform: "uppercase" }}>Published</Text>
                    </View>
                  ) : null}
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.primary, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" }}>
                  <Text style={{ fontSize: 12 }}>{"★".repeat(stars)}{"☆".repeat(5 - stars)}</Text>
                  <Text style={{ color: colors.background, fontFamily: fonts.bodySemiBold, fontSize: 11, textTransform: "uppercase" }}>
                    {difficultyLabel(item.difficulty)}
                  </Text>
                </View>
                <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 13 }}>
                  {item.totalDays} days · {item.sessionsPerWeek} times/week
                </Text>
              </Pressable>
            </Link>
          );
        }}
      />
    </View>
  );
}
