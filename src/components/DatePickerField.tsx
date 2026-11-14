// A JS-only date picker (RN core Modal + a plain month grid), same reasoning as Select.tsx: no
// @react-native-community/datetimepicker or other native module, since this app runs through
// Expo Go with no dev client.
import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { getMonthGridDates, getMonthStart, isSameDay, isSameMonth } from "../core/utils/calendar.util";
import { toLocalDateString, parseLocalDate, formatDisplayDate } from "../core/utils/date.util";
import { colors, fonts } from "../core/theme/tokens";

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

interface DatePickerFieldProps {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  minDate?: string;
}

export function DatePickerField({ label, value, onChange, minDate }: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => getMonthStart(value ? parseLocalDate(value) : new Date()));

  const today = new Date();
  const gridDates = getMonthGridDates(viewMonth);

  function openPicker() {
    setViewMonth(getMonthStart(value ? parseLocalDate(value) : new Date()));
    setOpen(true);
  }

  function selectDate(date: Date) {
    onChange(toLocalDateString(date));
    setOpen(false);
  }

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: colors.textMuted, fontFamily: fonts.bodySemiBold, fontSize: 11, textTransform: "uppercase" }}>{label}</Text>
      <Pressable
        onPress={openPicker}
        style={{ backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
      >
        <Text style={{ color: value ? colors.text : colors.textMuted, fontFamily: fonts.body, fontSize: 14 }}>
          {value ? formatDisplayDate(parseLocalDate(value)) : "No date"}
        </Text>
        {value ? (
          <Pressable onPress={() => onChange(null)} hitSlop={8}>
            <Text style={{ color: colors.textMuted, fontSize: 14 }}>✕</Text>
          </Pressable>
        ) : (
          <Text style={{ color: colors.textMuted, fontSize: 14 }}>📅</Text>
        )}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "#000000a0", justifyContent: "center", padding: 24 }} onPress={() => setOpen(false)}>
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16, gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Pressable onPress={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))} style={{ padding: 8 }}>
                <Text style={{ color: colors.text, fontSize: 16 }}>‹</Text>
              </Pressable>
              <Text style={{ color: colors.text, fontFamily: fonts.heading, fontSize: 16, textTransform: "uppercase" }}>
                {viewMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </Text>
              <Pressable onPress={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))} style={{ padding: 8 }}>
                <Text style={{ color: colors.text, fontSize: 16 }}>›</Text>
              </Pressable>
            </View>

            <View style={{ flexDirection: "row" }}>
              {WEEKDAY_LABELS.map((d, i) => (
                <View key={i} style={{ flex: 1, alignItems: "center", paddingVertical: 4 }}>
                  <Text style={{ color: colors.textMuted, fontFamily: fonts.bodySemiBold, fontSize: 11 }}>{d}</Text>
                </View>
              ))}
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {gridDates.map((date) => {
                const dateStr = toLocalDateString(date);
                const disabled = !!minDate && dateStr < minDate;
                const isSelected = !!value && dateStr === value;
                const isToday = isSameDay(date, today);
                return (
                  <Pressable
                    key={dateStr}
                    disabled={disabled}
                    onPress={() => selectDate(date)}
                    style={{
                      width: "14.28%",
                      aspectRatio: 1,
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: disabled ? 0.3 : !isSameMonth(date, viewMonth) ? 0.4 : 1,
                    }}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: isSelected ? colors.primary : "transparent",
                        borderWidth: isToday && !isSelected ? 1 : 0,
                        borderColor: colors.primary,
                      }}
                    >
                      <Text style={{ color: isSelected ? colors.background : colors.text, fontFamily: fonts.body, fontSize: 13 }}>
                        {date.getDate()}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
