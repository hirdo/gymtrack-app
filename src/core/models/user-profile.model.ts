// Ported verbatim from gymtrack-web's src/app/core/models/user-profile.model.ts.
export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  membershipType?: "basic" | "premium" | "elite";
  joinDate?: string;
  avatarUrl?: string;
}
