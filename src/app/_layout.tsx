import "../../global.css";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as WebBrowser from "expo-web-browser";
import {
  useFonts as useBarlowFonts,
  Barlow_400Regular,
  Barlow_500Medium,
  Barlow_600SemiBold,
} from "@expo-google-fonts/barlow";
import { useFonts as useBarlowCondensedFonts, BarlowCondensed_700Bold } from "@expo-google-fonts/barlow-condensed";
import { colors } from "../core/theme/tokens";
import { useAuthStore } from "../core/auth/authStore";

// Required once at app startup so a pending auth session (opened via WebBrowser) can be
// completed when the OS redirects back into the app.
WebBrowser.maybeCompleteAuthSession();

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [bodyFontsLoaded] = useBarlowFonts({
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_600SemiBold,
  });
  const [headingFontsLoaded] = useBarlowCondensedFonts({ BarlowCondensed_700Bold });
  const hydrate = useAuthStore((s) => s.hydrate);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const [didHydrate, setDidHydrate] = useState(false);

  useEffect(() => {
    hydrate().finally(() => setDidHydrate(true));
  }, [hydrate]);

  const ready = bodyFontsLoaded && headingFontsLoaded && (isHydrated || didHydrate);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </View>
  );
}
