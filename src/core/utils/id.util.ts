// RN/Hermes doesn't reliably expose crypto.randomUUID() without a polyfill — avoid adding one
// (expo-crypto, react-native-get-random-values) just for client-side list/row keys that never
// need to be cryptographically random, only unique within this session.
export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
