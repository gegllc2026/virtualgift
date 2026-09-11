import { describe, expect, it } from "vitest";
import { t, isRtlLocale, listLocales } from "./index.js";

describe("i18n", () => {
  it("translates english keys", () => {
    expect(t("en", "gift.send")).toBe("Send");
  });

  it("interpolates variables", () => {
    expect(t("en", "battle.winner", { name: "Alex" })).toBe("Winner: Alex");
  });

  it("falls back to en for unknown locale", () => {
    expect(t("xx", "gift.send")).toBe("Send");
  });

  it("marks arabic as RTL", () => {
    expect(isRtlLocale("ar")).toBe(true);
    expect(isRtlLocale("en")).toBe(false);
  });

  it("lists supported locales", () => {
    expect(listLocales()).toContain("en");
    expect(listLocales()).toContain("ar");
  });
});
