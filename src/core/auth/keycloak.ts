// Keycloak OIDC (Authorization Code + PKCE) configuration for React Native via expo-auth-session.
// Replaces gymtrack-web's keycloak-js + keycloak-angular browser-redirect/iframe-SSO flow,
// which does not work outside a browser.
import * as AuthSession from "expo-auth-session";

const KEYCLOAK_URL = process.env.EXPO_PUBLIC_KEYCLOAK_URL;
const KEYCLOAK_REALM = process.env.EXPO_PUBLIC_KEYCLOAK_REALM;
export const KEYCLOAK_CLIENT_ID = process.env.EXPO_PUBLIC_KEYCLOAK_CLIENT_ID;

function realmUrl(path: string): string {
  return `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}${path}`;
}

export const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: realmUrl("/protocol/openid-connect/auth"),
  tokenEndpoint: realmUrl("/protocol/openid-connect/token"),
  revocationEndpoint: realmUrl("/protocol/openid-connect/logout"),
};

export const redirectUri = AuthSession.makeRedirectUri({
  scheme: "gymtrack",
  path: "auth/callback",
});

export interface DecodedToken {
  sub: string;
  preferred_username?: string;
  email?: string;
  given_name?: string;
  family_name?: string;
  exp: number;
  realm_access?: { roles: string[] };
  resource_access?: Record<string, { roles: string[] }>;
}

// Minimal base64url JSON decode — React Native/Hermes has no built-in atob/Buffer.
function decodeBase64Url(segment: string): string {
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let output = "";
  let buffer = 0;
  let bits = 0;
  for (const char of padded) {
    if (char === "=") break;
    buffer = (buffer << 6) | chars.indexOf(char);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }
  return decodeURIComponent(
    output
      .split("")
      .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
      .join("")
  );
}

export function decodeJwt(token: string): DecodedToken {
  const payload = token.split(".")[1];
  return JSON.parse(decodeBase64Url(payload));
}

export function hasRealmRole(token: DecodedToken, role: string): boolean {
  return token.realm_access?.roles?.includes(role) ?? false;
}

export function isTokenExpiringSoon(token: DecodedToken, thresholdSeconds = 60): boolean {
  return Date.now() / 1000 >= token.exp - thresholdSeconds;
}

export async function exchangeCode(code: string, codeVerifier: string): Promise<AuthSession.TokenResponse> {
  return AuthSession.exchangeCodeAsync(
    {
      clientId: KEYCLOAK_CLIENT_ID as string,
      code,
      redirectUri,
      extraParams: { code_verifier: codeVerifier },
    },
    discovery
  );
}

export async function refreshAccessToken(refreshToken: string): Promise<AuthSession.TokenResponse> {
  return AuthSession.refreshAsync(
    { clientId: KEYCLOAK_CLIENT_ID as string, refreshToken },
    discovery
  );
}

// Ends the Keycloak SSO session tied to this refresh token. Without this, clearing only the
// local tokens leaves Keycloak's session alive, so the next login silently re-authenticates
// as the same user instead of prompting for credentials again.
export async function endSession(refreshToken: string): Promise<void> {
  await fetch(discovery.revocationEndpoint as string, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: KEYCLOAK_CLIENT_ID as string,
      refresh_token: refreshToken,
    }).toString(),
  });
}
