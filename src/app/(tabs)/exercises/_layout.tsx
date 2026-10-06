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
      <Stack.Screen name="[id]" options={{ title: "Exercise" }} />
    </Stack>
  );
}
