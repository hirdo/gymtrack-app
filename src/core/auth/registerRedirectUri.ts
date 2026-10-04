// Auto-registers the current Expo Go redirect URI as a Valid Redirect URI on the
// "gymtrack-mobile" Keycloak client before login, so testing via Expo Go never needs a
// manual trip to the Keycloak admin console. expo-linking's own docs say the exp://
// redirect URI it generates for a published update is "neither stable nor predictable",
// so this has to run fresh right before every login attempt, not just once.
//
// Uses a separate Keycloak client ("gymtrack-automation", client_credentials grant) whose
// secret is embedded in the app bundle (EXPO_PUBLIC_*) — accepted MVP-only risk, see the
// plan file. Never throws: any failure here must not block the actual login flow, since
// the URI may already be registered from a previous run.
const KEYCLOAK_URL = process.env.EXPO_PUBLIC_KEYCLOAK_URL;
const KEYCLOAK_REALM = process.env.EXPO_PUBLIC_KEYCLOAK_REALM;
const MOBILE_CLIENT_ID = process.env.EXPO_PUBLIC_KEYCLOAK_CLIENT_ID;
const AUTOMATION_CLIENT_ID = process.env.EXPO_PUBLIC_KEYCLOAK_AUTOMATION_CLIENT_ID;
const AUTOMATION_CLIENT_SECRET = process.env.EXPO_PUBLIC_KEYCLOAK_AUTOMATION_CLIENT_SECRET;

const EXPO_SCHEME_PATTERN = /^exp(\+[a-z0-9-]+)?:\/\//;
const PERMANENT_REDIRECT_URIS = ["gymtrack://auth/callback", "gymtrack://*"];
const MAX_REDIRECT_URIS = 15;

function adminUrl(path: string): string {
  return `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}${path}`;
}

async function getAutomationToken(): Promise<string> {
  const response = await fetch(`${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: AUTOMATION_CLIENT_ID as string,
      client_secret: AUTOMATION_CLIENT_SECRET as string,
    }).toString(),
  });
  if (!response.ok) throw new Error(`Automation token request failed: ${response.status}`);
  const data = await response.json();
  return data.access_token as string;
}

interface KeycloakClient {
  id: string;
  redirectUris?: string[];
  [key: string]: unknown;
}

async function registerUri(redirectUri: string): Promise<void> {
  const token = await getAutomationToken();
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const listResponse = await fetch(adminUrl(`/clients?clientId=${MOBILE_CLIENT_ID}`), { headers });
  if (!listResponse.ok) throw new Error(`Failed to look up client: ${listResponse.status}`);
  const [client]: KeycloakClient[] = await listResponse.json();
  if (!client) throw new Error(`Client "${MOBILE_CLIENT_ID}" not found`);

  const currentUris = client.redirectUris ?? [];
  if (currentUris.includes(redirectUri)) return;

  let updatedUris = [...currentUris, redirectUri];
  if (updatedUris.length > MAX_REDIRECT_URIS) {
    const pruneable = updatedUris.filter((uri) => !PERMANENT_REDIRECT_URIS.includes(uri));
    const keepCount = MAX_REDIRECT_URIS - PERMANENT_REDIRECT_URIS.length;
    updatedUris = [...PERMANENT_REDIRECT_URIS, ...pruneable.slice(-keepCount)];
  }

  const putResponse = await fetch(adminUrl(`/clients/${client.id}`), {
    method: "PUT",
    headers,
    body: JSON.stringify({ ...client, redirectUris: updatedUris }),
  });
  if (!putResponse.ok) throw new Error(`Failed to update client: ${putResponse.status}`);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timed out")), ms)),
  ]);
}

export async function ensureRedirectUriRegistered(redirectUri: string): Promise<void> {
  if (!EXPO_SCHEME_PATTERN.test(redirectUri)) return;
  if (!AUTOMATION_CLIENT_ID || !AUTOMATION_CLIENT_SECRET) return;
  try {
    await withTimeout(registerUri(redirectUri), 4000);
  } catch (error) {
    console.warn("ensureRedirectUriRegistered failed (continuing with login anyway):", error);
  }
}
