import { Stack } from "expo-router";
import { colors, fonts } from "../../../core/theme/tokens";

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fonts.heading },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Profile" }} />
      <Stack.Screen name="admin" options={{ title: "Admin" }} />
    </Stack>
  );
}
