import { Stack } from "expo-router";
import { colors, fonts } from "../../../core/theme/tokens";

export default function ExercisesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fonts.heading },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Exercise Library" }} />
      <Stack.Screen name="[id]/index" options={{ title: "Exercise" }} />
      <Stack.Screen name="[id]/edit" options={{ title: "Edit Exercise", presentation: "modal" }} />
      <Stack.Screen name="new" options={{ title: "New Exercise", presentation: "modal" }} />
      <Stack.Screen name="bundles/new" options={{ title: "New Bundle", presentation: "modal" }} />
      <Stack.Screen name="bundles/[id]/edit" options={{ title: "Edit Bundle", presentation: "modal" }} />
    </Stack>
  );
}
