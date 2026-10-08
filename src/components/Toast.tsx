// Mounted once in the root layout. Shows whatever useToastStore's show() was last called with,
// for a couple of seconds, then clears itself — a lightweight confirmation banner for actions
// that don't otherwise navigate away or visibly change what's on screen.
import { useEffect } from "react";
import { Text, View } from "react-native";
import { useToastStore } from "../core/ui/toastStore";
import { colors, fonts } from "../core/theme/tokens";

const VISIBLE_MS = 2200;

export function Toast() {
  const message = useToastStore((s) => s.message);
  const hide = useToastStore((s) => s.hide);

  useEffect(() => {
    if (!message) return;
    const timeoutId = setTimeout(hide, VISIBLE_MS);
    return () => clearTimeout(timeoutId);
  }, [message, hide]);

  if (!message) return null;

  return (
    <View
      style={{
        position: "absolute",
        left: 20,
        right: 20,
        bottom: 90,
        backgroundColor: colors.surface,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: colors.accent + "4d",
      }}
      pointerEvents="none"
    >
      <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 13, textAlign: "center" }}>{message}</Text>
    </View>
  );
}
