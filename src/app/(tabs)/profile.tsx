import { useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useProfile } from "../../hooks/useProfile";
import { useMembership } from "../../hooks/useMembership";
import { useWorkouts } from "../../hooks/useWorkouts";
import { useAuthStore } from "../../core/auth/authStore";
import { uploadImage } from "../../core/services/cloudinary.service";
import { colors, fonts } from "../../core/theme/tokens";

const TIER_STYLES: Record<string, { bg: string; text: string }> = {
  elite: { bg: colors.warning, text: colors.background },
  premium: { bg: colors.primary, text: colors.background },
  basic: { bg: colors.accent, text: colors.background },
};

export default function Profile() {
  const { profile, isAdmin, updateAvatar } = useProfile();
  const { membership } = useMembership();
  const { totalWorkouts, completedWorkouts } = useWorkouts();
  const logout = useAuthStore((s) => s.logout);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handlePickAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setUploadError("Photo library permission is required.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setIsUploading(true);
    setUploadError(null);
    try {
      const url = await uploadImage({
        uri: asset.uri,
        name: asset.fileName ?? "avatar.jpg",
        type: asset.mimeType ?? "image/jpeg",
      });
      await updateAvatar(url);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  if (!profile) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const tierStyle = TIER_STYLES[membership] ?? TIER_STYLES.basic;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, gap: 16 }}>
      {/* User info */}
      <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, flexDirection: "row", gap: 16 }}>
        <Pressable onPress={handlePickAvatar} disabled={isUploading}>
          {profile.avatarUrl ? (
            <Image
              source={{ uri: profile.avatarUrl }}
              style={{ width: 72, height: 72, borderRadius: 16, opacity: isUploading ? 0.5 : 1 }}
            />
          ) : (
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 16,
                backgroundColor: colors.primary,
                alignItems: "center",
                justifyContent: "center",
                opacity: isUploading ? 0.5 : 1,
              }}
            >
              <Text style={{ color: colors.background, fontFamily: fonts.heading, fontSize: 28 }}>
                {profile.firstName ? profile.firstName[0] : "U"}
              </Text>
            </View>
          )}
          {isUploading && (
            <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator color={colors.text} />
            </View>
          )}
        </Pressable>

        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: colors.text, fontFamily: fonts.heading, fontSize: 20 }}>
            {profile.firstName} {profile.lastName}
          </Text>
          <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 13 }}>{profile.email}</Text>
          {uploadError ? (
            <Text style={{ color: colors.error, fontFamily: fonts.body, fontSize: 11 }}>{uploadError}</Text>
          ) : null}
          {isAdmin ? (
            <View
              style={{
                marginTop: 6,
                alignSelf: "flex-start",
                paddingHorizontal: 10,
                paddingVertical: 3,
                borderRadius: 6,
                backgroundColor: colors.primary + "26",
              }}
            >
              <Text style={{ color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11 }}>ADMIN</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Membership */}
      <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 10 }}>
        <Text style={{ color: colors.textMuted, fontFamily: fonts.bodySemiBold, fontSize: 12 }}>MEMBERSHIP</Text>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ backgroundColor: tierStyle.bg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}>
            <Text style={{ color: tierStyle.text, fontFamily: fonts.heading, fontSize: 13 }}>
              {membership.toUpperCase()}
            </Text>
          </View>
          <Pressable onPress={() => router.push("/membership")}>
            <Text style={{ color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 13 }}>
              {membership === "elite" ? "Manage" : "Upgrade"}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Stats */}
      <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 12 }}>
        <Text style={{ color: colors.textMuted, fontFamily: fonts.bodySemiBold, fontSize: 12 }}>YOUR STATS</Text>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1, backgroundColor: colors.background, borderRadius: 10, padding: 12, alignItems: "center" }}>
            <Text style={{ color: colors.textMuted, fontFamily: fonts.bodySemiBold, fontSize: 10 }}>TOTAL</Text>
            <Text style={{ color: colors.primary, fontFamily: fonts.heading, fontSize: 24 }}>{totalWorkouts}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: colors.background, borderRadius: 10, padding: 12, alignItems: "center" }}>
            <Text style={{ color: colors.textMuted, fontFamily: fonts.bodySemiBold, fontSize: 10 }}>COMPLETED</Text>
            <Text style={{ color: colors.accent, fontFamily: fonts.heading, fontSize: 24 }}>{completedWorkouts}</Text>
          </View>
        </View>
      </View>

      {/* Account actions */}
      <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 10 }}>
        <Text style={{ color: colors.textMuted, fontFamily: fonts.bodySemiBold, fontSize: 12 }}>ACCOUNT</Text>
        <Pressable
          onPress={logout}
          style={{
            paddingVertical: 12,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.error,
            alignItems: "center",
          }}
        >
          <Text style={{ color: colors.error, fontFamily: fonts.bodySemiBold, fontSize: 14 }}>Sign Out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
