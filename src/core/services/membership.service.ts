// Ported from gymtrack-web's MembershipService (src/app/core/services/membership.service.ts),
// dropping Angular signals/DI — the live "current user's tier" state lives in
// src/hooks/useMembership.ts instead (the RN equivalent of the Angular effect()).
import { getDocument, updateDocument } from "./firestore.service";

export type MembershipTier = "basic" | "premium" | "elite";

const VALID_TIERS: MembershipTier[] = ["basic", "premium", "elite"];

export async function getMembershipForUser(userId: string): Promise<MembershipTier> {
  const doc = await getDocument<{ membership?: string }>("users", userId);
  const tier = doc?.membership;
  if (tier && VALID_TIERS.includes(tier as MembershipTier)) {
    return tier as MembershipTier;
  }
  return "basic";
}

export async function setMembershipForUser(userId: string, tier: MembershipTier): Promise<void> {
  await updateDocument("users", userId, { membership: tier });
}
