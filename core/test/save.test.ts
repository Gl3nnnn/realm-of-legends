import { describe, expect, it } from "vitest";
import {
  CLASS_LIST,
  INVENTORY_SIZE,
  SAVE_VERSION,
  ZONES,
  characterSummary,
  cloneSave,
  createCharacter,
  getItem,
  migrateSave,
  sanitizeName,
  validateSave,
} from "../src/index";

describe("character creation", () => {
  it("creates a valid starter save for every class", () => {
    for (const def of CLASS_LIST) {
      const save = createCharacter(`Hero ${def.name}`.slice(0, 16), def.id);
      expect(save.classId).toBe(def.id);
      expect(save.level).toBe(1);
      expect(save.gold).toBeGreaterThan(0);
      expect(save.inventory).toHaveLength(INVENTORY_SIZE);
      expect(save.zone).toBe("village");
      expect(save.hp).toBeGreaterThan(0);
      expect(save.equipment.weapon?.itemId).toBeTruthy();
      const result = validateSave(save);
      expect(result.ok, result.ok ? "" : result.error).toBe(true);
    }
  });

  it("sanitizes and rejects unsafe or invalid names", () => {
    expect(sanitizeName("  <b>Alice</b>  ")).toBe("bAlice/b");
    expect(sanitizeName("A".repeat(40))).toHaveLength(16);
    expect(() => createCharacter("A", "warrior")).toThrow();
    expect(() => createCharacter("   ", "warrior")).toThrow();
    expect(() => createCharacter("Name\u0000Here", "warrior")).not.toThrow();
    expect(() => createCharacter("Valid Name", "not-a-class" as never)).toThrow();
  });
});

describe("save validation", () => {
  const base = () => createCharacter("Tester", "warrior");

  it("round-trips through JSON without losing data", () => {
    const save = base();
    save.gold = 1234;
    save.quests.push({ id: "slime_trouble", progress: [2], completed: false, completions: 0 });
    const copy = JSON.parse(JSON.stringify(save)) as unknown;
    const result = validateSave(copy);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.save.gold).toBe(1234);
    expect(cloneSave(save)).not.toBe(save);
  });

  it("rejects malformed saves with readable errors", () => {
    const save = base() as unknown as Record<string, unknown>;
    delete save.inventory;
    const missing = validateSave(save);
    expect(missing.ok).toBe(false);

    const badVersion = base();
    badVersion.version = SAVE_VERSION + 1;
    expect(validateSave(badVersion).ok).toBe(false);
    expect(() => migrateSave(badVersion)).toThrow(/newer version/i);

    const badItem = base();
    badItem.inventory[0] = { itemId: "not_an_item", qty: 1 };
    expect(validateSave(badItem).ok).toBe(false);

    const badPos = base();
    badPos.x = ZONES.village.width * ZONES.village.tileWidth + 50;
    expect(validateSave(badPos).ok).toBe(false);

    const badHp = base();
    badHp.hp = 50_000;
    expect(validateSave(badHp).ok).toBe(false);

    const badGear = base();
    badGear.equipment.weapon = { itemId: "oak_staff", qty: 1 };
    expect(validateSave(badGear).ok).toBe(false);
  });

  it("migrates a current-version save and rejects older ones", () => {
    const save = base();
    expect(migrateSave(save)).toMatchObject({ id: save.id, name: save.name });
    const old = { ...save, version: 0 };
    expect(() => migrateSave(old)).toThrow(/no longer supported/i);
    expect(() => migrateSave(null)).toThrow();
  });

  it("summarizes a save for character select", () => {
    const save = base();
    expect(characterSummary(save)).toMatchObject({
      id: save.id,
      name: "Tester",
      classId: "warrior",
      level: 1,
      zone: "Eldoria Village",
    });
    expect(getItem("health_potion").name).toBe("Health Potion");
  });
});
