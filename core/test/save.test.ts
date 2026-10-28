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

  it("migrates v2 saves to talents and validates talent choices", () => {
    const save = base();
    save.level = 10;
    const v2 = { ...save, version: 2 } as unknown as Record<string, unknown>;
    delete v2.talents;
    const migrated = migrateSave(v2);
    expect(migrated.version).toBe(SAVE_VERSION);
    expect(migrated.talents).toEqual([]);

    const invalid = base();
    invalid.talents = ["not_a_talent"];
    expect(validateSave(invalid).ok).toBe(false);

    const early = base();
    early.talents = ["warrior:0:0"];
    expect(validateSave(early).ok).toBe(false);

    const duplicateTier = base();
    duplicateTier.level = 10;
    duplicateTier.talents = ["warrior:0:0", "warrior:0:1"];
    expect(validateSave(duplicateTier).ok).toBe(false);
  });

  it("migrates v3 saves to difficulty and boss tracking", () => {
    const save = base();
    const v3 = { ...save, version: 3 } as unknown as Record<string, unknown>;
    delete v3.difficulty;
    delete v3.ngPlus;
    delete v3.defeatedBosses;
    const migrated = migrateSave(v3);
    expect(migrated.version).toBe(SAVE_VERSION);
    expect(migrated.difficulty).toBe("normal");
    expect(migrated.ngPlus).toBe(0);
    expect(migrated.defeatedBosses).toEqual([]);

    const invalid = base();
    invalid.difficulty = "impossible" as never;
    expect(validateSave(invalid).ok).toBe(false);
    invalid.difficulty = "nightmare";
    invalid.defeatedBosses = ["not_a_boss"];
    expect(validateSave(invalid).ok).toBe(false);
  });

  it("migrates v4 saves to story chapter tracking", () => {
    const save = base();
    const v4 = { ...save, version: 4 } as unknown as Record<string, unknown>;
    delete v4.storyChapter;
    const migrated = migrateSave(v4);
    expect(migrated.version).toBe(SAVE_VERSION);
    expect(migrated.storyChapter).toBe(0);

    const invalid = base();
    invalid.storyChapter = 150;
    expect(validateSave(invalid).ok).toBe(false);
  });

  it("resets incomplete legacy forest-watch progress when migrating v7 saves", () => {
    const save = base();
    save.quests.push({ id: "forest_watch", progress: [7], completed: false, completions: 0 });
    const migrated = migrateSave({ ...save, version: 7 });

    expect(migrated.version).toBe(SAVE_VERSION);
    expect(migrated.quests[0]?.progress).toEqual([0]);
    expect(migrated.quests[0]?.completed).toBe(false);
  });

  it("preserves completed legacy forest-watch quests", () => {
    const save = base();
    save.quests.push({ id: "forest_watch", progress: [12], completed: true, completions: 0 });
    const migrated = migrateSave({ ...save, version: 7 });

    expect(migrated.quests[0]?.progress).toEqual([12]);
    expect(migrated.quests[0]?.completed).toBe(true);
  });

  it("resets ambiguous legacy exploration progress and initializes gathering cooldowns", () => {
    const save = base();
    save.quests.push({ id: "wider_world", progress: [2], completed: false, completions: 0 });
    const migrated = migrateSave({ ...save, version: 8 });

    expect(migrated.version).toBe(SAVE_VERSION);
    expect(migrated.quests[0]).toMatchObject({ progress: [0], exploredZones: [] });
    expect(migrated.gatherCooldowns).toEqual({});
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
