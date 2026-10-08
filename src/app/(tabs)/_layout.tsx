import { Redirect, Tabs } from "expo-router";
import type { ColorValue } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../hooks/useAuth";
import { colors, fonts } from "../../core/theme/tokens";

type IoniconName = keyof typeof Ionicons.glyphMap;

function tabIcon(focused: IoniconName, unfocused: IoniconName) {
  function TabIcon({ color, focused: isFocused, size }: { color: ColorValue; focused: boolean; size: number }) {
    return <Ionicons name={isFocused ? focused : unfocused} color={color as string} size={size} />;
  }
  return TabIcon;
}

export default function TabsLayout() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fonts.heading },
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.secondary },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: "Dashboard", tabBarIcon: tabIcon("home", "home-outline") }} />
      <Tabs.Screen name="workouts" options={{ title: "Workouts", tabBarIcon: tabIcon("barbell", "barbell-outline") }} />
      <Tabs.Screen name="exercises" options={{ title: "Exercises", tabBarIcon: tabIcon("fitness", "fitness-outline") }} />
      <Tabs.Screen name="programs" options={{ title: "Programs", tabBarIcon: tabIcon("clipboard", "clipboard-outline") }} />
      <Tabs.Screen name="schedule" options={{ title: "Schedule", tabBarIcon: tabIcon("calendar", "calendar-outline") }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: tabIcon("person", "person-outline") }} />
    </Tabs>
  );
}
