import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import * as AuthSession from "expo-auth-session";
import { router } from "expo-router";
import { discovery, redirectUri, exchangeCode, KEYCLOAK_CLIENT_ID } from "../core/auth/keycloak";
import { useAuthStore } from "../core/auth/authStore";
import { colors, fonts } from "../core/theme/tokens";

export default function Login() {
  const setSession = useAuthStore((s) => s.setSession);
  const [isExchanging, setIsExchanging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: KEYCLOAK_CLIENT_ID as string,
      redirectUri,
      scopes: ["openid", "profile", "email"],
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
    },
    discovery
  );

  useEffect(() => {
    if (response?.type !== "success") return;
    const codeVerifier = request?.codeVerifier;
    if (!codeVerifier) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- tracking loading state for the async code exchange this effect kicks off
    setIsExchanging(true);
    exchangeCode(response.params.code, codeVerifier)
      .then((result) => setSession(result.accessToken, result.refreshToken ?? ""))
      .then(() => router.replace("/(tabs)/dashboard"))
      .catch((e) => setError(e instanceof Error ? e.message : "Login failed"))
      .finally(() => setIsExchanging(false));
  }, [response, request, setSession]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        gap: 16,
      }}
    >
      <Text style={{ color: colors.text, fontFamily: fonts.heading, fontSize: 36 }}>GymTrack</Text>
      <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 14, textAlign: "center" }}>
        Sign in with your gym account to track workouts.
      </Text>

      <Pressable
        disabled={!request || isExchanging}
        onPress={() => promptAsync()}
        style={{
          backgroundColor: colors.primary,
          paddingVertical: 14,
          paddingHorizontal: 32,
          borderRadius: 10,
          opacity: !request || isExchanging ? 0.6 : 1,
          marginTop: 16,
        }}
      >
        {isExchanging ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 16 }}>Log in</Text>
        )}
      </Pressable>

      {error ? (
        <Text style={{ color: colors.error, fontFamily: fonts.body, marginTop: 8 }}>{error}</Text>
      ) : null}

      {/* Setup-only diagnostic: Expo Go can't register the "gymtrack://" scheme, so it
          generates its own redirect URI (exp://...) instead. That exact value has to be
          added as a Valid Redirect URI in Keycloak before login works here. Remove this
          block once a Dev Client build replaces Expo Go for testing. */}
      <View style={{ marginTop: 24, padding: 12, borderRadius: 8, backgroundColor: colors.surface, width: "100%" }}>
        <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 11 }}>
          Setup only — redirect URI to register in Keycloak:
        </Text>
        <Text selectable style={{ color: colors.text, fontFamily: fonts.body, fontSize: 12, marginTop: 4 }}>
          {redirectUri}
        </Text>
      </View>
    </View>
  );
}
