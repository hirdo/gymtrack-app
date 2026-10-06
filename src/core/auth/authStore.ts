// Zustand store for auth/session state — the RN equivalent of gymtrack-web's AuthService
// (Angular signals reacting to Keycloak events). Also ports `syncProfileToFirestore`.
import { create } from "zustand";
import {
  decodeJwt,
  endSession,
  hasRealmRole,
  isTokenExpiringSoon,
  refreshAccessToken,
  type DecodedToken,
} from "./keycloak";
import { saveTokens, loadTokens, clearTokens } from "./secureStore";
import { setDocument } from "../services/firestore.service";

interface AuthState {
  isHydrated: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  userId: string | null;
  profile: DecodedToken | null;
  accessToken: string | null;
  refreshToken: string | null;
  hydrate: () => Promise<void>;
  setSession: (accessToken: string, refreshToken: string) => Promise<void>;
  refreshIfNeeded: () => Promise<void>;
  logout: () => Promise<void>;
}

async function syncProfileToFirestore(token: DecodedToken): Promise<void> {
  await setDocument(
    "users",
    token.sub,
    {
      username: token.preferred_username || "",
      email: token.email || "",
      firstName: token.given_name || "",
      lastName: token.family_name || "",
      role: hasRealmRole(token, "admin") ? "admin" : "user",
      lastLogin: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
    true
  );
}

function applyToken(
  set: (partial: Partial<AuthState>) => void,
  accessToken: string,
  refreshToken: string
) {
  const decoded = decodeJwt(accessToken);
  set({
    isAuthenticated: true,
    isAdmin: hasRealmRole(decoded, "admin"),
    userId: decoded.sub,
    profile: decoded,
    accessToken,
    refreshToken,
  });
  void syncProfileToFirestore(decoded);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isHydrated: false,
  isAuthenticated: false,
  isAdmin: false,
  userId: null,
  profile: null,
  accessToken: null,
  refreshToken: null,

  hydrate: async () => {
    const tokens = await loadTokens();
    if (tokens) {
      applyToken(set, tokens.accessToken, tokens.refreshToken);
      await get().refreshIfNeeded();
    }
    set({ isHydrated: true });
  },

  setSession: async (accessToken, refreshToken) => {
    await saveTokens(accessToken, refreshToken);
    applyToken(set, accessToken, refreshToken);
  },

  refreshIfNeeded: async () => {
    const { profile, refreshToken } = get();
    if (!profile || !refreshToken) return;
    if (!isTokenExpiringSoon(profile)) return;
    try {
      const result = await refreshAccessToken(refreshToken);
      await get().setSession(result.accessToken, result.refreshToken ?? refreshToken);
    } catch {
      await get().logout();
    }
  },

  logout: async () => {
    const { refreshToken } = get();
    if (refreshToken) {
      try {
        await endSession(refreshToken);
      } catch {
        // best-effort — still clear the local session even if Keycloak is unreachable
      }
    }
    await clearTokens();
    set({
      isAuthenticated: false,
      isAdmin: false,
      userId: null,
      profile: null,
      accessToken: null,
      refreshToken: null,
    });
  },
}));
