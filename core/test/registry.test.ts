import { describe, expect, it } from "vitest";
import type { ZoneId } from "../src/types";
import {
  ABILITY_ICON_INDEX,
  ALL_ABILITIES,
  CHAR_INDEX,
  CLASS_LIST,
  FLAGSHIP_CLASSES,
  ITEM_ICON_INDEX,
  ITEM_LIST,
  ITEMS,
  MONSTER_INDEX,
  MONSTER_LIST,
  MONSTERS,
  NPCS,
  NPCS_LIST,
  QUEST_LIST,
  QUESTS,
  SHOPS,
  ZONE_LIST,
  canClassUse,
  getZone,
  isEquippable,
} from "../src/index";

function blockedAt(zone: (typeof ZONE_LIST)[number], x: number, y: number): boolean {
  const tx = Math.floor(x / zone.tileWidth);
  const ty = Math.floor(y / zone.tileHeight);
  if (tx < 0 || ty < 0 || tx >= zone.width || ty >= zone.height) return true;
  return zone.blocked[ty * zone.width + tx];
}

describe("class registry", () => {
  it("contains all 15 classes with unique ids and complete kits", () => {
    expect(CLASS_LIST).toHaveLength(15);
    expect(new Set(CLASS_LIST.map((c) => c.id)).size).toBe(15);
    expect(FLAGSHIP_CLASSES).toEqual(["warrior", "mage", "archer"]);
    for (const def of CLASS_LIST) {
      expect(def.name.length).toBeGreaterThan(1);
      expect(def.abilities).toHaveLength(5);
      expect(def.abilities.filter((a) => a.signature)).toHaveLength(1);
      expect(def.abilities.filter((a) => a.basic).length).toBe(0);
      expect(def.basic.basic).toBe(true);
      expect(new Set(def.abilities.map((a) => a.id)).size).toBe(5);
      expect(CHAR_INDEX[def.sprite]).toBeTypeOf("number");
      expect(Object.values(def.base).every((v) => v > 0)).toBe(true);
      for (const ability of def.abilities) {
        expect(ability.unlockLevel).toBeGreaterThanOrEqual(1);
        expect(ability.unlockLevel).toBeLessThanOrEqual(9);
        expect(ability.effects.length).toBeGreaterThan(0);
        expect(ABILITY_ICON_INDEX[ability.icon]).toBeTypeOf("number");
      }
    }
  });

  it("has unique skill ids across classes", () => {
    const skills = ALL_ABILITIES.filter((ability) => !ability.basic);
    expect(new Set(skills.map((a) => a.id)).size).toBe(skills.length);
    expect(ALL_ABILITIES.length).toBe(CLASS_LIST.length * 6);
  });
});

describe("item registry", () => {
  it("has valid, unique items and icons", () => {
    expect(new Set(ITEM_LIST.map((i) => i.id)).size).toBe(ITEM_LIST.length);
    for (const item of ITEM_LIST) {
      expect(item.name.length).toBeGreaterThan(1);
      expect(item.stack).toBeGreaterThanOrEqual(1);
      expect(item.sell).toBeGreaterThanOrEqual(0);
      expect(ITEM_ICON_INDEX[item.icon]).toBeTypeOf("number");
      if (item.buy !== undefined) expect(item.buy).toBeGreaterThan(0);
      if (isEquippable(item)) {
        expect(item.classes === undefined || item.classes.length > 0).toBe(true);
        if (item.classes) for (const id of item.classes) expect(CLASS_LIST.some((c) => c.id === id)).toBe(true);
      }
    }
  });

  it("gives every class a usable starter weapon", () => {
    for (const def of CLASS_LIST) {
      const weapon = ITEM_LIST.find((item) => item.type === "weapon" && canClassUse(item, def.id) && item.rarity === "common");
      expect(weapon, `${def.id} has no common weapon option`).toBeTruthy();
    }
  });
});

describe("monster, quest, npc and shop references", () => {
  it("has valid monsters and art frames", () => {
    expect(new Set(MONSTER_LIST.map((m) => m.id)).size).toBe(MONSTER_LIST.length);
    for (const monster of MONSTER_LIST) {
      expect(MONSTER_INDEX[monster.sprite]).toBeTypeOf("number");
      expect(monster.maxHp).toBeGreaterThan(0);
      for (const drop of monster.loot) {
        expect(ITEMS[drop.itemId], `unknown loot ${drop.itemId}`).toBeTruthy();
        expect(drop.chance).toBeGreaterThan(0);
        expect(drop.chance).toBeLessThanOrEqual(1);
        expect(drop.max).toBeGreaterThanOrEqual(drop.min);
      }
    }
    expect(MONSTER_LIST.filter((m) => m.boss).map((m) => m.id)).toContain("bone_warden");
  });

  it("has resolvable quest givers and objectives", () => {
    for (const quest of QUEST_LIST) {
      expect(NPCS[quest.giverNpc], `${quest.id} giver`).toBeTruthy();
      expect(NPCS[quest.giverNpc].quests ?? []).toContain(quest.id);
      expect(quest.objectives.length).toBeGreaterThan(0);
      for (const objective of quest.objectives) {
        if (objective.kind === "kill" || objective.kind === "boss") expect(MONSTERS[objective.monsterId]).toBeTruthy();
        if (objective.kind === "collect") {
          expect(ITEMS[objective.itemId]).toBeTruthy();
          expect(objective.count).toBeGreaterThan(0);
        }
        if (objective.kind === "visit") expect(ZONE_LIST.some((z) => z.id === objective.zone)).toBe(true);
        if (objective.kind === "explore") {
          expect(objective.zones.length).toBeGreaterThan(0);
          for (const zone of objective.zones) expect(ZONE_LIST.some((entry) => entry.id === zone)).toBe(true);
        }
        if (objective.kind === "survive") {
          expect(ZONE_LIST.some((zone) => zone.id === objective.zone)).toBe(true);
          expect(objective.count).toBeGreaterThan(0);
        }
      }
      for (const reward of quest.rewards.items ?? []) expect(ITEMS[reward.itemId]).toBeTruthy();
    }
  });

  it("has valid npc and shop references", () => {
    for (const npc of NPCS_LIST) {
      expect(CHAR_INDEX[npc.sprite]).toBeTypeOf("number");
      expect(npc.dialogue.length).toBeGreaterThan(0);
      for (const quest of npc.quests ?? []) expect(QUESTS[quest]).toBeTruthy();
      if (npc.shop) expect(SHOPS[npc.shop]).toBeTruthy();
    }
    for (const shop of Object.values(SHOPS)) {
      for (const itemId of shop.itemIds) {
        const item = ITEMS[itemId];
        expect(item, `${shop.id} sells unknown ${itemId}`).toBeTruthy();
        expect(item.buy).toBeGreaterThan(0);
      }
    }
  });
});

describe("zone data", () => {
  it("keeps every spawn, portal, npc, chest, trap and gather node on walkable ground", () => {
    for (const zone of ZONE_LIST) {
      expect(zone.blocked).toHaveLength(zone.width * zone.height);
      expect(blockedAt(zone, zone.spawn.x, zone.spawn.y), `${zone.id} spawn`).toBe(false);
      for (const portal of zone.portals) {
        const target = getZone(portal.targetZone);
        expect(portal.targetX).toBeGreaterThanOrEqual(0);
        expect(portal.targetY).toBeGreaterThanOrEqual(0);
        expect(portal.targetX).toBeLessThan(target.width * target.tileWidth);
        expect(portal.targetY).toBeLessThan(target.height * target.tileHeight);
        expect(blockedAt(target, portal.targetX, portal.targetY), `${zone.id} portal target`).toBe(false);
      }
      for (const npc of zone.npcs) {
        expect(NPCS[npc.id]).toBeTruthy();
        expect(blockedAt(zone, npc.x, npc.y), `${zone.id}/${npc.id}`).toBe(false);
      }
      for (const spawn of zone.monsterSpawns) {
        expect(MONSTERS[spawn.id]).toBeTruthy();
        expect(blockedAt(zone, spawn.x, spawn.y), `${zone.id}/${spawn.id}`).toBe(false);
      }
      for (const chest of zone.chests) {
        const cx = Math.floor(chest.x / zone.tileWidth);
        const cy = Math.floor(chest.y / zone.tileHeight);
        const reachable = [
          [0, 0],
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ].some(([dx, dy]) => !blockedAt(zone, (cx + dx) * zone.tileWidth + zone.tileWidth / 2, (cy + dy) * zone.tileHeight + zone.tileHeight / 2));
        expect(reachable, `${zone.id}/${chest.id} is unreachable`).toBe(true);
      }
      for (const node of zone.gatherNodes) {
        expect(ITEMS[node.itemId]).toBeTruthy();
        expect(blockedAt(zone, node.x, node.y), `${zone.id}/${node.id}`).toBe(false);
      }
      for (const trap of zone.traps) expect(blockedAt(zone, trap.x, trap.y), `${zone.id}/${trap.id}`).toBe(false);
    }
  });

  it("links every zone into one reachable world", () => {
    const expected = ["dungeon", "forest", "frost", "marsh", "throne", "village"];
    expect(ZONE_LIST.map((z) => z.id).sort()).toEqual(expected);
    const reachable = new Set<string>();
    const queue = ["village"];
    while (queue.length) {
      const id = queue.pop()!;
      if (reachable.has(id)) continue;
      reachable.add(id);
      for (const portal of getZone(id as ZoneId).portals) queue.push(portal.targetZone);
    }
    expect([...reachable].sort()).toEqual(expected);
  });
});
