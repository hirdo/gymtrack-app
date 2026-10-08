// RN's numeric TextInputs (even with keyboardType="decimal-pad") happily let a user type a
// comma, and plenty of locales' own keyboards use "," as the decimal separator (e.g. "7,5" kg).
// Number("7,5") is NaN, which silently broke every weight/reps/duration field in the app for
// anyone typing a comma-decimal. Swap the first comma for a dot before parsing.
export function parseLocaleFloat(text: string): number {
  return Number(text.replace(",", "."));
}
