import { describe, expect, it } from "vitest";
import {
  GameSession,
  INVENTORY_SIZE,
  MAX_GOLD,
  RECIPES,
  Rng,
  ZONES,
  getItem,
  getTalentTree,
  createCharacter,
  validateSave,
  type CharacterSave,
  type InputState,
  type ProjectileInstance,
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
    for (const classId of ["warrior", "mage", "archer", "assassin", "paladin", "priest", "necromancer", "druid", "monk", "gunslinger", "berserker", "summoner", "ranger", "spellblade", "dragonknight", "warden", "oracle", "battlemage", "shadowdancer", "artificer", "beastmaster", "duelist", "elementalist", "sentinel", "stormcaller"] as const) {
      const session = forestSession(classId);
      expect(session.save.equipment.weapon?.itemId).toBeTruthy();
      expect(session.castAbility("basic", { x: session.save.x + 40, y: session.save.y })).toBe(true);
      expect(session.abilityCooldown("basic")).toBeGreaterThan(0);
    }
  });
});

describe("combat", () => {
  it("heals the necromancer only when Soul Drain's projectile hits", () => {
    const session = forestSession("necromancer");
    session.zone = { ...session.zone, blocked: Array(session.zone.blocked.length).fill(false) };
    for (const monster of session.monsters) monster.state = "dead";
    const target = session.monsters.find((monster) => monster.defId === "slime")!;
    session.save.x = 300;
    session.save.y = 300;
    target.x = 380;
    target.y = 300;
    target.spawnX = target.x;
    target.spawnY = target.y;
    target.state = "idle";
    target.wanderTimer = 100;
    target.wanderX = target.x;
    target.wanderY = target.y;
    session.save.hp = 50;

    expect(session.castAbility("soul_drain", { x: target.x, y: target.y })).toBe(true);
    expect(session.save.hp).toBe(50);
    for (let i = 0; i < 10 && session.projectiles.length > 0; i += 1) session.step(0.05, IDLE);

    expect(target.hp).toBeLessThan(target.maxHp!);
    expect(session.save.hp).toBeGreaterThan(50);
  });

  it("does not apply damage-over-time beyond the status's remaining duration", () => {
    const session = forestSession();
    for (const monster of session.monsters) monster.state = "dead";
    session.save.hp = session.stats.maxHp;
    session.statuses.push({ kind: "poison", remaining: 0.05, value: 10 });
    const before = session.save.hp;

    session.step(0.1, IDLE);

    expect(session.save.hp).toBeCloseTo(before - 0.5);
  });

  it("limits projectile travel to the ability's configured range", () => {
    const session = forestSession("archer");
    session.zone = { ...session.zone, blocked: Array(session.zone.blocked.length).fill(false) };

    expect(session.castAbility("basic", { x: session.save.x + 330, y: session.save.y })).toBe(true);

    const projectile = session.projectiles[0]!;
    expect((projectile.x - session.save.x) + projectile.ttl * projectile.speed).toBeCloseTo(330);
  });

  it("uses the effective cooldown duration after talent reductions", () => {
    const save = saveIn("forest", "mage");
    save.level = 5;
    const session = new GameSession(save);
    expect(session.learnTalent("mage:0:1")).toBe(true);

    expect(session.castAbility("fireball", { x: session.save.x + 100, y: session.save.y })).toBe(true);

    expect(session.abilityCooldown("fireball")).toBeCloseTo(session.abilityCooldownDuration("fireball"));
    expect(session.abilityCooldownDuration("fireball")).toBeLessThan(5);
  });

  it("only hits melee targets inside the aim arc", () => {
    const session = forestSession();
    const slimes = session.monsters.filter((monster) => monster.defId === "slime").slice(0, 2);
    const [front, behind] = slimes;
    front!.x = session.save.x + 22;
    front!.y = session.save.y;
    behind!.x = session.save.x - 22;
    behind!.y = session.save.y;
    const frontHp = front!.hp;
    const behindHp = behind!.hp;

    expect(session.castAbility("basic", { x: session.save.x + 100, y: session.save.y })).toBe(true);

    expect(front!.hp).toBeLessThan(frontHp);
    expect(behind!.hp).toBe(behindHp);
  });

  it("blocks line of sight through solid map tiles", () => {
    const session = forestSession();
    const tileX = 8;
    const tileY = 22;
    session.zone.blocked[tileY * session.zone.width + tileX] = true;

    expect(session.hasLineOfSight(100, 360, 200, 360)).toBe(false);
    expect(session.hasLineOfSight(100, 340, 140, 340)).toBe(true);
  });

  it("keeps ordinary melee enemies from attacking through walls", () => {
    const session = forestSession();
    const slime = session.monsters.find((monster) => monster.defId === "slime")!;
    session.save.x = 100;
    session.save.y = 100;
    slime.x = 140;
    slime.y = 100;
    slime.spawnX = slime.x;
    slime.spawnY = slime.y;
    slime.state = "attack";
    slime.attackTimer = 0;
    session.zone.blocked[6 * session.zone.width + 7] = true;
    const hp = session.save.hp;

    session.step(0.1, IDLE);

    expect(session.save.hp).toBe(hp);
    expect(session.telegraphs.some((telegraph) => telegraph.sourceUid === slime.uid)).toBe(false);
  });

  it("prevents self-area attacks from damaging enemies behind walls", () => {
    const save = saveIn("forest");
    save.level = 3;
    const session = new GameSession(save);
    const target = session.monsters.find((monster) => monster.defId === "slime")!;
    session.save.x = 100;
    session.save.y = 360;
    target.x = 160;
    target.y = 360;
    target.state = "idle";
    session.zone.blocked[22 * session.zone.width + 8] = true;
    const hp = target.hp;

    expect(session.castAbility("whirlwind", { x: session.save.x, y: session.save.y })).toBe(true);

    expect(target.hp).toBe(hp);
  });

  it("detects fast projectiles crossing a monster between frames", () => {
    const session = forestSession("archer");
    session.zone.blocked.fill(false);
    session.save.x = 100;
    session.save.y = 360;
    const target = session.monsters.find((monster) => monster.defId === "slime")!;
    target.x = 240;
    target.y = 360;
    target.state = "idle";
    const projectile: ProjectileInstance = {
      uid: "test-fast-projectile",
      abilityId: "test",
      x: 120,
      y: 360,
      dirX: 1,
      dirY: 0,
      speed: 1500,
      ttl: 1,
      radius: 3,
      damage: 1000,
      crit: 0,
      damageType: "physical",
      color: "#ffffff",
      statuses: [],
      owner: "player",
    };
    session.projectiles.push(projectile);

    session.step(0.1, IDLE);

    expect(target.state).toBe("dead");
    expect(projectile.hit).toBe(true);
  });

  it("damages a monster only once when a projectile overlaps it across steps", () => {
    const session = forestSession("archer");
    session.zone.blocked.fill(false);
    for (const monster of session.monsters) monster.state = "dead";
    session.save.x = 100;
    session.save.y = 360;
    const target = session.monsters.find((monster) => monster.defId === "slime")!;
    target.state = "idle";
    target.x = 160;
    target.y = 360;
    target.spawnX = target.x;
    target.spawnY = target.y;
    target.hp = 100000;
    target.maxHp = 100000;
    session.projectiles.push({
      uid: "test-overlap-projectile",
      abilityId: "test",
      x: 100,
      y: 360,
      dirX: 1,
      dirY: 0,
      speed: 800,
      ttl: 1,
      radius: 3,
      damage: 10,
      crit: 0,
      damageType: "physical",
      color: "#ffffff",
      statuses: [],
      owner: "player",
    });

    const events = session.step(0.1, IDLE);
    const hits = events.filter((event) =>
      event.type === "damage" && event.target === "monster" && event.uid === target.uid);

    expect(hits).toHaveLength(1);
  });

  it("stops knockback at walls without leaving monsters embedded in terrain", () => {
    const session = forestSession();
    const target = session.monsters.find((monster) => monster.defId === "slime")!;
    target.x = 165;
    target.y = 360;
    const wallX = Math.floor(180 / session.zone.tileWidth);
    const wallY = Math.floor(360 / session.zone.tileHeight);
    session.zone.blocked[wallY * session.zone.width + wallX] = true;

    session.pushMonster(target, 50, 0);

    expect(target.x).toBeLessThan(180);
    expect(session.isBlockedAt(target.x, target.y, 10)).toBe(false);
  });

  it("refreshes damage-over-time effects instead of stacking their damage", () => {
    const session = forestSession();
    const target = session.monsters.find((monster) => monster.defId === "slime")!;
    const burn = { kind: "burn" as const, remaining: 3, value: 4 };
    session.hitMonster(target, 1, false, "fire", [burn]);
    session.hitMonster(target, 1, false, "fire", [{ ...burn, remaining: 5, value: 6 }]);

    expect(target.statuses.filter((status) => status.kind === "burn")).toHaveLength(1);
    expect(target.statuses.find((status) => status.kind === "burn")).toMatchObject({ remaining: 5, value: 6 });
  });

  it("ticks monster status durations once per simulation step", () => {
    const session = forestSession();
    const target = session.monsters.find((monster) => monster.defId === "slime")!;
    target.statuses.push({ kind: "slow", remaining: 0.15, value: 50 });

    session.step(0.1, IDLE);
    expect(target.statuses[0]?.remaining).toBeCloseTo(0.05);
    session.step(0.1, IDLE);
    expect(target.statuses.some((status) => status.kind === "slow")).toBe(false);
  });

  it("caps active summoned companions and replaces the oldest on recast", () => {
    const session = forestSession("summoner");
    const summon = { kind: "summon" as const, summonId: "spirit_wolf", summonCount: 3 };
    session.summon(summon);
    const oldest = session.pets[0]?.uid;
    session.summon(summon);

    expect(session.pets).toHaveLength(4);
    expect(session.pets.some((pet) => pet.uid === oldest)).toBe(false);
  });

  it("applies every stat in a multi-stat buff", () => {
    const session = forestSession("priest");
    session.save.level = 3;
    const attack = session.stats.attack;
    const defense = session.stats.defense;

    expect(session.castAbility("blessing", { x: session.save.x, y: session.save.y })).toBe(true);

    expect(session.stats.attack).toBeGreaterThan(attack);
    expect(session.stats.defense).toBeGreaterThan(defense);
    expect(session.buffs.filter((buff) => buff.name === "Blessing")).toHaveLength(2);
  });

  it("triggers ranger snares on monsters without harming the player", () => {
    const session = forestSession("ranger");
    const target = session.monsters.find((monster) => monster.defId === "slime")!;
    for (const monster of session.monsters) {
      if (monster !== target) monster.state = "dead";
    }
    session.save.x = 300;
    session.save.y = 300;
    target.x = 340;
    target.y = 300;
    target.state = "idle";
    const hp = session.save.hp;
    const monsterHp = target.hp;
    session.placeTrap(
      { kind: "trap", amount: 20, scaling: 0.8, damageType: "physical", radius: 45, duration: 1.5 },
      { x: 300, y: 300 },
    );

    session.step(0.05, IDLE);

    expect(session.save.hp).toBe(hp);
    expect(target.hp).toBeLessThan(monsterHp);
    expect(target.statuses.some((status) => status.kind === "stun" && status.remaining >= 1.5)).toBe(true);
    expect(session.traps.some((trap) => trap.kind === "snare")).toBe(false);
  });

  it("uses each environment trap's configured cooldown", () => {
    const session = new GameSession(saveIn("dungeon"));
    for (const monster of session.monsters) monster.state = "dead";
    const trap = session.traps[0]!;
    session.save.x = trap.x;
    session.save.y = trap.y;

    session.step(0.05, IDLE);

    expect(trap.armed).toBe(false);
    expect(trap.rearmTimer).toBe(session.zone.traps[0]!.cooldown);
    expect(trap.rearmDelay).toBe(session.zone.traps[0]!.cooldown);
  });

  it("updates existing monsters when difficulty changes", () => {
    const session = forestSession();
    const slime = session.monsters.find((monster) => monster.defId === "slime")!;
    const healthRatio = slime.hp / slime.maxHp!;

    expect(session.setDifficulty("nightmare")).toBe(true);

    expect(slime.maxHp).toBeGreaterThan(45);
    expect(slime.hp / slime.maxHp!).toBeCloseTo(healthRatio);
  });

  it("rescales monsters in cached zones when difficulty changes", () => {
    const session = forestSession();
    const forestMonster = session.monsters.find((monster) => monster.defId === "slime")!;
    const forestMaxHp = forestMonster.maxHp!;

    session.save.zone = "village";
    session.loadZone();
    expect(session.setDifficulty("nightmare")).toBe(true);

    session.save.zone = "forest";
    session.loadZone();
    const reloaded = session.monsters.find((monster) => monster.uid === forestMonster.uid)!;
    expect(reloaded.maxHp).toBeGreaterThan(forestMaxHp);
  });

  it("applies partial loot pickups only once", () => {
    const session = forestSession();
    session.save.inventory = session.save.inventory.map(() => ({ itemId: "herb", qty: 50 }));
    session.save.inventory[0] = { itemId: "slime_gel", qty: 49 };
    session.loot.push({ uid: "partial-gel", itemId: "slime_gel", qty: 2, x: session.save.x, y: session.save.y, ttl: 30 });

    session.step(0.05, IDLE);

    expect(session.countItem("slime_gel")).toBe(50);
    expect(session.loot.find((drop) => drop.uid === "partial-gel")?.qty).toBe(1);
    session.step(0.05, IDLE);
    expect(session.countItem("slime_gel")).toBe(50);
  });

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

  it("clears dodge and potion timers on respawn", () => {
    const session = forestSession();
    session.killPlayer("test");
    session.dodgeCooldown = 1;
    session.dodgeTimer = 1;
    session.invulnerable = 1;
    session.perfectDodgeTimer = 1;
    session.potionCooldown = 1;

    for (let i = 0; i < 50 && session.dead; i += 1) session.step(0.1, IDLE);

    expect(session.dead).toBe(false);
    expect(session.dodgeCooldown).toBe(0);
    expect(session.dodgeTimer).toBe(0);
    expect(session.invulnerable).toBe(0);
    expect(session.perfectDodgeTimer).toBe(0);
    expect(session.potionCooldown).toBe(0);
  });

  it("gives ranged monsters a dodgeable, directional attack", () => {
    const session = new GameSession(saveIn("marsh"));
    const wisp = session.monsters.find((monster) => monster.defId === "mire_wisp")!;
    expect(wisp).toBeTruthy();
    wisp.x = session.save.x + 95;
    wisp.y = session.save.y;
    wisp.spawnX = wisp.x;
    wisp.spawnY = wisp.y;
    wisp.state = "idle";
    wisp.attackTimer = 0;
    const hp = session.save.hp;

    session.step(0.05, IDLE);

    expect(session.telegraphs.some((telegraph) => telegraph.kind === "enemy" && telegraph.shape === "line")).toBe(true);
    expect(session.save.hp).toBe(hp);
  });

  it("lets support monsters heal nearby injured allies", () => {
    const session = new GameSession(saveIn("throne"));
    const acolytes = session.monsters.filter((monster) => monster.defId === "hollow_acolyte");
    const support = acolytes[0]!;
    const ally = acolytes[1]!;
    for (const monster of session.monsters) {
      if (monster !== support && monster !== ally) {
        monster.state = "dead";
        monster.respawnTimer = 60;
      }
    }
    support.x = 300;
    support.y = 300;
    support.spawnX = support.x;
    support.spawnY = support.y;
    support.state = "idle";
    support.attackTimer = 0;
    ally.x = 330;
    ally.y = 300;
    ally.hp = (ally.maxHp ?? 1) / 2;
    session.save.x = 400;
    session.save.y = 300;
    const before = ally.hp;

    session.step(0.05, IDLE);

    expect(ally.hp).toBeGreaterThan(before);
  });

  it("does not let support monsters heal allies through walls", () => {
    const session = new GameSession(saveIn("throne"));
    const acolytes = session.monsters.filter((monster) => monster.defId === "hollow_acolyte");
    const support = acolytes[0]!;
    const ally = acolytes[1]!;
    for (const monster of session.monsters) {
      if (monster !== support && monster !== ally) monster.state = "dead";
    }
    support.x = 300;
    support.y = 300;
    support.spawnX = support.x;
    support.spawnY = support.y;
    support.state = "attack";
    support.attackTimer = 0;
    ally.x = 330;
    ally.y = 300;
    ally.hp = (ally.maxHp ?? 1) / 2;
    session.save.x = 300;
    session.save.y = 380;
    session.zone.blocked = [...session.zone.blocked];
    session.zone.blocked[18 * session.zone.width + 19] = true;
    const before = ally.hp;

    session.step(0.05, IDLE);

    expect(session.hasLineOfSight(support.x, support.y, ally.x, ally.y)).toBe(false);
    expect(ally.hp).toBe(before);
  });

  it("does not apply venom when the player dodges a melee windup", () => {
    const session = forestSession();
    session.zone.blocked.fill(false);
    const wolf = session.monsters.find((monster) => monster.defId === "wolf")!;
    for (const monster of session.monsters) {
      if (monster !== wolf) monster.state = "dead";
    }
    wolf.x = session.save.x + 18;
    wolf.y = session.save.y;
    wolf.spawnX = wolf.x;
    wolf.spawnY = wolf.y;
    wolf.elite = "venomous";
    wolf.state = "attack";
    wolf.attackTimer = 0;
    const hp = session.save.hp;

    session.step(0.05, IDLE);
    expect(session.save.hp).toBe(hp);
    expect(session.telegraphs.some((telegraph) => telegraph.sourceUid === wolf.uid && telegraph.kind === "enemy")).toBe(true);

    session.dodge(1, 0);
    for (let i = 0; i < 5; i += 1) session.step(0.1, IDLE);
    expect(session.save.hp).toBe(hp);
    expect(session.statuses.some((status) => status.kind === "poison")).toBe(false);
  });

  it("applies a venomous elite's poison after a melee strike lands", () => {
    const session = forestSession();
    const wolf = session.monsters.find((monster) => monster.defId === "wolf")!;
    for (const monster of session.monsters) {
      if (monster !== wolf) monster.state = "dead";
    }
    wolf.x = session.save.x + 18;
    wolf.y = session.save.y;
    wolf.spawnX = wolf.x;
    wolf.spawnY = wolf.y;
    wolf.elite = "venomous";
    wolf.state = "attack";
    wolf.attackTimer = 0;

    for (let i = 0; i < 5; i += 1) session.step(0.1, IDLE);

    expect(session.statuses.some((status) => status.kind === "poison")).toBe(true);
  });

  it("lands a telegraphed melee strike when the player stays in its warning", () => {
    const session = forestSession();
    const wolf = session.monsters.find((monster) => monster.defId === "wolf")!;
    for (const monster of session.monsters) {
      if (monster !== wolf) monster.state = "dead";
    }
    wolf.x = session.save.x + 18;
    wolf.y = session.save.y;
    wolf.spawnX = wolf.x;
    wolf.spawnY = wolf.y;
    wolf.state = "attack";
    wolf.attackTimer = 0;
    const hp = session.save.hp;

    for (let i = 0; i < 5; i += 1) session.step(0.1, IDLE);

    expect(session.save.hp).toBeLessThan(hp);
  });

  it("includes the player's radius when resolving telegraph hitboxes", () => {
    const session = new GameSession(saveIn("village"));
    const hp = session.save.hp;
    session.telegraphs.push({
      uid: "edge-telegraph",
      x: session.save.x + 18,
      y: session.save.y,
      radius: 10,
      remaining: 0.05,
      total: 0.05,
      damage: 20,
      kind: "enemy",
      shape: "spot",
    });

    session.step(0.1, IDLE);

    expect(session.save.hp).toBeLessThan(hp);
  });

  it("cancels a monster's pending strike if the attacker dies", () => {
    const session = forestSession();
    const wolf = session.monsters.find((monster) => monster.defId === "wolf")!;
    for (const monster of session.monsters) {
      if (monster !== wolf) monster.state = "dead";
    }
    wolf.x = session.save.x + 18;
    wolf.y = session.save.y;
    wolf.spawnX = wolf.x;
    wolf.spawnY = wolf.y;
    wolf.state = "attack";
    wolf.attackTimer = 0;
    const hp = session.save.hp;
    session.step(0.05, IDLE);
    wolf.state = "dead";

    for (let i = 0; i < 5; i += 1) session.step(0.1, IDLE);

    expect(session.save.hp).toBe(hp);
    expect(session.telegraphs.some((telegraph) => telegraph.sourceUid === wolf.uid)).toBe(false);
  });

  it("does not let ranged enemies telegraph attacks through walls", () => {
    const session = new GameSession(saveIn("marsh"));
    const wisp = session.monsters.find((monster) => monster.defId === "mire_wisp")!;
    wisp.x = session.save.x + 95;
    wisp.y = session.save.y;
    wisp.spawnX = wisp.x;
    wisp.spawnY = wisp.y;
    wisp.state = "attack";
    wisp.attackTimer = 0;
    const tileX = Math.floor((session.save.x + 48) / session.zone.tileWidth);
    const tileY = Math.floor(session.save.y / session.zone.tileHeight);
    session.zone.blocked[tileY * session.zone.width + tileX] = true;

    session.step(0.05, IDLE);

    expect(session.telegraphs.some((telegraph) => telegraph.sourceUid === wisp.uid)).toBe(false);
  });

  it("makes support enemies attack when all nearby allies are already healthy", () => {
    const session = new GameSession(saveIn("throne"));
    session.zone.blocked = [...session.zone.blocked];
    const support = session.monsters.find((monster) => monster.defId === "hollow_acolyte")!;
    const ally = session.monsters.find((monster) => monster !== support && monster.defId === "hollow_acolyte")!;
    for (const monster of session.monsters) {
      if (monster !== support && monster !== ally) monster.state = "dead";
    }
    support.x = 300;
    support.y = 300;
    support.spawnX = support.x;
    support.spawnY = support.y;
    support.state = "attack";
    support.attackTimer = 0;
    ally.x = 330;
    ally.y = 300;
    ally.hp = ally.maxHp ?? 1;
    session.save.x = 400;
    session.save.y = 300;
    const row = Math.floor(support.y / session.zone.tileHeight);
    for (let column = Math.floor(support.x / session.zone.tileWidth); column <= Math.floor(session.save.x / session.zone.tileWidth); column += 1) {
      session.zone.blocked[row * session.zone.width + column] = false;
    }

    session.step(0.05, IDLE);

    expect(session.telegraphs.some((telegraph) => telegraph.sourceUid === support.uid)).toBe(true);
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

  it("preserves item instances when equipping and swapping equipment", () => {
    const session = new GameSession(saveIn("village"));
    session.addItem("steel_sword", 1, { uid: "affixed-steel", affixes: ["fierce"], upgrade: 2 });
    const steelSlot = session.save.inventory.findIndex((stack) => stack?.itemId === "steel_sword");

    expect(session.equip(steelSlot)).toBe(true);
    expect(session.save.equipment.weapon?.instance).toEqual({ uid: "affixed-steel", affixes: ["fierce"], upgrade: 2 });
    expect(session.save.inventory[steelSlot]?.itemId).toBe("iron_sword");

    const steelAttack = session.stats.attack;
    expect(session.equip(steelSlot)).toBe(true);
    expect(session.save.equipment.weapon?.itemId).toBe("iron_sword");
    expect(session.save.inventory.some((stack) => stack?.itemId === "steel_sword" && stack.instance?.uid === "affixed-steel")).toBe(true);
    expect(session.stats.attack).toBeLessThan(steelAttack);
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

  it("rejects class-incompatible purchases and fractional economy quantities", () => {
    const session = new GameSession(saveIn("village", "mage"));
    session.save.gold = 1000;

    expect(session.buy("forge", "iron_sword")).toBe(false);
    expect(session.buy("general", "health_potion", 1.5)).toBe(false);
    expect(session.sell(0, 1.5)).toBe(false);
    expect(session.save.gold).toBe(1000);
    expect(session.countItem("health_potion")).toBe(3);
  });

  it("rejects crafting class-incompatible gear", () => {
    const session = new GameSession(saveIn("village", "mage"));
    session.save.gold = 1000;
    session.addItem("iron_ore", 3);

    expect(session.craft("craft_iron_sword")).toBe(false);
    expect(session.countItem("iron_ore")).toBe(3);
  });

  it("crafts when consuming materials creates the needed inventory space", () => {
    const session = new GameSession(saveIn("village"));
    session.save.gold = 1000;
    session.save.inventory = session.save.inventory.map(() => ({ itemId: "herb", qty: 50 }));
    session.save.inventory[0] = { itemId: "iron_ore", qty: 3 };

    expect(session.craft("craft_iron_sword")).toBe(true);
    expect(session.countItem("iron_ore")).toBe(0);
    expect(session.save.inventory.some((stack) => stack?.itemId === "iron_sword")).toBe(true);
  });

  it("does not consume potions while dead", () => {
    const session = new GameSession(saveIn("village"));
    session.dead = true;
    const before = session.countItem("health_potion");

    expect(session.useItem(0)).toBe(false);
    expect(session.countItem("health_potion")).toBe(before);
  });

  it("limits the kindness gold reward to once per NPC", () => {
    const session = new GameSession(saveIn("village"));
    const before = session.save.gold;

    expect(session.pickNpcChoice("guard", "kind")).toBe(true);
    expect(session.pickNpcChoice("guard", "rude")).toBe(true);
    expect(session.pickNpcChoice("guard", "kind")).toBe(true);

    expect(session.save.gold).toBe(before + 5);
    expect(session.save.npcKindRewards).toEqual(["guard"]);
  });

  it("does not show gathering nodes during their persisted cooldown", () => {
    const session = forestSession();
    const node = session.zone.gatherNodes[0]!;
    session.save.gatherCooldowns[`forest:${node.id}`] = session.save.playtime + 30;

    expect(session.findInteractable()?.id).not.toBe(node.id);
  });

  it("persists gathered-node cooldowns across zone reloads and replenishes them", () => {
    const session = new GameSession(saveIn("forest"));
    const node = session.zone.gatherNodes[0]!;
    session.save.x = node.x;
    session.save.y = node.y;
    const before = session.countItem(node.itemId);

    expect(session.interact()?.kind).toBe("gather");
    expect(session.countItem(node.itemId)).toBe(before + 1);
    expect(session.gathered.has(node.id)).toBe(true);
    const reloaded = new GameSession(session.snapshot());
    expect(reloaded.gathered.has(node.id)).toBe(true);

    const readyAt = reloaded.save.gatherCooldowns[`forest:${node.id}`]!;
    reloaded.save.playtime = readyAt;
    reloaded.step(0.1, IDLE);
    expect(reloaded.gathered.has(node.id)).toBe(false);
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

  it("tracks survival time and resets progress after leaving the zone", () => {
    const session = forestSession();
    session.save.level = 2;
    for (const monster of session.monsters) {
      monster.state = "dead";
      monster.respawnTimer = 60;
    }
    expect(session.acceptQuest("forest_watch")).toBe(true);
    for (let i = 0; i < 49; i += 1) session.step(0.1, IDLE);
    const state = session.save.quests.find((quest) => quest.id === "forest_watch");
    expect(state?.progress[0]).toBe(4);
    expect(state?.completed).toBe(false);
    session.recordKill("slime");
    expect(state?.progress[0]).toBe(4);
    session.save.zone = "village";
    session.step(0.1, IDLE);
    expect(state?.progress[0]).toBe(0);
    session.save.zone = "forest";
    for (let i = 0; i < 120; i += 1) session.step(0.1, IDLE);
    expect(state?.progress[0]).toBe(12);
    expect(state?.completed).toBe(true);
  });

  it("counts unique explored zones rather than repeat visits", () => {
    const session = forestSession();
    session.save.level = 3;
    expect(session.acceptQuest("wider_world")).toBe(true);
    const state = session.save.quests.find((quest) => quest.id === "wider_world")!;
    expect(state.progress[0]).toBe(1);
    expect(state.exploredZones).toEqual(["forest"]);
    const toMarsh = session.zone.portals.find((portal) => portal.targetZone === "marsh")!;
    session.save.x = toMarsh.x + toMarsh.w / 2;
    session.save.y = toMarsh.y + toMarsh.h / 2;
    session.interact();
    expect(state.progress[0]).toBe(2);
    const backToForest = session.zone.portals.find((portal) => portal.targetZone === "forest")!;
    session.save.x = backToForest.x + backToForest.w / 2;
    session.save.y = backToForest.y + backToForest.h / 2;
    session.interact();
    const toMarshAgain = session.zone.portals.find((portal) => portal.targetZone === "marsh")!;
    session.save.x = toMarshAgain.x + toMarshAgain.w / 2;
    session.save.y = toMarshAgain.y + toMarshAgain.h / 2;
    session.interact();

    expect(state.progress[0]).toBe(2);
    expect(state.exploredZones).toEqual(["forest", "marsh"]);
    expect(state.completed).toBe(false);
    expect(validateSave(session.snapshot()).ok).toBe(true);
  });

  it("records a choose-reward quest completion when its reward is claimed", () => {
    const session = forestSession();
    expect(session.acceptQuest("forest_keeper_gift")).toBe(true);
    for (const slime of session.monsters.filter((monster) => monster.defId === "slime").slice(0, 3)) {
      session.hitMonster(slime, 1_000_000, false, "physical", []);
    }
    const state = session.save.quests.find((quest) => quest.id === "forest_keeper_gift")!;
    expect(state.completed).toBe(true);

    expect(session.pickQuestReward("forest_keeper_gift", 0)).toBe(true);
    expect(state.completions).toBe(1);
    expect(session.pickQuestReward("forest_keeper_gift", 1)).toBe(false);
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

  it("alters a selected ability's damage or cooldown", () => {
    const baseSave = saveIn("village");
    baseSave.level = 5;
    const damageSave = { ...baseSave, talents: [getTalentTree("warrior").tiers[0].choices[0]!.id] };
    const cooldownSave = { ...baseSave, talents: [getTalentTree("warrior").tiers[0].choices[1]!.id] };
    const base = new GameSession(baseSave);
    const empowered = new GameSession(damageSave);
    const focused = new GameSession(cooldownSave);

    const strike = { kind: "damage" as const, amount: 100, damageType: "physical" as const };
    expect(empowered.effectDamage(strike, "shield_bash").damage).toBeGreaterThan(base.effectDamage(strike, "shield_bash").damage);
    expect(focused.castAbility("whirlwind", { x: focused.save.x, y: focused.save.y })).toBe(true);
    const unmodified = new GameSession({ ...baseSave });
    expect(unmodified.castAbility("whirlwind", { x: unmodified.save.x, y: unmodified.save.y })).toBe(true);
    expect(focused.abilityCooldown("whirlwind")).toBeLessThan(unmodified.abilityCooldown("whirlwind"));
    expect(getTalentTree("warrior").tiers[0].choices[0]?.description).toContain("Shield Bash deals 15% more damage");
  });
});

describe("perfect dodges", () => {
  it("restores resource and shortens skill cooldown after precisely timed evasion", () => {
    const session = new GameSession(saveIn("village"));
    session.save.resource = 0;
    session.cooldowns.basic = 2;
    const hp = session.save.hp;
    expect(session.dodge(1, 0)).toBe(true);
    session.damagePlayer(50, "test attack");
    expect(session.save.hp).toBe(hp);
    expect(session.save.resource).toBe(12);
    expect(session.abilityCooldown("basic")).toBeCloseTo(1.4);
    expect(session.drainEvents().some((event) => event.type === "log" && event.text.startsWith("Perfect dodge!"))).toBe(true);
  });

  it("does not grant a perfect-dodge reward after its timing window", () => {
    const session = new GameSession(saveIn("village"));
    session.save.resource = 0;
    session.cooldowns.basic = 2;
    expect(session.dodge(1, 0)).toBe(true);
    session.step(0.1, IDLE);
    session.step(0.1, IDLE);
    session.damagePlayer(50, "late attack");
    expect(session.save.resource).toBe(0);
    expect(session.abilityCooldown("basic")).toBeCloseTo(1.8);
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

describe("rng", () => {
  it("keeps its internal state within 32 bits over many draws", () => {
    const rng = new Rng(123);
    for (let i = 0; i < 1000; i += 1) rng.next();

    expect(rng.state).toBeLessThanOrEqual(0xffffffff);
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

  it("does not leak the unlocked dungeon wing into the shared zone data", () => {
    const basePortals = ZONES.dungeon.portals.map((portal) => portal.id);
    const first = new GameSession(saveIn("dungeon"));
    const boss = first.monsters.find((monster) => monster.defId === "bone_warden")!;

    first.hitMonster(boss, 1_000_000, false, "holy", []);

    expect(first.zone.portals.some((portal) => portal.targetZone === "marsh")).toBe(true);
    expect(ZONES.dungeon.portals.map((portal) => portal.id)).toEqual(basePortals);

    const second = new GameSession(saveIn("dungeon"));
    expect(second.zone.portals.some((portal) => portal.targetZone === "marsh")).toBe(false);
  });
});

describe("difficulty, elites and bosses", () => {
  it("keeps New Game+ elite odds below a guaranteed spawn chance", () => {
    let eliteCount = 0;
    let totalCount = 0;
    for (let seed = 1; seed <= 30; seed += 1) {
      const save = saveIn("forest");
      save.ngPlus = 99;
      save.rngState = seed;
      const session = new GameSession(save);
      eliteCount += session.monsters.filter((monster) => monster.elite).length;
      totalCount += session.monsters.length;
    }

    expect(eliteCount).toBeGreaterThan(0);
    expect(eliteCount).toBeLessThan(totalCount);
  });

  it("completes a boss quest accepted after that boss was already defeated", () => {
    const save = saveIn("village");
    save.level = 7;
    save.defeatedBosses.push("bone_warden");
    save.quests.push({ id: "bone_breaker", progress: [6], completed: true, completions: 1 });
    const session = new GameSession(save);

    expect(session.acceptQuest("wardens_end")).toBe(true);
    expect(session.save.quests.find((quest) => quest.id === "wardens_end")).toMatchObject({
      progress: [1],
      completed: true,
    });
  });

  it("enforces equipment level requirements when crafting and equipping", () => {
    const session = forestSession();
    session.addItem("iron_ore", 10);
    session.addItem("gemstone", 2);
    const oreBefore = session.countItem("iron_ore");
    const goldBefore = session.save.gold;

    expect(session.craft("craft_plate_armor")).toBe(false);
    expect(session.countItem("iron_ore")).toBe(oreBefore);
    expect(session.save.gold).toBe(goldBefore);
    expect(session.addItem("plate_armor", 1)).toBe(0);
    const armorSlot = session.save.inventory.findIndex((stack) => stack?.itemId === "plate_armor");
    expect(session.equip(armorSlot)).toBe(false);
  });

  it("uses the matching frost revenant boss attack pattern", () => {
    const session = new GameSession(saveIn("frost"));
    const boss = session.monsters.find((monster) => monster.defId === "frost_revenant")!;
    expect(boss).toBeTruthy();
    boss.state = "chase";
    boss.attackTimer = 0;
    boss.hp = boss.maxHp! * 0.6;

    const events = session.step(0.1, IDLE);

    expect(events.some((event) => event.type === "telegraph" && event.shape === "line")).toBe(true);
  });

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

  it("rewards elite defeats with bonus experience", () => {
    const ordinary = forestSession();
    const elite = forestSession();
    const ordinarySlime = ordinary.monsters.find((monster) => monster.defId === "slime")!;
    const eliteSlime = elite.monsters.find((monster) => monster.defId === "slime")!;
    ordinarySlime.hp = 1;
    ordinarySlime.elite = undefined;
    eliteSlime.hp = 1;
    eliteSlime.elite = "swift";

    ordinary.hitMonster(ordinarySlime, 1000, false, "physical", []);
    elite.hitMonster(eliteSlime, 1000, false, "physical", []);

    expect(elite.save.xp).toBeGreaterThan(ordinary.save.xp);
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
    expect(session.telegraphs.some((telegraph) => telegraph.kind === "boss" && telegraph.shape === "ring")).toBe(true);
    king.hp = king.maxHp! * 0.3;
    session.step(0.05, IDLE);
    expect(king.phase).toBe(2);
    expect(session.telegraphs.some((telegraph) => telegraph.kind === "boss" && telegraph.shape === "spot")).toBe(true);
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

  it("reports the actual amount restored by NPC healing", () => {
    const session = new GameSession(saveIn("village"));
    session.save.hp = 100;

    expect(session.healAtNpc()).toBe(true);

    expect(session.drainEvents().find((event) => event.type === "heal")).toMatchObject({ amount: session.stats.maxHp - 100 });
  });

  it("points the greater health potion recipe to its ingredient area", () => {
    expect(RECIPES.find((recipe) => recipe.id === "craft_greater_health_potion")?.zone).toBe("Whispering Forest");
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

    it(`${zone.id}: every NPC is on walkable ground`, () => {
      for (const npc of zone.npcs) {
        expect(isWalkable(zone, npc.x, npc.y), npc.id).toBe(true);
      }
    });
  }
});

describe("audited gameplay fixes", () => {
  function placeOnlyTargets(session: GameSession, positions: { x: number; y: number }[]): void {
    session.zone.blocked.fill(false);
    for (const monster of session.monsters) monster.state = "dead";
    const targets = session.monsters.filter((monster) => monster.defId === "slime").slice(0, positions.length);
    positions.forEach((position, index) => {
      const target = targets[index]!;
      Object.assign(target, position, {
        hp: 1000,
        maxHp: 1000,
        spawnX: position.x,
        spawnY: position.y,
        state: "idle",
        wanderTimer: 100,
        attackTimer: 100,
      });
    });

  }

  it.each([
    ["dragonknight", "dragon_leap"],
    ["spellblade", "arcane_dash"],
  ] as const)("moves and hits with %s %s", (classId, abilityId) => {
    const save = saveIn("forest", classId);
    save.level = 5;
    const session = new GameSession(save);
    session.save.x = 100;
    session.save.y = 300;
    placeOnlyTargets(session, [{ x: 220, y: 300 }]);
    const target = session.monsters.find((monster) => monster.state !== "dead")!;
    const hp = target.hp;

    expect(session.castAbility(abilityId, { x: 300, y: 300 })).toBe(true);

    expect(session.save.x).toBeGreaterThan(200);
    expect(target.hp).toBeLessThan(hp);
  });

  it("fires Eagle's Volley projectiles instead of applying their damage instantly", () => {
    const save = saveIn("forest", "archer");
    save.level = 9;
    const session = new GameSession(save);
    session.save.x = 100;
    session.save.y = 300;
    placeOnlyTargets(session, [{ x: 220, y: 300 }]);
    const target = session.monsters.find((monster) => monster.state !== "dead")!;
    const before = target.hp;

    expect(session.castAbility("eagles_volley", { x: 220, y: 300 })).toBe(true);

    expect(session.projectiles).toHaveLength(2);
    expect(target.hp).toBeLessThan(before);
  });

  it("chains Ricochet Shot to a nearby second enemy", () => {
    const save = saveIn("forest", "gunslinger");
    save.level = 3;
    const session = new GameSession(save);
    session.save.x = 100;
    session.save.y = 300;
    placeOnlyTargets(session, [{ x: 220, y: 300 }, { x: 280, y: 300 }]);
    const targets = session.monsters.filter((monster) => monster.state !== "dead");
    const secondHp = targets[1]!.hp;

    expect(session.castAbility("ricochet_shot", { x: 220, y: 300 })).toBe(true);
    for (let i = 0; i < 20; i += 1) session.step(0.05, IDLE);

    expect(targets[1]!.hp).toBeLessThan(secondHp);
  });

  it("limits Dragon Breath hits to its forward cone", () => {
    const save = saveIn("forest", "dragonknight");
    const session = new GameSession(save);
    session.save.x = 100;
    session.save.y = 300;
    placeOnlyTargets(session, [{ x: 180, y: 300 }, { x: 140, y: 380 }]);
    const targets = session.monsters.filter((monster) => monster.state !== "dead");
    const sideHp = targets[1]!.hp;

    expect(session.castAbility("dragon_breath", { x: 280, y: 300 })).toBe(true);

    expect(targets[0]!.hp).toBeLessThan(1000);
    expect(targets[1]!.hp).toBe(sideHp);
  });

  it("marks Piercing Arrow projectiles to bypass armor", () => {
    const save = saveIn("forest", "archer");
    save.level = 3;
    const session = new GameSession(save);
    session.zone.blocked.fill(false);

    expect(session.castAbility("piercing_arrow", { x: session.save.x + 100, y: session.save.y })).toBe(true);

    expect(session.projectiles[0]?.armorPiercing).toBe(true);
  });

  it("sets dash cast visuals to the actual destination", () => {
    const save = saveIn("forest", "gunslinger");
    save.level = 5;
    const session = new GameSession(save);
    session.save.x = 100;
    session.save.y = 300;
    session.zone.blocked.fill(false);

    expect(session.castAbility("evasive_roll", { x: 200, y: 300 })).toBe(true);
    const cast = session.drainEvents().find((event) => event.type === "cast");

    expect(cast?.type).toBe("cast");
    if (cast?.type === "cast") {
      expect(cast.targetX).toBeGreaterThan(cast.x);
      expect(cast.targetX).toBe(session.save.x);
    }
  });

  it("caps shields and expires them", () => {
    const session = forestSession();
    for (const monster of session.monsters) monster.state = "dead";

    session.addShield(100_000, 1);
    session.addShield(100_000, 1);
    expect(session.shield).toBe(session.stats.maxHp);
    for (let i = 0; i < 10; i += 1) session.step(0.1, IDLE);

    expect(session.shield).toBe(0);
  });

  it("preserves cooldowns, monsters, and dropped loot while traveling between zones", () => {
    const session = forestSession();
    const monster = session.monsters[0]!;
    monster.state = "dead";
    session.loot.push({ uid: "saved-loot", itemId: "herb", qty: 1, x: 100, y: 100, ttl: 30 });
    session.cooldowns.example = 3;

    session.save.zone = "village";
    session.loadZone();
    session.save.zone = "forest";
    session.loadZone();

    expect(session.cooldowns.example).toBe(3);
    expect(session.monsters.find((entry) => entry.uid === monster.uid)?.state).toBe("dead");
    expect(session.loot.some((entry) => entry.uid === "saved-loot")).toBe(true);
  });

  it("does not mark an uncollected gather node unavailable when inventory is full", () => {
    const session = new GameSession(saveIn("marsh"));
    const node = session.zone.gatherNodes[0]!;
    session.save.x = node.x;
    session.save.y = node.y;
    session.save.inventory = session.save.inventory.map(() => ({ itemId: "herb", qty: 50 }));

    session.interact();

    expect(session.isGathered(node.id)).toBe(false);
  });

  it("resets story progression for New Game+ and enforces the cycle cap", () => {
    const session = new GameSession(saveIn("village"));
    session.save.defeatedBosses.push("hollow_king");
    session.save.storyChapter = 4;

    expect(session.startNewGamePlus()).toBe(true);
    expect(session.save.storyChapter).toBe(0);
    session.save.ngPlus = 99;
    session.save.defeatedBosses.push("hollow_king");
    expect(session.canNewGamePlus()).toBe(false);
    expect(session.startNewGamePlus()).toBe(false);
  });

  it("caps earned gold at the save limit", () => {
    const session = forestSession();
    session.save.gold = MAX_GOLD - 1;

    expect(session.gainGold(100)).toBe(1);
    expect(session.save.gold).toBe(MAX_GOLD);
    expect(validateSave(session.save).ok).toBe(true);
  });
});

describe("Sunken Barrow boss passage", () => {
  function canReachTile(session: GameSession, targetX: number, targetY: number): boolean {
    const { width, height, blocked } = session.zone;
    const startX = Math.floor(session.save.x / session.zone.tileWidth);
    const startY = Math.floor(session.save.y / session.zone.tileHeight);
    const queue: [number, number][] = [[startX, startY]];
    const visited = new Set([startY * width + startX]);
    for (let index = 0; index < queue.length; index += 1) {
      const [x, y] = queue[index]!;
      if (x === targetX && y === targetY) return true;
      for (const [nextX, nextY] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as const) {
        const key = nextY * width + nextX;
        if (
          nextX < 0 || nextY < 0 || nextX >= width || nextY >= height
          || blocked[key]
          || visited.has(key)
        ) continue;
        visited.add(key);
        queue.push([nextX, nextY]);
      }
    }
    return false;
  }

  it("opens and preserves the eastern crypt passage after defeating the Bone Warden", () => {
    const save = saveIn("dungeon");
    save.x = ZONES.dungeon.spawn.x;
    save.y = ZONES.dungeon.spawn.y;
    const session = new GameSession(save);
    const gateIndex = 22 * session.zone.width + 37;
    const eastCryptTile = { x: 43, y: 22 };
    const boss = session.monsters.find((monster) => monster.defId === "bone_warden")!;

    expect(session.zone.blocked[gateIndex]).toBe(true);
    expect(canReachTile(session, eastCryptTile.x, eastCryptTile.y)).toBe(false);
    expect(session.zone.portals.some((portal) => portal.targetZone === "marsh")).toBe(false);

    session.hitMonster(boss, 1_000_000, false, "holy", []);

    expect(session.zone.blocked[gateIndex]).toBe(false);
    expect(canReachTile(session, eastCryptTile.x, eastCryptTile.y)).toBe(true);
    const events = session.drainEvents();
    expect(events.some((event) =>
      event.type === "passage" && event.zone === "dungeon" && event.portal?.targetZone === "marsh")).toBe(true);

    session.save.zone = "forest";
    session.loadZone();
    session.save.zone = "dungeon";
    session.loadZone();

    expect(session.zone.blocked[gateIndex]).toBe(false);
    expect(canReachTile(session, eastCryptTile.x, eastCryptTile.y)).toBe(true);
    const marshPortal = session.zone.portals.find((portal) => portal.id === "to_marsh_after_warden");
    expect(marshPortal?.label).toBe("Ashen Marsh");

    session.save.x = marshPortal!.x + marshPortal!.w / 2;
    session.save.y = marshPortal!.y + marshPortal!.h / 2;
    expect(session.interact()?.id).toBe("to_marsh_after_warden");
    expect(session.save.zone).toBe("marsh");
  });
});
