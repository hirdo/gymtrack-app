// Pure date-grid math ported from gymtrack-web's ScheduleComponent (getMonday/getMonthStart and
// the week/month date computations), reused here for both the Schedule screen and the
// scheduled-date picker on the workout form — no native date-picker dependency needed.
export function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function getMonthStart(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), 1);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function getWeekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

export function getMonthGridDates(monthStart: Date): Date[] {
  const gridStart = getMonday(monthStart);
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
  const gridEndWeekStart = getMonday(monthEnd);
  const totalDays = Math.round((gridEndWeekStart.getTime() - gridStart.getTime()) / 86400000) + 7;
  return Array.from({ length: totalDays }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

export function isSameMonth(date: Date, monthStart: Date): boolean {
  return date.getMonth() === monthStart.getMonth() && date.getFullYear() === monthStart.getFullYear();
}
