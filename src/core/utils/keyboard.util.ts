// Dismissing the keyboard and navigating away in the very same tick is a known RN/Android
// freeze: the keyboard-hide animation (which on Android also triggers a window resize under
// the default adjustResize soft-input mode) and the screen-transition animation both fight for
// the UI thread at the same moment. Calling Keyboard.dismiss() alone — without giving its
// animation a head start — was tried first and the freeze still happened, confirming the two
// really do need to be sequenced in time, not just issued in the "right" order. A short
// setTimeout is the pragmatic, widely-used fix for this exact RN/Android race: 80ms is well
// under the ~100ms threshold where added latency reads as "lag" to a user, but it's enough for
// the keyboard's hide animation to get underway before the heavier screen transition starts.
import { Keyboard } from "react-native";

export function dismissKeyboardThenNavigate(navigate: () => void): void {
  Keyboard.dismiss();
  setTimeout(navigate, 80);
}
