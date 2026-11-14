import { Redirect, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { useAuth } from "../../../../hooks/useAuth";
import { usePrograms } from "../../../../hooks/usePrograms";
import { ProgramForm } from "../../../../components/ProgramForm";
import { colors, fonts } from "../../../../core/theme/tokens";

export default function EditProgram() {
  const { isAdmin } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { programs } = usePrograms();
  const program = programs.find((p) => p.id === id);

  if (!isAdmin) return <Redirect href="/(tabs)/programs" />;

  if (!program) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: colors.textMuted, fontFamily: fonts.body }}>Program not found.</Text>
      </View>
    );
  }

  return <ProgramForm editingProgram={program} />;
}
