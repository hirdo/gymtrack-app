import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "../../../core/auth/authStore";
import { addWorkout } from "../../../core/services/workout.service";
import type { WorkoutCategory } from "../../../core/models/workout.model";
import { colors, fonts } from "../../../core/theme/tokens";

const CATEGORIES: WorkoutCategory[] = ["strength", "cardio", "flexibility", "hiit", "custom"];

export default function NewWorkout() {
  const userId = useAuthStore((s) => s.userId);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<WorkoutCategory>("strength");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    if (!userId || !name.trim()) return;
    setIsSaving(true);
    try {
      await addWorkout(userId, { name: name.trim(), category, exercises: [] });
      router.back();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: 16, gap: 16 }}>
      <View style={{ gap: 6 }}>
        <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 13 }}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Push day"
          placeholderTextColor={colors.textMuted}
          style={{
            backgroundColor: colors.surface,
            color: colors.text,
            fontFamily: fonts.body,
            borderRadius: 10,
            padding: 12,
          }}
        />
      </View>

      <View style={{ gap: 6 }}>
        <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 13 }}>Category</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {CATEGORIES.map((c) => (
            <Pressable
              key={c}
              onPress={() => setCategory(c)}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 20,
                backgroundColor: category === c ? colors.primary : colors.surface,
              }}
            >
              <Text style={{ color: colors.text, fontFamily: fonts.body, fontSize: 13 }}>{c}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Pressable
        disabled={isSaving || !name.trim()}
        onPress={handleSave}
        style={{
          backgroundColor: colors.primary,
          paddingVertical: 14,
          borderRadius: 10,
          alignItems: "center",
          opacity: isSaving || !name.trim() ? 0.6 : 1,
          marginTop: 8,
        }}
      >
        {isSaving ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 16 }}>Save workout</Text>
        )}
      </Pressable>
    </View>
  );
}
