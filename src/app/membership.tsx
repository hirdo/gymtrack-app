import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "../hooks/useAuth";
import { useMembership } from "../hooks/useMembership";
import type { MembershipTier } from "../core/services/membership.service";
import { colors, fonts } from "../core/theme/tokens";

interface PlanDef {
  tier: MembershipTier;
  name: string;
  price: string;
  features: string[];
  accentColor: string;
  badge?: string;
}

const PLANS: PlanDef[] = [
  {
    tier: "basic",
    name: "Basic",
    price: "Free",
    accentColor: colors.accent,
    features: ["Workout tracking", "Up to 5 workout plans", "Basic schedule view", "Community access"],
  },
  {
    tier: "premium",
    name: "Premium",
    price: "$9.99/month",
    accentColor: colors.primary,
    badge: "Popular",
    features: [
      "Unlimited workout plans",
      "Advanced analytics",
      "Priority support",
      "Custom schedules",
      "Progress reports",
    ],
  },
  {
    tier: "elite",
    name: "Elite",
    price: "$19.99/month",
    accentColor: colors.warning,
    features: [
      "Everything in Premium",
      "Personal trainer AI",
      "Nutrition planning",
      "1-on-1 coaching",
      "Video analysis",
    ],
  },
];

export default function Membership() {
  const { isAuthenticated } = useAuth();
  const { membership, upgrade } = useMembership();
  const [changingTo, setChangingTo] = useState<MembershipTier | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthenticated) return <Redirect href="/login" />;

  async function handleChange(tier: MembershipTier) {
    if (changingTo) return;
    setChangingTo(tier);
    setError(null);
    try {
      await upgrade(tier);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update your membership. Please try again.");
    } finally {
      setChangingTo(null);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, gap: 16 }}>
      <View style={{ alignItems: "center", gap: 4, marginBottom: 8 }}>
        <Text style={{ color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 12 }}>PRICING</Text>
        <Text style={{ color: colors.text, fontFamily: fonts.heading, fontSize: 28, textAlign: "center" }}>
          Membership Plans
        </Text>
        <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 14, textAlign: "center" }}>
          Choose the plan that fits your fitness goals.
        </Text>
      </View>

      {error ? (
        <View style={{ backgroundColor: colors.error + "1A", borderRadius: 10, padding: 12 }}>
          <Text style={{ color: colors.error, fontFamily: fonts.body, fontSize: 13 }}>{error}</Text>
        </View>
      ) : null}

      {PLANS.map((plan) => {
        const isCurrent = membership === plan.tier;
        const isBusy = changingTo === plan.tier;
        return (
          <View
            key={plan.tier}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 14,
              padding: 18,
              borderWidth: 1,
              borderColor: plan.accentColor + "4D",
              gap: 12,
            }}
          >
            {plan.badge ? (
              <View
                style={{
                  position: "absolute",
                  top: -10,
                  left: 18,
                  backgroundColor: plan.accentColor,
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                  borderRadius: 10,
                }}
              >
                <Text style={{ color: colors.background, fontFamily: fonts.heading, fontSize: 10 }}>
                  {plan.badge.toUpperCase()}
                </Text>
              </View>
            ) : null}

            <Text style={{ color: plan.accentColor, fontFamily: fonts.bodySemiBold, fontSize: 12 }}>
              {plan.name.toUpperCase()}
            </Text>
            <Text style={{ color: colors.text, fontFamily: fonts.heading, fontSize: 26 }}>{plan.price}</Text>

            <View style={{ gap: 8 }}>
              {plan.features.map((feature) => (
                <View key={feature} style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                  <Text style={{ color: colors.accent, fontFamily: fonts.body, fontSize: 13 }}>✓</Text>
                  <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 13, flex: 1 }}>
                    {feature}
                  </Text>
                </View>
              ))}
            </View>

            {isCurrent ? (
              <View
                style={{
                  borderWidth: 1,
                  borderColor: plan.accentColor + "80",
                  borderRadius: 8,
                  paddingVertical: 10,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: plan.accentColor, fontFamily: fonts.heading, fontSize: 13 }}>CURRENT PLAN</Text>
              </View>
            ) : (
              <Pressable
                disabled={!!changingTo}
                onPress={() => handleChange(plan.tier)}
                style={{
                  backgroundColor: plan.accentColor,
                  borderRadius: 8,
                  paddingVertical: 12,
                  alignItems: "center",
                  opacity: changingTo && !isBusy ? 0.5 : 1,
                }}
              >
                {isBusy ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text style={{ color: colors.background, fontFamily: fonts.bodySemiBold, fontSize: 14 }}>
                    {plan.tier === "basic" ? "Downgrade to Basic" : `Upgrade to ${plan.name}`}
                  </Text>
                )}
              </Pressable>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}
