import { Stack } from "expo-router";
import { colors, fonts } from "../../../core/theme/tokens";

export default function ProgramsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fonts.heading },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Programs" }} />
      <Stack.Screen name="[id]/index" options={{ title: "Program" }} />
      <Stack.Screen name="[id]/edit" options={{ title: "Edit Program", presentation: "modal" }} />
      <Stack.Screen name="new" options={{ title: "New Program", presentation: "modal" }} />
    </Stack>
  );
}
