// RN port of gymtrack-web's ScheduleComponent — week/month calendar of scheduled or completed
// workouts. No native calendar library; the grid is a plain View using calendar.util's pure
// date math, same reasoning as Select.tsx/DatePickerField.
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Link } from "expo-router";
import { useWorkouts } from "../../hooks/useWorkouts";
import {
  getMonthGridDates,
  getMonthStart,
  getMonday,
  getWeekDates,
  isSameDay,
  isSameMonth,
} from "../../core/utils/calendar.util";
import { formatDisplayDate, toLocalDateString } from "../../core/utils/date.util";
import { colors, fonts } from "../../core/theme/tokens";

type ViewMode = "week" | "month";
type DateMode = "scheduled" | "completed";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function Schedule() {
  const { workouts } = useWorkouts();
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [dateMode, setDateMode] = useState<DateMode>("scheduled");
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [monthStart, setMonthStart] = useState(() => getMonthStart(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const today = new Date();

  const relevantWorkouts = useMemo(
    () => (dateMode === "completed" ? workouts.filter((w) => w.completedDate) : workouts.filter((w) => w.scheduledDate)),
    [workouts, dateMode]
  );

  const workoutsByDate = useMemo(() => {
    const map = new Map<string, typeof workouts>();
    for (const w of relevantWorkouts) {
      const dateStr = dateMode === "completed" ? toLocalDateString(new Date(w.completedDate!)) : (w.scheduledDate as string).slice(0, 10);
      map.set(dateStr, [...(map.get(dateStr) ?? []), w]);
    }
    return map;
  }, [relevantWorkouts, dateMode]);

  const dates = viewMode === "week" ? getWeekDates(weekStart) : getMonthGridDates(monthStart);
  const selectedWorkouts = selectedDate ? workoutsByDate.get(selectedDate) ?? [] : [];

  function goPrevious() {
    if (viewMode === "week") {
      setWeekStart((d) => {
        const n = new Date(d);
        n.setDate(n.getDate() - 7);
        return n;
      });
    } else {
      setMonthStart((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    }
  }

  function goNext() {
    if (viewMode === "week") {
      setWeekStart((d) => {
        const n = new Date(d);
        n.setDate(n.getDate() + 7);
        return n;
      });
    } else {
      setMonthStart((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    }
  }

  const headerLabel =
    viewMode === "week"
      ? `${formatDisplayDate(dates[0])} - ${formatDisplayDate(dates[6])}`
      : monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, gap: 16 }}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {(["week", "month"] as ViewMode[]).map((m) => (
          <Pressable
            key={m}
            onPress={() => setViewMode(m)}
            style={{ flex: 1, backgroundColor: viewMode === m ? colors.primary : colors.surface, borderRadius: 8, paddingVertical: 8, alignItems: "center" }}
          >
            <Text style={{ color: viewMode === m ? colors.background : colors.textMuted, fontFamily: fonts.bodySemiBold, fontSize: 12, textTransform: "uppercase" }}>
              {m}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        {(["scheduled", "completed"] as DateMode[]).map((m) => (
          <Pressable
            key={m}
            onPress={() => setDateMode(m)}
            style={{ flex: 1, backgroundColor: dateMode === m ? colors.accent : colors.surface, borderRadius: 8, paddingVertical: 8, alignItems: "center" }}
          >
            <Text style={{ color: dateMode === m ? colors.background : colors.textMuted, fontFamily: fonts.bodySemiBold, fontSize: 12, textTransform: "uppercase" }}>
              {m}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable onPress={goPrevious} style={{ padding: 8 }}>
          <Text style={{ color: colors.text, fontSize: 18 }}>‹</Text>
        </Pressable>
        <Text style={{ color: colors.text, fontFamily: fonts.heading, fontSize: 15, textTransform: "uppercase" }}>{headerLabel}</Text>
        <Pressable onPress={goNext} style={{ padding: 8 }}>
          <Text style={{ color: colors.text, fontSize: 18 }}>›</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: "row" }}>
        {WEEKDAY_LABELS.map((d) => (
          <View key={d} style={{ flex: 1, alignItems: "center", paddingVertical: 4 }}>
            <Text style={{ color: colors.textMuted, fontFamily: fonts.bodySemiBold, fontSize: 10 }}>{d}</Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {dates.map((date) => {
          const dateStr = toLocalDateString(date);
          const dayWorkouts = workoutsByDate.get(dateStr) ?? [];
          const isToday = isSameDay(date, today);
          const isSelected = selectedDate === dateStr;
          const inMonth = viewMode === "week" || isSameMonth(date, monthStart);
          return (
            <Pressable
              key={dateStr}
              onPress={() => setSelectedDate(dayWorkouts.length > 0 ? dateStr : null)}
              style={{
                width: viewMode === "week" ? "14.28%" : "14.28%",
                aspectRatio: 1,
                alignItems: "center",
                justifyContent: "center",
                opacity: inMonth ? 1 : 0.35,
              }}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isSelected ? colors.primary : "transparent",
                  borderWidth: isToday && !isSelected ? 1 : 0,
                  borderColor: colors.primary,
                }}
              >
                <Text style={{ color: isSelected ? colors.background : colors.text, fontFamily: fonts.body, fontSize: 13 }}>{date.getDate()}</Text>
              </View>
              {dayWorkouts.length > 0 ? (
                <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: dateMode === "completed" ? colors.accent : colors.primary, marginTop: 2 }} />
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {selectedDate ? (
        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.textMuted, fontFamily: fonts.bodySemiBold, fontSize: 11, textTransform: "uppercase" }}>
            {formatDisplayDate(new Date(selectedDate))}
          </Text>
          {selectedWorkouts.map((w) => (
            <Link key={w.id} href={{ pathname: "/(tabs)/workouts/[id]", params: { id: w.id } }} asChild>
              <Pressable style={{ backgroundColor: colors.surface, borderRadius: 10, padding: 14 }}>
                <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 15 }}>{w.name}</Text>
                <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 12, textTransform: "capitalize", marginTop: 2 }}>{w.category}</Text>
              </Pressable>
            </Link>
          ))}
        </View>
      ) : (
        <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 13, textAlign: "center", marginTop: 8 }}>
          Tap a highlighted day to see its workouts.
        </Text>
      )}
    </ScrollView>
  );
}
