// A JS-only dropdown (RN core Modal + FlatList) so filters behave like gymtrack-web's <select>
// elements. Deliberately avoids @react-native-picker/picker or any other native-code package:
// this app is tested through Expo Go (no dev client), and a native module not bundled in Expo
// Go would break the app for the user rather than just adding a dropdown.
import { useState } from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import { colors, fonts } from "../core/theme/tokens";

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

interface SelectProps<T extends string> {
  label: string;
  value: T | "";
  placeholder: string;
  options: SelectOption<T>[];
  onChange: (value: T | "") => void;
}

export function Select<T extends string>({ label, value, placeholder, options, onChange }: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  const rows: SelectOption<T | "">[] = [{ value: "", label: placeholder }, ...options];

  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={{ color: colors.textMuted, fontFamily: fonts.bodySemiBold, fontSize: 11, textTransform: "uppercase" }}>
        {label}
      </Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          backgroundColor: colors.surface,
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 10,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text
          style={{
            color: selected ? colors.text : colors.textMuted,
            fontFamily: fonts.body,
            fontSize: 14,
            textTransform: selected ? "capitalize" : "none",
          }}
        >
          {selected?.label ?? placeholder}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>▾</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: "#000000a0", justifyContent: "flex-end" }}
          onPress={() => setOpen(false)}
        >
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: "70%" }}>
            <Text style={{ color: colors.text, fontFamily: fonts.heading, fontSize: 16, padding: 16, textTransform: "uppercase" }}>
              {label}
            </Text>
            <FlatList
              data={rows}
              keyExtractor={(o) => o.value || "__all__"}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.background }} />}
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <Pressable
                    onPress={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}
                    style={{ paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
                  >
                    <Text
                      style={{
                        color: isSelected ? colors.primary : colors.text,
                        fontFamily: isSelected ? fonts.bodySemiBold : fonts.body,
                        fontSize: 14,
                        textTransform: item.value ? "capitalize" : "none",
                      }}
                    >
                      {item.label}
                    </Text>
                    {isSelected ? <Text style={{ color: colors.primary }}>✓</Text> : null}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
