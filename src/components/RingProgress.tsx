// RN equivalent of gymtrack-web's <app-circular-progress>: an SVG ring showing a 0-100 percent.
// Uses react-native-svg — unlike react-native-draggable-flatlist/reanimated (which crashed this
// app at import time, see WorkoutForm.tsx header comment), react-native-svg is a pure rendering
// module with no worklets/JSI setup, is listed in Expo's bundledNativeModules for this SDK, and
// is covered by a jest-expo render test (see __tests__/RingProgress.test.tsx) that would catch
// an import-time native-module failure the same way that one caught the reanimated crash.
import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { colors, fonts } from "../core/theme/tokens";

interface RingProgressProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  showLabel?: boolean;
}

export function RingProgress({
  percent,
  size = 40,
  strokeWidth = 4,
  color = colors.accent,
  trackColor = colors.background,
  showLabel = true,
}: RingProgressProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </Svg>
      {showLabel ? (
        <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: size * 0.26 }}>{clamped}%</Text>
      ) : null}
    </View>
  );
}
