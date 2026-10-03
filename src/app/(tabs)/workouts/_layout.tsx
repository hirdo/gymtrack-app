import { Stack } from "expo-router";
import { colors, fonts } from "../../../core/theme/tokens";

export default function WorkoutsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fonts.heading },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Workouts" }} />
      <Stack.Screen name="[id]" options={{ title: "Workout" }} />
      <Stack.Screen name="new" options={{ title: "New workout", presentation: "modal" }} />
    </Stack>
  );
}
