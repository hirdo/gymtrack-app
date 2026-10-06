// RN equivalent of gymtrack-web's MembershipService constructor effect(): loads the
// current user's tier on login and exposes an upgrade()/downgrade action.
import { useEffect, useState } from "react";
import { useAuthStore } from "../core/auth/authStore";
import { getMembershipForUser, setMembershipForUser, type MembershipTier } from "../core/services/membership.service";

export function useMembership() {
  const userId = useAuthStore((s) => s.userId);
  const [membership, setMembership] = useState<MembershipTier>("basic");

  useEffect(() => {
    if (!userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting to the default tier when the signed-in user changes
      setMembership("basic");
      return;
    }
    getMembershipForUser(userId).then(setMembership);
  }, [userId]);

  async function upgrade(tier: MembershipTier): Promise<void> {
    if (!userId) return;
    await setMembershipForUser(userId, tier);
    setMembership(tier);
  }

  return { membership, upgrade };
}
