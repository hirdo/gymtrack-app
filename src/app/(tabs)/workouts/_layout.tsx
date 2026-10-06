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
      <Stack.Screen name="[id]/index" options={{ title: "Workout" }} />
      <Stack.Screen name="[id]/train" options={{ title: "Training" }} />
      <Stack.Screen name="new" options={{ title: "New workout", presentation: "modal" }} />
    </Stack>
  );
}
