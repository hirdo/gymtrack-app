import { Redirect, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { useAuth } from "../../../../../hooks/useAuth";
import { useExerciseBundles } from "../../../../../hooks/useExerciseBundles";
import { BundleForm } from "../../../../../components/BundleForm";
import { colors, fonts } from "../../../../../core/theme/tokens";

export default function EditBundle() {
  const { isAdmin } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bundles } = useExerciseBundles();
  const bundle = bundles.find((b) => b.id === id);

  if (!isAdmin) return <Redirect href="/(tabs)/exercises" />;

  if (!bundle) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: colors.textMuted, fontFamily: fonts.body }}>Bundle not found.</Text>
      </View>
    );
  }

  return <BundleForm editingBundle={bundle} />;
}
