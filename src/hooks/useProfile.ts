// RN equivalent of gymtrack-web's ProfileService: derives a UserProfile from the Keycloak
// token already held in authStore plus a Firestore-stored avatarUrl, and exposes
// updateAvatar() for the Cloudinary-backed avatar upload flow.
import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "../core/auth/authStore";
import { getDocument, updateDocument } from "../core/services/firestore.service";
import type { UserProfile } from "../core/models/user-profile.model";

export function useProfile() {
  const token = useAuthStore((s) => s.profile);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const userId = useAuthStore((s) => s.userId);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();

  useEffect(() => {
    if (!userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting local cache when the signed-in user changes
      setAvatarUrl(undefined);
      return;
    }
    getDocument<{ avatarUrl?: string }>("users", userId).then((doc) => setAvatarUrl(doc?.avatarUrl));
  }, [userId]);

  const profile: UserProfile | null = useMemo(() => {
    if (!token) return null;
    return {
      id: token.sub,
      email: token.email ?? "",
      firstName: token.given_name ?? "",
      lastName: token.family_name ?? "",
      avatarUrl,
    };
  }, [token, avatarUrl]);

  async function updateAvatar(url: string): Promise<void> {
    if (!userId) return;
    await updateDocument("users", userId, { avatarUrl: url });
    setAvatarUrl(url);
  }

  return { profile, isAdmin, updateAvatar };
}
