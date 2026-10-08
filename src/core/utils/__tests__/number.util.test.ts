import { describe, expect, it } from "@jest/globals";
import { parseLocaleFloat } from "../number.util";

describe("parseLocaleFloat", () => {
  // Regression test: typing "7,5" into a weight/reps/duration field (common on locales whose
  // keyboards use "," as the decimal separator) produced NaN with a bare Number() call.
  it("parses a comma-decimal string", () => {
    expect(parseLocaleFloat("7,5")).toBe(7.5);
  });

  it("parses a plain integer and a dot-decimal string", () => {
    expect(parseLocaleFloat("7")).toBe(7);
    expect(parseLocaleFloat("7.5")).toBe(7.5);
  });

  it("returns NaN for genuinely invalid input", () => {
    expect(Number.isNaN(parseLocaleFloat("abc"))).toBe(true);
  });
});
