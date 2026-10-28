import { describe, expect, it } from "vitest";
import {
  GameSession,
  INVENTORY_SIZE,
  ZONES,
  getItem,
  getTalentTree,
  createCharacter,
  validateSave,
  type CharacterSave,
  type InputState,
} from "../src/index";

const IDLE: InputState = { moveX: 0, moveY: 0, aimX: 0, aimY: 0 };

function saveIn(zone: CharacterSave["zone"], classId: CharacterSave["classId"] = "warrior"): CharacterSave {
  const save = createCharacter("Tester", classId);
  save.zone = zone;
  return save;
}

function forestSession(classId: CharacterSave["classId"] = "warrior"): GameSession {
  const save = saveIn("forest", classId);
  save.x = 72;
  save.y = 360;
  return new GameSession(save);
}

describe("movement and collision", () => {
  it("moves the player and clamps to walkable ground", () => {
    const session = forestSession();
    const start = { x: session.save.x, y: session.save.y };
    for (let i = 0; i < 20; i += 1) session.step(0.05, { ...IDLE, moveX: 1 });
    expect(session.save.x).toBeGreaterThan(start.x);
    expect(session.isBlockedAt(session.save.x, session.save.y, 9)).toBe(false);
    const blocked = session.zone.blocked.findIndex(Boolean);
    const tx = blocked % session.zone.width;
    const ty = Math.floor(blocked / session.zone.width);
    expect(session.isBlockedAt(tx * 16 + 8, ty * 16 + 8, 9)).toBe(true);
  });

  it("constructs every class and performs a basic attack", () => {
    for (const classId of ["warrior", "mage", "archer", "assassin", "paladin", "priest", "necromancer", "druid", "monk", "gunslinger", "berserker", "summoner", "ranger", "spellblade", "dragonknight"] as const) {
      const session = forestSession(classId);
      expect(session.castAbility("basic", { x: session.save.x + 40, y: session.save.y })).toBe(true);
      expect(session.abilityCooldown("basic")).toBeGreaterThan(0);
    }
  });
});

describe("combat", () => {
  it("damages nearby monsters with a melee strike", () => {
    const session = forestSession();
    const slime = session.monsters.find((m) => m.defId === "slime");
    expect(slime).toBeTruthy();
    slime!.x = session.save.x + 28;
    slime!.y = session.save.y;
    slime!.state = "idle";
    const before = slime!.hp;
    expect(session.castAbility("basic", { x: slime!.x, y: slime!.y })).toBe(true);
    const events = session.drainEvents();
    expect(slime!.hp).toBeLessThan(before);
    expect(events.some((event) => event.type === "damage" && event.target === "monster")).toBe(true);
  });

  it("spends resources and enforces cooldowns", () => {
    const session = forestSession("mage");
    const ability = session.classInfo.abilities[0];
    const before = session.save.resource;
    expect(session.castAbility(ability.id, { x: session.save.x + 80, y: session.save.y })).toBe(true);
    expect(session.save.resource).toBeLessThanOrEqual(before);
    expect(session.abilityCooldown(ability.id)).toBeGreaterThan(0);
    const current = session.save.resource;
    session.save.resource = 999;
    expect(session.castAbility(ability.id, { x: session.save.x + 80, y: session.save.y })).toBe(false);
    session.save.resource = current;
  });

  it("kills a monster for xp, gold and loot events", () => {
    const session = forestSession();
    const slime = session.monsters.find((m) => m.defId === "slime")!;
    slime.x = session.save.x + 20;
    slime.y = session.save.y;
    slime.hp = 1;
    const xp = session.save.xp;
    session.castAbility("basic", { x: slime.x, y: slime.y });
    const events = session.drainEvents();
    expect(slime.state).toBe("dead");
    expect(events.some((event) => event.type === "death" && event.who === "monster")).toBe(true);
    expect(session.save.xp).not.toBe(xp);
    expect(events.some((event) => event.type === "gold")).toBe(true);
  });

  it("dies and respawns in the village", () => {
    const session = forestSession();
    session.save.hp = 1;
    const wolf = session.monsters.find((m) => m.defId === "wolf")!;
    wolf.x = session.save.x + 18;
    wolf.y = session.save.y;
    wolf.spawnX = wolf.x;
    wolf.spawnY = wolf.y;
    wolf.attackTimer = 0;
    for (let i = 0; i < 80 && !session.dead; i += 1) session.step(0.05, IDLE);
    expect(session.dead).toBe(true);
    expect(session.respawnTimer).toBeGreaterThan(0);
    for (let i = 0; i < 120 && session.dead; i += 1) session.step(0.05, IDLE);
    expect(session.dead).toBe(false);
    expect(session.save.zone).toBe("village");
    expect(session.save.hp).toBeGreaterThan(0);
  });
});

describe("inventory, equipment and economy", () => {
  it("uses consumables and respects stack sizes", () => {
    const session = forestSession();
    const stats = session.stats;
    session.save.hp = Math.max(1, stats.maxHp - 100);
    const before = session.save.hp;
    expect(session.useItem(0)).toBe(true);
    expect(session.save.hp).toBeGreaterThan(before);
    expect(session.countItem("health_potion")).toBe(2);
  });

  it("equips class-valid gear and rejects incompatible items", () => {
    const session = forestSession("mage");
    const swordSlot = session.addItem("iron_sword", 1) === 0 ? session.save.inventory.findIndex((stack) => stack?.itemId === "iron_sword") : -1;
    expect(swordSlot).toBeGreaterThanOrEqual(0);
    expect(session.equip(swordSlot)).toBe(false);
    const staffSlot = session.save.inventory.findIndex((stack) => stack?.itemId === "oak_staff");
    expect(staffSlot).toBe(-1);
    session.addItem("ember_staff", 1);
    const emberSlot = session.save.inventory.findIndex((stack) => stack?.itemId === "ember_staff");
    expect(emberSlot).toBeGreaterThanOrEqual(0);
    expect(session.equip(emberSlot)).toBe(true);
    expect(session.save.equipment.weapon?.itemId).toBe("ember_staff");
    expect(session.unequip("weapon")).toBe(true);
    expect(session.save.inventory.some((stack) => stack?.itemId === "ember_staff")).toBe(true);
  });

  it("buys, sells and heals at NPC prices", () => {
    const session = new GameSession(saveIn("village"));
    session.save.gold = 500;
    expect(session.buy("general", "health_potion")).toBe(true);
    expect(session.save.gold).toBe(475);
    expect(session.countItem("health_potion")).toBe(4);
    const slot = session.save.inventory.findIndex((stack) => stack?.itemId === "health_potion");
    expect(session.sell(slot)).toBe(true);
    expect(session.save.gold).toBe(485);

    session.save.hp = 1;
    const healCost = session.healCost();
    expect(healCost).toBeGreaterThan(0);
    expect(session.healAtNpc()).toBe(true);
    expect(session.save.hp).toBe(session.stats.maxHp);
    expect(session.save.gold).toBe(485 - healCost);
    expect(session.healAtNpc()).toBe(false);
  });

  it("reports overflow when the backpack is full", () => {
    const session = new GameSession(saveIn("village"));
    for (let i = 0; i < INVENTORY_SIZE; i += 1) session.save.inventory[i] = { itemId: "herb", qty: getItem("herb").stack };
    expect(session.canAdd("herb", 1)).toBe(false);
    expect(session.addItem("herb", 3)).toBe(3);
  });

  it("picks up nearby ground loot", () => {
    const session = new GameSession(saveIn("village"));
    const before = session.countItem("herb");
    session.loot.push({ uid: "test_drop", itemId: "herb", qty: 2, x: session.save.x, y: session.save.y, ttl: 30 });
    session.step(0.05, IDLE);
    expect(session.countItem("herb")).toBe(before + 2);
    expect(session.loot).toHaveLength(0);
  });
});

describe("quests", () => {
  it("tracks kills, completes and rewards a quest", () => {
    const session = forestSession();
    expect(session.acceptQuest("slime_trouble")).toBe(true);
    expect(session.acceptQuest("slime_trouble")).toBe(false);
    const slimes = session.monsters.filter((m) => m.defId === "slime").slice(0, 5);
    expect(slimes).toHaveLength(5);
    for (const slime of slimes) {
      slime.x = session.save.x + 20;
      slime.y = session.save.y;
      slime.hp = 1;
      session.cooldowns.basic = 0;
      expect(session.castAbility("basic", { x: slime.x, y: slime.y })).toBe(true);
      session.drainEvents();
    }
    const state = session.save.quests.find((q) => q.id === "slime_trouble");
    expect(state?.progress[0]).toBe(5);
    expect(state?.completed).toBe(true);
    const gold = session.save.gold;
    const xp = session.save.xp;
    expect(session.turnInQuest("slime_trouble")).toBe(true);
    expect(session.save.gold).toBeGreaterThan(gold);
    expect(session.save.xp).not.toBe(xp);
    expect(session.countItem("health_potion")).toBeGreaterThanOrEqual(2);
    expect(session.getNpcQuestStates("guard").find((entry) => entry.questId === "slime_trouble")?.canTurnIn).toBe(false);
  });

  it("reports quest availability by level and giver", () => {
    const session = new GameSession(saveIn("village"));
    const states = session.getNpcQuestStates("guard");
    expect(states.find((entry) => entry.questId === "slime_trouble")?.available).toBe(true);
    expect(states.find((entry) => entry.questId === "bone_breaker")?.available).toBe(false);
    expect(states.find((entry) => entry.questId === "wardens_end")).toBeUndefined();
  });
});

describe("item instances, affixes and crafting", () => {
  it("crafts an affixed item and upgrades equipped gear", () => {
    const session = new GameSession(saveIn("village"));
    session.save.gold = 1000;
    session.addItem("iron_ore", 20);
    expect(session.craft("craft_iron_sword")).toBe(true);
    const craftedSlot = session.save.inventory.findIndex((stack) => stack?.itemId === "iron_sword" && stack.instance);
    expect(craftedSlot).toBeGreaterThanOrEqual(0);
    const crafted = session.save.inventory[craftedSlot]!;
    expect(crafted.instance?.affixes.length).toBeGreaterThan(0);
    expect(session.equip(craftedSlot)).toBe(true);
    const cost = session.upgradeCost("weapon");
    expect(cost).not.toBeNull();
    const before = session.stats.attack;
    expect(session.upgradeEquipped("weapon")).toBe(true);
    expect(session.save.equipment.weapon?.instance?.upgrade).toBe(1);
    expect(session.stats.attack).toBeGreaterThan(before);
    expect(validateSave(session.snapshot()).ok).toBe(true);
  });

  it("rejects crafting without materials", () => {
    const session = new GameSession(saveIn("village"));
    session.save.gold = 1000;
    expect(session.craft("craft_steel_sword")).toBe(false);
  });
});

describe("talents", () => {
  it("learns one talent per tier and applies its bonuses", () => {
    const save = saveIn("village");
    save.level = 5;
    const session = new GameSession(save);
    const tree = getTalentTree("warrior");
    const first = tree.tiers[0].choices[0];
    const second = tree.tiers[0].choices[1];
    const before = session.stats.attack;
    expect(session.learnTalent(first.id)).toBe(true);
    expect(session.stats.attack).toBeGreaterThan(before);
    expect(session.learnTalent(second.id)).toBe(false);
    expect(session.learnTalent(tree.tiers[1].choices[0].id)).toBe(false);
    expect(validateSave(session.snapshot()).ok).toBe(true);
  });

  it("respecs at the trainer for gold", () => {
    const save = saveIn("village");
    save.level = 5;
    save.gold = 500;
    const session = new GameSession(save);
    const first = getTalentTree("warrior").tiers[0].choices[0];
    expect(session.learnTalent(first.id)).toBe(true);
    const cost = session.respecCost();
    expect(cost).toBeGreaterThan(0);
    expect(session.respecTalents()).toBe(true);
    expect(session.save.talents).toEqual([]);
    expect(session.save.gold).toBe(500 - cost);
    expect(session.respecTalents()).toBe(false);
  });
});

describe("chests", () => {
  it("finds a chest only when the hero is in range", () => {
    const session = new GameSession(saveIn("forest"));
    const chest = session.zone.chests.find((c) => c.id === "forest_chest_1")!;
    expect(chest).toBeTruthy();

    session.save.x = chest.x + 20;
    session.save.y = chest.y;
    expect(session.findInteractable()?.id).toBe("forest_chest_1");

    session.save.x = chest.x + 200;
    session.save.y = chest.y;
    expect(session.findInteractable()?.id).not.toBe("forest_chest_1");
  });

  it("skips a chest that is already opened", () => {
    const session = new GameSession(saveIn("forest"));
    const chest = session.zone.chests.find((c) => c.id === "forest_chest_1")!;
    session.save.x = chest.x;
    session.save.y = chest.y;
    session.save.openedChests.push("forest_chest_1");
    expect(session.findInteractable()?.id).not.toBe("forest_chest_1");
  });
});

describe("zones and persistence", () => {
  it("travels through a portal and produces a valid snapshot", () => {
    const session = new GameSession(saveIn("village"));
    const portal = session.zone.portals[0];
    session.save.x = portal.x + portal.w / 2;
    session.save.y = portal.y + portal.h / 2;
    const target = session.interact();
    expect(target?.kind).toBe("portal");
    expect(session.save.zone).toBe(portal.targetZone);
    expect(session.zone.id).toBe(portal.targetZone);
    const snapshot = session.snapshot();
    const result = validateSave(snapshot);
    expect(result.ok, result.ok ? "" : result.error).toBe(true);
    expect(snapshot.zone).toBe(portal.targetZone);
  });
});

describe("difficulty, elites and bosses", () => {
  it("scales enemies by difficulty and cycle", () => {
    const normal = saveIn("forest");
    const nightmare = saveIn("forest");
    nightmare.difficulty = "nightmare";
    nightmare.ngPlus = 1;
    const normalSession = new GameSession(normal);
    const hardSession = new GameSession(nightmare);
    const normalSlime = normalSession.monsters.find((m) => m.defId === "slime")!;
    const hardSlime = hardSession.monsters.find((m) => m.defId === "slime")!;
    expect(hardSlime.maxHp!).toBeGreaterThan(normalSlime.maxHp!);
    expect(hardSession.difficultyScale.attack).toBeGreaterThan(1);
    expect(hardSession.setDifficulty("story")).toBe(true);
    expect(hardSession.save.difficulty).toBe("story");
  });

  it("advances bosses through phases", () => {
    const save = saveIn("throne");
    const session = new GameSession(save);
    const king = session.monsters.find((m) => m.defId === "hollow_king")!;
    expect(king).toBeTruthy();
    king.hp = king.maxHp! * 0.6;
    const events = session.step(0.05, IDLE);
    expect(king.phase).toBe(1);
    expect(events.some((event) => event.type === "log" && event.text.includes("phase 2"))).toBe(true);
  });

  it("starts New Game+ only after the final boss", () => {
    const save = saveIn("village");
    const session = new GameSession(save);
    expect(session.canNewGamePlus()).toBe(false);
    expect(session.startNewGamePlus()).toBe(false);
    session.save.defeatedBosses.push("hollow_king");
    expect(session.startNewGamePlus()).toBe(true);
    expect(session.save.ngPlus).toBe(1);
    expect(session.save.zone).toBe("village");
    expect(session.save.quests).toEqual([]);
  });
});

describe("walkable placement", () => {
  // A point is walkable when its tile in the zone's blocked grid is free.
  function isWalkable(zone: (typeof ZONES)[keyof typeof ZONES], x: number, y: number): boolean {
    const col = Math.floor(x / zone.tileWidth);
    const row = Math.floor(y / zone.tileHeight);
    if (col < 0 || row < 0 || col >= zone.width || row >= zone.height) return false;
    return !zone.blocked[row * zone.width + col];
  }

  for (const zone of Object.values(ZONES)) {
    it(`${zone.id}: spawn point is on walkable ground`, () => {
      expect(isWalkable(zone, zone.spawn.x, zone.spawn.y)).toBe(true);
    });

    it(`${zone.id}: every chest is on walkable ground`, () => {
      for (const chest of zone.chests) {
        expect(isWalkable(zone, chest.x, chest.y), chest.id).toBe(true);
      }
    });
  }
});
