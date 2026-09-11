import { describe, expect, it } from "vitest";
import { DefaultCoinScoringStrategy } from "./scoring.js";

describe("DefaultCoinScoringStrategy", () => {
  const strategy = new DefaultCoinScoringStrategy();

  it("calculates points as coinCost * quantity * multiplier", () => {
    expect(strategy.calculatePoints(100, 2, 1.5)).toBe(300);
  });

  it("returns 0 for invalid inputs", () => {
    expect(strategy.calculatePoints(-1, 2)).toBe(0);
    expect(strategy.calculatePoints(10, 0)).toBe(0);
  });
});
