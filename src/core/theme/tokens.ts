// Ported verbatim from gymtrack-web's src/styles.scss `@theme` block to keep visual parity.
export const colors = {
  primary: "#f97316",
  primaryLight: "#fb923c",
  primaryDark: "#ea580c",
  secondary: "#1e293b",
  accent: "#22c55e",
  background: "#0f1219",
  surface: "#1a1f2e",
  text: "#f8fafc",
  textMuted: "#94a3b8",
  success: "#22c55e",
  warning: "#f59e0b",
  error: "#ef4444",
} as const;

export const fonts = {
  heading: "BarlowCondensed_700Bold",
  body: "Barlow_400Regular",
  bodyMedium: "Barlow_500Medium",
  bodySemiBold: "Barlow_600SemiBold",
} as const;
