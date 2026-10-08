// Dismissing the keyboard and navigating away in the very same tick is a known RN/Android
// freeze: the keyboard-hide animation (which on Android also triggers a window resize under
// the default adjustResize soft-input mode) and the screen-transition animation both fight for
// the UI thread at the same moment.
//
// Two earlier attempts at this didn't fully resolve it:
//  1. Calling Keyboard.dismiss() right before navigating, with no gap at all.
//  2. Calling Keyboard.dismiss() then navigating after a flat 80ms setTimeout — better, but a
//     guessed delay is inherently unreliable: on a slower device the hide animation can still be
//     mid-flight past 80ms, putting the race right back.
// This version waits for the real "keyboardDidHide" event instead of guessing a duration, so
// navigation only fires once the keyboard has actually finished closing. A timeout fallback
// covers the (should-be-rare) case where no keyboard was open and the event never fires, so a
// caller is never stranded.
import { Keyboard } from "react-native";

export function dismissKeyboardThenNavigate(navigate: () => void): void {
  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    subscription.remove();
    clearTimeout(fallbackId);
    navigate();
  };
  const subscription = Keyboard.addListener("keyboardDidHide", finish);
  const fallbackId = setTimeout(finish, 120);
  Keyboard.dismiss();
}
