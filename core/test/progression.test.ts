import { describe, expect, it } from "vitest";
import {
  LEVEL_CAP,
  CLASS_LIST,
  deriveStats,
  equipmentBonuses,
  getClass,
  isAbilityUnlocked,
  resourceRegen,
  totalXpForLevel,
  unlockedAbilities,
  xpToNext,
} from "../src/index";

describe("experience curve", () => {
  it("increases smoothly and stops at the level cap", () => {
    expect(xpToNext(1)).toBeGreaterThan(0);
    for (let level = 1; level < LEVEL_CAP - 1; level += 1) {
      expect(xpToNext(level + 1)).toBeGreaterThan(xpToNext(level));
    }
    expect(xpToNext(LEVEL_CAP)).toBe(0);
    expect(totalXpForLevel(LEVEL_CAP)).toBeGreaterThan(totalXpForLevel(1));
  });
});

describe("derived stats", () => {
  it("grows with level for every class", () => {
    for (const def of CLASS_LIST) {
      const low = deriveStats(def, 1, {});
      const high = deriveStats(def, 20, {});
      expect(high.maxHp).toBeGreaterThan(low.maxHp);
      expect(high.attack).toBeGreaterThan(low.attack);
      expect(high.defense).toBeGreaterThanOrEqual(low.defense);
      expect(high.maxResource).toBeGreaterThanOrEqual(low.maxResource);
    }
  });

  it("applies equipment bonuses and caps crit", () => {
    const def = getClass("warrior");
    const gear = {
      weapon: { itemId: "steel_sword", qty: 1 },
      armor: { itemId: "chainmail", qty: 1 },
      trinket: { itemId: "sage_amulet", qty: 1 },
    };
    const bonuses = equipmentBonuses(gear);
    expect(Object.keys(bonuses).length).toBeGreaterThan(0);
    const base = deriveStats(def, 10, {});
    const geared = deriveStats(def, 10, gear);
    expect(geared.attack).toBeGreaterThanOrEqual(base.attack);
    expect(geared.crit).toBeLessThanOrEqual(0.75);
    expect(deriveStats(def, 10, { trinket: { itemId: "copper_ring", qty: 1 } }).crit).toBeGreaterThanOrEqual(base.crit);
  });

  it("unlocks abilities at their listed levels", () => {
    for (const def of CLASS_LIST) {
      expect(isAbilityUnlocked(def, 1, "basic")).toBe(true);
      const atOne = unlockedAbilities(def, 1);
      expect(atOne.length).toBeGreaterThanOrEqual(1);
      for (const ability of def.abilities) {
        expect(isAbilityUnlocked(def, ability.unlockLevel, ability.id)).toBe(true);
        expect(isAbilityUnlocked(def, ability.unlockLevel - 1, ability.id)).toBe(false);
      }
      expect(unlockedAbilities(def, LEVEL_CAP)).toHaveLength(5);
    }
  });

  it("regenerates only mana and energy", () => {
    expect(resourceRegen("rage", 100)).toBe(0);
    expect(resourceRegen("mana", 100)).toBeGreaterThan(0);
    expect(resourceRegen("energy", 100)).toBeGreaterThan(0);
  });
});
