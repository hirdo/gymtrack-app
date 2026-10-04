// Deep-link landing route for the Keycloak OIDC redirect (gymtrack://auth/callback).
// The actual code exchange is handled by the useAuthRequest hook in login.tsx, which
// resolves from the same redirect event — this screen just bridges back to the app.
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { router } from "expo-router";
import { colors } from "../../core/theme/tokens";

export default function AuthCallback() {
  useEffect(() => {
    const timer = setTimeout(() => router.replace("/"), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}
