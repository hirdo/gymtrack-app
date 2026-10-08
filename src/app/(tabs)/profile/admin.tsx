// RN port of gymtrack-web's AdminComponent — Users (role/membership management) and Stats tabs.
// Scope cut vs. web: per-user workout counts (getAllWorkoutsForAdmin, a cross-user workouts
// query) are left out — role and membership management are the functionally/security-relevant
// parts; a workout-count column is a nice-to-have.
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "../../../hooks/useAuth";
import { queryDocuments, updateDocument } from "../../../core/services/firestore.service";
import { setMembershipForUser, type MembershipTier } from "../../../core/services/membership.service";
import { formatDisplayDate } from "../../../core/utils/date.util";
import { colors, fonts } from "../../../core/theme/tokens";

interface AdminUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  membership: MembershipTier;
  lastLogin: string;
  createdAt: string;
}

const TIER_OPTIONS: MembershipTier[] = ["basic", "premium", "elite"];

export default function Admin() {
  const { isAdmin, userId } = useAuth();
  const [activeTab, setActiveTab] = useState<"users" | "stats">("users");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [confirmingRoleFor, setConfirmingRoleFor] = useState<string | null>(null);
  const [togglingRole, setTogglingRole] = useState<string | null>(null);
  const [changingMembershipFor, setChangingMembershipFor] = useState<string | null>(null);

  async function loadUsers() {
    setLoading(true);
    setLoadError(false);
    try {
      const docs = await queryDocuments<AdminUser>("users");
      setUsers(
        docs.map((u) => ({
          id: u.id,
          username: u.username || "",
          email: u.email || "",
          firstName: u.firstName || "",
          lastName: u.lastName || "",
          role: u.role || "user",
          membership: TIER_OPTIONS.includes(u.membership) ? u.membership : "basic",
          lastLogin: u.lastLogin || "",
          createdAt: u.createdAt || "",
        }))
      );
    } catch {
      setUsers([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount, not a render-time derivation
    loadUsers();
  }, []);

  async function toggleUserRole(id: string) {
    const user = users.find((u) => u.id === id);
    if (!user || togglingRole) return;
    setTogglingRole(id);
    try {
      const newRole = user.role === "admin" ? "user" : "admin";
      await updateDocument("users", id, { role: newRole });
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role: newRole } : u)));
    } finally {
      setTogglingRole(null);
      setConfirmingRoleFor(null);
    }
  }

  async function changeMembership(id: string, tier: MembershipTier) {
    if (changingMembershipFor) return;
    setChangingMembershipFor(id);
    try {
      await setMembershipForUser(id, tier);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, membership: tier } : u)));
    } finally {
      setChangingMembershipFor(null);
    }
  }

  if (!isAdmin) return <Redirect href="/(tabs)/profile" />;

  const adminCount = users.filter((u) => u.role === "admin").length;
  const basicCount = users.filter((u) => u.membership === "basic").length;
  const premiumCount = users.filter((u) => u.membership === "premium").length;
  const eliteCount = users.filter((u) => u.membership === "elite").length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: "row", gap: 8, padding: 16, paddingBottom: 0 }}>
        {(["users", "stats"] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setActiveTab(t)}
            style={{ paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 2, borderBottomColor: activeTab === t ? colors.primary : "transparent" }}
          >
            <Text style={{ color: activeTab === t ? colors.primary : colors.textMuted, fontFamily: fonts.heading, fontSize: 14, textTransform: "uppercase" }}>
              {t}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : loadError ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
          <Text style={{ color: colors.error, fontFamily: fonts.body, textAlign: "center" }}>Failed to load users.</Text>
        </View>
      ) : activeTab === "users" ? (
        <FlatList
          data={users}
          keyExtractor={(u) => u.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          ListHeaderComponent={<Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 13, marginBottom: 8 }}>{users.length} users</Text>}
          renderItem={({ item }) => (
            <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 14, gap: 8 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 14 }}>
                  {item.firstName} {item.lastName} {item.role === "admin" ? "👑" : ""}
                </Text>
                <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 11 }}>{item.createdAt ? formatDisplayDate(new Date(item.createdAt)) : "-"}</Text>
              </View>
              <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 12 }}>{item.email}</Text>

              <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                {TIER_OPTIONS.map((tier) => (
                  <Pressable
                    key={tier}
                    disabled={!!changingMembershipFor}
                    onPress={() => changeMembership(item.id, tier)}
                    style={{ backgroundColor: item.membership === tier ? colors.accent : colors.background, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 }}
                  >
                    <Text style={{ color: item.membership === tier ? colors.background : colors.textMuted, fontFamily: fonts.bodySemiBold, fontSize: 11, textTransform: "uppercase" }}>
                      {tier}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {item.id !== userId ? (
                confirmingRoleFor === item.id ? (
                  <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                    <Text style={{ color: colors.warning, fontFamily: fonts.body, fontSize: 12, flex: 1 }}>
                      {item.role === "admin" ? "Remove admin role?" : "Grant admin role?"}
                    </Text>
                    <Pressable disabled={!!togglingRole} onPress={() => toggleUserRole(item.id)} style={{ backgroundColor: colors.primary, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 }}>
                      <Text style={{ color: colors.background, fontFamily: fonts.bodySemiBold, fontSize: 11 }}>Confirm</Text>
                    </Pressable>
                    <Pressable onPress={() => setConfirmingRoleFor(null)} style={{ backgroundColor: colors.background, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 }}>
                      <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 11 }}>Cancel</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable onPress={() => setConfirmingRoleFor(item.id)}>
                    <Text style={{ color: colors.primary, fontFamily: fonts.body, fontSize: 12 }}>
                      {item.role === "admin" ? "Remove admin" : "Make admin"}
                    </Text>
                  </Pressable>
                )
              ) : null}
            </View>
          )}
        />
      ) : (
        <View style={{ padding: 16, gap: 12 }}>
          <StatRow label="Total Users" value={users.length} />
          <StatRow label="Admins" value={adminCount} />
          <StatRow label="Basic" value={basicCount} />
          <StatRow label="Premium" value={premiumCount} />
          <StatRow label="Elite" value={eliteCount} />
        </View>
      )}
    </View>
  );
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: 10, padding: 14, flexDirection: "row", justifyContent: "space-between" }}>
      <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 14 }}>{label}</Text>
      <Text style={{ color: colors.primary, fontFamily: fonts.heading, fontSize: 16 }}>{value}</Text>
    </View>
  );
}
