// Mounted once in the root layout. Shows whatever useToastStore's show() was last called with,
// for a couple of seconds, then clears itself — a lightweight confirmation banner for actions
// that don't otherwise navigate away or visibly change what's on screen.
//
// Rendered through RN's own <Modal>, not a plain absolutely-positioned View: several screens
// (ProgramForm/WorkoutForm/ExerciseForm/BundleForm) are presented with Stack.Screen's
// `presentation: "modal"`, which puts them in their own native modal layer above the root
// layout. A sibling View in the root layout — which is where Toast used to live — ends up
// underneath that native layer and is invisible while any of those screens are open (reported:
// Duplicate Day's toast never appeared). RN's <Modal> always presents in a new top-level native
// window, so it stays above an already-open native-stack modal too.
import { useEffect } from "react";
import { Modal, Text, View } from "react-native";
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
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={hide}>
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
    </Modal>
  );
}
