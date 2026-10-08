// A centered loading indicator for a screen's first data fetch — the RN equivalent of the
// spinner gymtrack-web shows while a list is still loading (see admin.component.html).
import { ActivityIndicator, Text, View } from "react-native";
import { colors, fonts } from "../core/theme/tokens";

export function LoadingSpinner({ label }: { label?: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 12 }}>
      <ActivityIndicator color={colors.primary} size="large" />
      {label ? <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 13 }}>{label}</Text> : null}
    </View>
  );
}
