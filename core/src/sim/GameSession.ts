import {
  COMBAT_TIMEOUT,
  DODGE_COOLDOWN,
  DODGE_DURATION,
  DODGE_INVULN,
  DODGE_SPEED,
  INTERACT_RANGE,
  PICKUP_RANGE,
  PLAYER_RADIUS,
  POTION_COOLDOWN,
  RESPAWN_SECONDS,
  RESOURCE_LABELS,
} from "../constants";
import { getClass } from "../data/classes";
import { PET_SPECIES } from "../data/pets";
import {
  createItemInstance,
  getItem,
  getRecipe,
  itemSellValue,
  ITEMS,
  MAX_UPGRADE,
  canClassUse,
  isEquippable,
} from "../data/items";
import { getMonster, SUMMON_IDS } from "../data/monsters";
import { HEAL_COST_PER_HP, HEAL_MIN_COST, NPCS, SHOPS } from "../data/npcs";
import { getQuest, QUESTS } from "../data/quests";
import { CLASS_INTROS, NG_PLUS_HOLLOW_ENDING, NG_PLUS_OPENINGS, STORY_CHAPTERS } from "../data/story";
import {
  getTalentChoice,
  talentBonuses,
  talentModifiers as computeTalentModifiers,
  talentTierChosen,
  type TalentModifiers,
} from "../data/talents";
import { getZone, ZONES } from "../generated/world-data";
import { deriveStats, isAbilityUnlocked, rageDecayPerSecond, resourceRegen, unlockedAbilities, xpToNext, type DerivedStats } from "../progression";
import { Rng } from "../rng";
import { cloneSave } from "../save/schema";
import { LEVEL_CAP } from "../constants";
import type {
  AbilityDef,
  AbilityEffect,
  BuffInstance,
  CharacterSave,
  ChestSpawn,
  ClassDef,
  DamageType,
  Direction,
  GatherSpawn,
  GroundLoot,
  InputState,
  InteractResult,
  ItemStack,
  MonsterInstance,
  NpcSpawn,
  PetInstance,
  PortalDef,
  ProjectileInstance,
  QuestDef,
  QuestState,
  SimEvent,
  StatusInstance,
  TelegraphInstance,
  TrapInstance,
  Vec2,
  ZoneData,
} from "../types";

const DAMAGE_COLORS: Record<DamageType, string> = {
  physical: "#e8e0d0",
  fire: "#ff8a3c",
  ice: "#7fd4ff",
  arcane: "#c18aff",
  holy: "#ffe89a",
  shadow: "#a06ad9",
  nature: "#7fe07f",
  poison: "#8ae06a",
};

const RESOURCE_GAIN: Record<ClassDef["resource"], number> = { rage: 9, energy: 6, mana: 4 };

function length(x: number, y: number): number {
  return Math.hypot(x, y);
}

function normalize(x: number, y: number): Vec2 {
  const l = Math.hypot(x, y);
  return l > 0.0001 ? { x: x / l, y: y / l } : { x: 0, y: 1 };
}

function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export class GameSession {
  readonly save: CharacterSave;
  zone: ZoneData;
  monsters: MonsterInstance[] = [];
  pets: PetInstance[] = [];
  private hatchlingAttackTimer = 0;
  private hatchlingHitting = false;
  projectiles: ProjectileInstance[] = [];
  loot: GroundLoot[] = [];
  traps: TrapInstance[] = [];
  telegraphs: TelegraphInstance[] = [];
  statuses: StatusInstance[] = [];
  buffs: BuffInstance[] = [];
  cooldowns: Record<string, number> = {};
  shield = 0;
  dodgeCooldown = 0;
  dodgeTimer = 0;
  invulnerable = 0;
  potionCooldown = 0;
  dead = false;
  respawnTimer = 0;
  facing: Direction = "down";
  moving = false;
  animationTime = 0;
  elapsed = 0;

  private events: SimEvent[] = [];
  private rng: Rng;
  private uidCounter = 1;
  private readonly classDef: ClassDef;
  private lastCombat = -999;
  private gathered = new Set<string>();
  private lastAim: Vec2 = { x: 0, y: 1 };
  private dodgeDir: Vec2 = { x: 0, y: 1 };
  private lastImmuneEvent = -999;

  constructor(save: CharacterSave) {
    this.save = save;
    this.classDef = getClass(save.classId);
    this.rng = new Rng(save.rngState);
    this.zone = getZone(save.zone);
    this.loadZone();
    const stats = this.stats;
    this.save.hp = Math.max(0, Math.min(this.save.hp, stats.maxHp));
    this.save.resource = Math.max(0, Math.min(this.save.resource, stats.maxResource));
    if (!this.save.introShown) {
      this.save.introShown = true;
      this.emit({ type: "log", text: CLASS_INTROS[save.classId] ?? "Your adventure begins.", tone: "info" });
    }
  }

  get classInfo(): ClassDef {
    return this.classDef;
  }

  get stats(): DerivedStats {
    return this.computeStats();
  }

  get resourceLabel(): string {
    return RESOURCE_LABELS[this.classDef.resource];
  }

  get modifiers(): TalentModifiers {
    return computeTalentModifiers(this.save.classId, this.save.talents);
  }

  get difficultyScale(): { hp: number; attack: number; xp: number; gold: number } {
    const base = this.save.difficulty === "story"
      ? { hp: 0.8, attack: 0.8, reward: 0.9 }
      : this.save.difficulty === "nightmare"
        ? { hp: 1.6, attack: 1.35, reward: 1.3 }
        : { hp: 1, attack: 1, reward: 1 };
    const cycle = 1 + this.save.ngPlus * 0.35;
    return {
      hp: base.hp * cycle,
      attack: base.attack * cycle,
      xp: base.reward * (1 + this.save.ngPlus * 0.15),
      gold: base.reward * (1 + this.save.ngPlus * 0.15),
    };
  }

  setDifficulty(difficulty: CharacterSave["difficulty"]): boolean {
    if (this.dead) return false;
    if (!["story", "normal", "nightmare"].includes(difficulty)) return false;
    this.save.difficulty = difficulty;
    this.emit({ type: "log", text: `Difficulty set to ${difficulty}.`, tone: "info" });
    return true;
  }

  canNewGamePlus(): boolean {
    return this.save.defeatedBosses.includes("hollow_king");
  }

  startNewGamePlus(): boolean {
    if (!this.canNewGamePlus()) {
      this.emit({ type: "log", text: "Defeat the Hollow King before beginning a new cycle.", tone: "info" });
      return false;
    }
    this.save.ngPlus += 1;
    this.save.defeatedBosses = [];
    this.save.quests = [];
    this.save.openedChests = [];
    this.save.zone = "village";
    const village = ZONES.village;
    this.save.x = village.spawn.x;
    this.save.y = village.spawn.y;
    this.loadZone();
    const stats = this.stats;
    this.save.hp = stats.maxHp;
    this.save.resource = this.classDef.resource === "rage" ? 0 : stats.maxResource;
    this.emit({ type: "zone", zone: "village" });
    this.emit({ type: "log", text: `New Game+ ${this.save.ngPlus} begins. The realm grows harsher.`, tone: "good" });
    const opening = NG_PLUS_OPENINGS[Math.min(this.save.ngPlus - 1, NG_PLUS_OPENINGS.length - 1)];
    this.emit({ type: "log", text: opening, tone: "info" });
    return true;
  }

  private computeStats(): DerivedStats {
    const base = deriveStats(this.classDef, this.save.level, this.save.equipment, talentBonuses(this.save.classId, this.save.talents));
    let attack = base.attack;
    let defense = base.defense;
    let maxHp = base.maxHp;
    let moveSpeed = base.moveSpeed;
    for (const buff of this.buffs) {
      if (buff.stat === "attack") attack *= 1 + buff.percent / 100;
      else if (buff.stat === "defense") defense *= 1 + buff.percent / 100;
      else if (buff.stat === "maxHp") maxHp *= 1 + buff.percent / 100;
      else if (buff.stat === "moveSpeed") moveSpeed *= 1 + buff.percent / 100;
    }
    return {
      maxHp: Math.floor(maxHp),
      maxResource: base.maxResource,
      attack: Math.round(attack * 10) / 10,
      defense: Math.round(defense * 10) / 10,
      crit: base.crit,
      moveSpeed: Math.round(moveSpeed * 10) / 10,
    };
  }

  private nextUid(prefix: string): string {
    this.uidCounter += 1;
    return `${prefix}_${this.uidCounter}`;
  }

  private emit(event: SimEvent): void {
    this.events.push(event);
  }

  drainEvents(): SimEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  private loadZone(): void {
    const zone = getZone(this.save.zone);
    this.zone = zone;
    this.monsters = zone.monsterSpawns.map((spawn) => this.makeMonster(spawn));
    this.traps = zone.traps.map((trap) => ({
      uid: trap.id,
      x: trap.x,
      y: trap.y,
      radius: trap.radius,
      damage: trap.damage,
      armed: true,
      rearmTimer: 0,
    }));
    this.projectiles = [];
    this.pets = [];
    this.loot = [];
    this.telegraphs = [];
    this.statuses = [];
    this.buffs = [];
    this.gathered = new Set();
    this.dead = false;
    this.respawnTimer = 0;
    this.shield = 0;
    this.cooldowns = {};
    this.save.x = Math.max(8, Math.min(this.save.x, zone.width * zone.tileWidth - 8));
    this.save.y = Math.max(8, Math.min(this.save.y, zone.height * zone.tileHeight - 8));
  }

  private makeMonster(spawn: { id: string; x: number; y: number }, uid?: string): MonsterInstance {
    const def = getMonster(spawn.id);
    const elite = !def.boss && this.rng.chance(0.08 + this.save.ngPlus * 0.02)
      ? this.rng.pick(["swift", "armored", "venomous", "volatile"] as const)
      : undefined;
    const maxHp = Math.max(1, Math.round(def.maxHp * this.difficultyScale.hp * (elite ? 1.6 : 1)));
    return {
      uid: uid ?? this.nextUid("m"),
      defId: spawn.id,
      x: spawn.x,
      y: spawn.y,
      spawnX: spawn.x,
      spawnY: spawn.y,
      hp: maxHp,
      maxHp,
      state: "idle",
      facing: 1,
      attackTimer: 0,
      respawnTimer: 0,
      statuses: [],
      wanderTimer: this.rng.between(0.5, 3),
      wanderX: spawn.x,
      wanderY: spawn.y,
      elite,
      phase: 0,
    };
  }

  isBlockedAt(x: number, y: number, radius: number): boolean {
    const tw = this.zone.tileWidth;
    const th = this.zone.tileHeight;
    if (x < radius || y < radius || x > this.zone.width * tw - radius || y > this.zone.height * th - radius) return true;
    const minTx = Math.max(0, Math.floor((x - radius) / tw));
    const maxTx = Math.min(this.zone.width - 1, Math.floor((x + radius) / tw));
    const minTy = Math.max(0, Math.floor((y - radius) / th));
    const maxTy = Math.min(this.zone.height - 1, Math.floor((y + radius) / th));
    for (let ty = minTy; ty <= maxTy; ty += 1) {
      for (let tx = minTx; tx <= maxTx; tx += 1) {
        if (!this.zone.blocked[ty * this.zone.width + tx]) continue;
        const left = tx * tw;
        const top = ty * th;
        const cx = Math.max(left, Math.min(x, left + tw));
        const cy = Math.max(top, Math.min(y, top + th));
        if (dist2(x, y, cx, cy) < radius * radius) return true;
      }
    }
    return false;
  }

  private moveEntity(entity: { x: number; y: number }, dx: number, dy: number, radius: number): boolean {
    let moved = false;
    if (dx !== 0 && !this.isBlockedAt(entity.x + dx, entity.y, radius)) {
      entity.x += dx;
      moved = true;
    }
    if (dy !== 0 && !this.isBlockedAt(entity.x, entity.y + dy, radius)) {
      entity.y += dy;
      moved = true;
    }
    return moved;
  }

  step(dt: number, input: InputState): SimEvent[] {
    const clamped = Math.max(0, Math.min(dt, 0.1));
    this.emitTime(clamped);
    if (this.dead) {
      this.respawnTimer -= clamped;
      if (this.respawnTimer <= 0) this.respawn();
      this.clampSave();
      return this.drainEvents();
    }

    this.save.playtime += clamped;
    for (const key of Object.keys(this.cooldowns)) {
      this.cooldowns[key] = Math.max(0, this.cooldowns[key] - clamped);
    }
    this.dodgeCooldown = Math.max(0, this.dodgeCooldown - clamped);
    this.invulnerable = Math.max(0, this.invulnerable - clamped);
    this.potionCooldown = Math.max(0, this.potionCooldown - clamped);
    this.tickStatuses(clamped);
    this.tickBuffs(clamped);

    const stats = this.stats;
    const currentStats = stats;
    const slow = this.statuses.find((s) => s.kind === "slow");
    const stunned = this.statuses.some((s) => s.kind === "stun");
    const speed = currentStats.moveSpeed * (slow ? 1 - slow.value / 100 : 1);
    const dodging = this.dodgeTimer > 0 && !stunned;
    let moving = !stunned && (input.moveX !== 0 || input.moveY !== 0);
    if (dodging) {
      const dodgeSpeed = DODGE_SPEED * (slow ? 0.85 : 1);
      this.moveEntity(this.save, this.dodgeDir.x * dodgeSpeed * clamped, this.dodgeDir.y * dodgeSpeed * clamped, PLAYER_RADIUS);
      this.dodgeTimer = Math.max(0, this.dodgeTimer - clamped);
      this.animationTime += clamped;
      moving = true;
    } else if (moving) {
      const dir = normalize(input.moveX, input.moveY);
      this.moveEntity(this.save, dir.x * speed * clamped, dir.y * speed * clamped, PLAYER_RADIUS);
      if (Math.abs(input.moveX) > Math.abs(input.moveY)) this.facing = input.moveX > 0 ? "right" : "left";
      else if (input.moveY !== 0) this.facing = input.moveY > 0 ? "down" : "up";
      this.animationTime += clamped;
    }
    this.moving = moving;

    if (this.classDef.resource === "rage") {
      if (this.elapsed - this.lastCombat > COMBAT_TIMEOUT) {
        this.save.resource = Math.max(0, this.save.resource - rageDecayPerSecond() * clamped);
      }
    } else {
      this.save.resource = Math.min(currentStats.maxResource, this.save.resource + resourceRegen(this.classDef.resource, currentStats.maxResource) * clamped);
    }

    this.updateMonsters(clamped);
    if (this.dead) {
      this.clampSave();
      return this.drainEvents();
    }
    this.updatePets(clamped);
    this.updateHatchling(clamped);
    this.updateProjectiles(clamped);
    this.updateTraps(clamped);
    this.updateTelegraphs(clamped);
    this.updateLoot(clamped);
    this.clampSave();
    return this.drainEvents();
  }

  private emitTime(_dt: number): void {
    this.elapsed += _dt;
  }

  private tickStatuses(dt: number): void {
    for (const status of this.statuses) status.remaining -= dt;
    const playerDot = this.statuses
      .filter((s) => s.kind === "poison" || s.kind === "burn")
      .reduce((sum, s) => sum + s.value * dt, 0);
    if (playerDot > 0 && !this.dead) {
      this.save.hp = Math.max(0, this.save.hp - playerDot);
      if (this.save.hp <= 0) this.killPlayer("Venom");
    }
    this.statuses = this.statuses.filter((s) => s.remaining > 0);
    for (const monster of this.monsters) {
      if (monster.state === "dead") continue;
      for (const status of monster.statuses) status.remaining -= dt;
      const damage = monster.statuses
        .filter((s) => s.kind === "burn" || s.kind === "poison")
        .reduce((sum, s) => sum + s.value * dt, 0);
      monster.statuses = monster.statuses.filter((s) => s.remaining > 0);
      if (damage > 0) {
        monster.hp -= damage;
        if (monster.hp <= 0) this.killMonster(monster);
      }
    }
  }

  private tickBuffs(dt: number): void {
    for (const buff of this.buffs) buff.remaining -= dt;
    this.buffs = this.buffs.filter((b) => b.remaining > 0);
  }

  private clampSave(): void {
    const stats = this.stats;
    this.save.hp = Math.max(0, Math.min(this.save.hp, stats.maxHp));
    this.save.resource = Math.max(0, Math.min(this.save.resource, stats.maxResource));
    this.save.rngState = this.rng.state >>> 0;
    this.save.x = Math.max(0, Math.min(this.save.x, this.zone.width * this.zone.tileWidth));
    this.save.y = Math.max(0, Math.min(this.save.y, this.zone.height * this.zone.tileHeight));
  }

  private updateMonsters(dt: number): void {
    const player = this.save;
    for (const monster of this.monsters) {
      if (monster.state === "dead") {
        if (monster.respawnTimer > 0) {
          monster.respawnTimer -= dt;
          if (monster.respawnTimer <= 0) this.respawnMonster(monster);
        }
        continue;
      }
      const def = getMonster(monster.defId);
      for (const status of monster.statuses) status.remaining -= dt;
      const stunned = monster.statuses.some((s) => s.kind === "stun");
      const slowed = monster.statuses.find((s) => s.kind === "slow");
      const marked = monster.statuses.some((s) => s.kind === "mark");
      monster.statuses = monster.statuses.filter((s) => s.remaining > 0);
      monster.attackTimer = Math.max(0, monster.attackTimer - dt);
      monster.wanderTimer -= dt;

      const playerDist = length(player.x - monster.x, player.y - monster.y);
      const leashDist = length(monster.spawnX - monster.x, monster.spawnY - monster.y);
      if (leashDist > def.leashRadius) {
        monster.state = "return";
      } else if (monster.state === "idle" && playerDist <= def.aggroRadius && !this.dead) {
        monster.state = "chase";
      }

      if (stunned) continue;
      const speed = def.speed * (monster.elite === "swift" ? 1.3 : 1) * (slowed ? 1 - slowed.value / 100 : 1);

      if (monster.state === "return") {
        const dir = normalize(monster.spawnX - monster.x, monster.spawnY - monster.y);
        if (leashDist < 6) {
          monster.state = "idle";
          monster.hp = monster.maxHp ?? def.maxHp;
          monster.statuses = [];
        } else {
          this.moveEntity(monster, dir.x * speed * dt, dir.y * speed * dt, def.radius);
          monster.facing = dir.x >= 0 ? 1 : -1;
        }
        continue;
      }

      if (monster.state === "chase") {
        if (playerDist <= def.attackRange + PLAYER_RADIUS) {
          monster.state = "attack";
        } else {
          const dir = normalize(player.x - monster.x, player.y - monster.y);
          this.moveEntity(monster, dir.x * speed * dt, dir.y * speed * dt, def.radius);
          monster.facing = dir.x >= 0 ? 1 : -1;
          if (leashDist > def.leashRadius * 1.4) monster.state = "return";
        }
      }

      if (monster.state === "attack") {
        if (playerDist > def.attackRange + PLAYER_RADIUS + 12) {
          monster.state = "chase";
        } else if (monster.attackTimer <= 0) {
          monster.attackTimer = def.attackCooldown;
          const raw = def.attack * this.difficultyScale.attack * this.rng.between(0.85, 1.15) * (marked ? 1.2 : 1);
          this.damagePlayer(raw, def.name);
          if (this.dead) return;
          if (monster.elite === "venomous") {
            const existing = this.statuses.find((s) => s.kind === "poison");
            if (existing) existing.remaining = Math.max(existing.remaining, 3);
            else this.statuses.push({ kind: "poison", remaining: 3, value: def.attack * 0.12 });
          }
        }
      } else if (monster.state === "idle") {
        if (monster.wanderTimer <= 0) {
          monster.wanderTimer = this.rng.between(2, 5);
          const angle = this.rng.next() * Math.PI * 2;
          monster.wanderX = monster.spawnX + Math.cos(angle) * this.rng.between(0, 34);
          monster.wanderY = monster.spawnY + Math.sin(angle) * this.rng.between(0, 34);
        }
        const dir = normalize(monster.wanderX - monster.x, monster.wanderY - monster.y);
        if (length(monster.wanderX - monster.x, monster.wanderY - monster.y) > 6) {
          this.moveEntity(monster, dir.x * speed * 0.4 * dt, dir.y * speed * 0.4 * dt, def.radius);
        }
      }

      if (def.boss && monster.state !== "idle" && monster.attackTimer <= 0 && this.rng.chance(dt * 0.16)) {
        this.spawnTelegraph(player.x, player.y, 62, def.attack * this.difficultyScale.attack * 1.8, 1.25, this.bossShape(def.id, 0), Math.atan2(player.y - monster.y, player.x - monster.x));
      }

      if (def.boss) {
        const maxHp = monster.maxHp ?? def.maxHp;
        const nextPhase = monster.hp / maxHp <= 0.33 ? 2 : monster.hp / maxHp <= 0.66 ? 1 : 0;
        if (nextPhase > (monster.phase ?? 0)) {
          monster.phase = nextPhase;
          monster.attackTimer = Math.max(monster.attackTimer, 0.8);
          this.emit({ type: "log", text: `${def.name} enters phase ${nextPhase + 1}!`, tone: "bad" });
          this.spawnTelegraph(player.x, player.y, 74, def.attack * this.difficultyScale.attack * 2.2, 1.5, this.bossShape(def.id, 1), Math.atan2(player.y - monster.y, player.x - monster.x));
          if (def.id === "hollow_king") {
            for (let i = 0; i < nextPhase; i += 1) {
              const angle = (Math.PI * 2 * i) / nextPhase + this.rng.next();
              const add = this.makeMonster({
                id: "hollow_acolyte",
                x: monster.x + Math.cos(angle) * 56,
                y: monster.y + Math.sin(angle) * 56,
              });
              this.monsters.push(add);
            }
            this.emit({ type: "log", text: "Hollow acolytes answer their king's call.", tone: "bad" });
          }
        }
      }
    }
  }

  private bossShape(bossId: string, strike: number): "ring" | "line" | "cone" | "spot" {
    const shapes: Record<string, ("ring" | "line" | "cone" | "spot")[]> = {
      bone_warden: ["cone", "cone"],
      miremother: ["spot", "spot"],
      ice_revenant: ["ring", "ring"],
      hollow_king: ["line", "ring"],
    };
    const list = shapes[bossId] ?? ["ring", "cone"];
    return list[strike % list.length];
  }

  private spawnTelegraph(
    x: number,
    y: number,
    radius: number,
    damage: number,
    delay: number,
    shape: "ring" | "line" | "cone" | "spot" = "ring",
    angle = 0,
  ): void {
    const telegraph: TelegraphInstance = {
      uid: this.nextUid("t"),
      x,
      y,
      radius,
      remaining: delay,
      total: delay,
      damage,
      kind: "boss",
      shape,
      angle,
    };
    this.telegraphs.push(telegraph);
    this.emit({ type: "telegraph", x, y, radius, remaining: delay, shape, angle });
  }

  private updateTelegraphs(dt: number): void {
    for (const telegraph of this.telegraphs) {
      telegraph.remaining -= dt;
      if (telegraph.remaining <= 0) {
        if (this.telegraphHits(telegraph)) {
          this.damagePlayer(telegraph.damage, "Bone Warden");
        }
      }
    }
    this.telegraphs = this.telegraphs.filter((t) => t.remaining > 0);
  }

  private telegraphHits(t: TelegraphInstance): boolean {
    const px = this.save.x;
    const py = this.save.y;
    const shape = t.shape ?? "ring";
    if (shape === "ring" || shape === "spot") {
      return dist2(px, py, t.x, t.y) <= t.radius * t.radius;
    }
    const dx = px - t.x;
    const dy = py - t.y;
    if (shape === "cone") {
      if (dx * dx + dy * dy > t.radius * t.radius) return false;
      const a = Math.atan2(dy, dx);
      let diff = Math.abs(a - (t.angle ?? 0));
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      return diff <= Math.PI / 4;
    }
    // line: a thin strip reaching out from the boss along its angle
    const cos = Math.cos(t.angle ?? 0);
    const sin = Math.sin(t.angle ?? 0);
    const along = dx * cos + dy * sin;
    const across = -dx * sin + dy * cos;
    return along >= 0 && along <= t.radius && Math.abs(across) <= 14;
  }

  private updateTraps(dt: number): void {
    for (const trap of this.traps) {
      if (trap.rearmTimer > 0) {
        trap.rearmTimer -= dt;
        if (trap.rearmTimer <= 0) trap.armed = true;
        continue;
      }
      if (!trap.armed) continue;
      if (dist2(this.save.x, this.save.y, trap.x, trap.y) <= trap.radius * trap.radius) {
        this.damagePlayer(trap.damage, "Ancient Trap");
        trap.armed = false;
        trap.rearmTimer = 3.5;
        this.emit({ type: "log", text: "A hidden trap springs!", tone: "bad" });
      }
    }
  }

  private damagePlayer(raw: number, source: string): void {
    if (this.dead) return;
    if (this.invulnerable > 0) {
      if (this.elapsed - this.lastImmuneEvent > 0.35) {
        this.lastImmuneEvent = this.elapsed;
        this.emit({ type: "immune", x: this.save.x, y: this.save.y });
      }
      return;
    }
    const stats = this.stats;
    const reduced = raw * (1 - this.modifiers.damageReduction / 100);
    const mitigated = Math.max(1, Math.round(reduced * (100 / (100 + stats.defense * 2))));
    let damage = mitigated;
    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, damage);
      this.shield -= absorbed;
      damage -= absorbed;
      if (absorbed > 0) this.emit({ type: "log", text: `Shield absorbs ${Math.round(absorbed)} damage.`, tone: "info" });
    }
    this.save.hp = Math.max(0, this.save.hp - damage);
    this.lastCombat = this.elapsed;
    if (damage > 0) this.emit({ type: "damage", target: "player", amount: Math.round(damage), crit: false, x: this.save.x, y: this.save.y, damageType: "physical" });
    if (this.save.hp <= 0) this.killPlayer(source);
  }

  private killPlayer(_source: string): void {
    if (this.dead) return;
    this.dead = true;
    this.moving = false;
    this.respawnTimer = RESPAWN_SECONDS;
    this.pets = [];
    this.projectiles = [];
    this.emit({ type: "death", who: "player", x: this.save.x, y: this.save.y });
    this.emit({ type: "log", text: "You have fallen. Returning to the village...", tone: "bad" });
  }

  private respawn(): void {
    const zone = ZONES.village;
    this.save.zone = "village";
    this.save.x = zone.spawn.x;
    this.save.y = zone.spawn.y;
    const stats = this.stats;
    this.save.hp = stats.maxHp;
    this.save.resource = this.classDef.resource === "rage" ? 0 : stats.maxResource;
    this.dead = false;
    this.shield = 0;
    this.loadZone();
    this.emit({ type: "respawn" });
    this.emit({ type: "zone", zone: "village" });
    this.emit({ type: "log", text: "Elara's light pulls you back. You wake in Eldoria Village.", tone: "good" });
  }

  private respawnMonster(monster: MonsterInstance): void {
    const def = getMonster(monster.defId);
    monster.x = monster.spawnX;
    monster.y = monster.spawnY;
    monster.hp = monster.maxHp ?? def.maxHp;
    monster.state = "idle";
    monster.attackTimer = 0;
    monster.statuses = [];
    monster.respawnTimer = 0;
  }

  private advanceStoryFromBoss(): void {
    // Unlock the next chapter only when its own boss has fallen.
    // A boss defeated out of order is still recorded, so its chapter unlocks when the earlier chapters are done.
    while (this.save.storyChapter < STORY_CHAPTERS.length - 1) {
      const nextChapter = STORY_CHAPTERS[this.save.storyChapter + 1];
      if (!nextChapter || !nextChapter.bossId || !this.save.defeatedBosses.includes(nextChapter.bossId)) break;
      this.save.storyChapter += 1;
      const next = STORY_CHAPTERS[this.save.storyChapter];
      this.emit({ type: "story", title: next.title, text: next.text, closing: next.closing, bossIndex: this.save.storyChapter - 1 });
    }
    // The final boss's ending changes on later cycles, so a replay has a new story to see.
    const finalChapter = STORY_CHAPTERS[STORY_CHAPTERS.length - 1];
    if (this.save.ngPlus > 0 && this.save.defeatedBosses.includes("hollow_king") && this.save.storyChapter === STORY_CHAPTERS.length - 1) {
      this.emit({ type: "story", title: finalChapter.title, text: finalChapter.text, closing: NG_PLUS_HOLLOW_ENDING, bossIndex: STORY_CHAPTERS.length - 1 });
    }
  }

  private killMonster(monster: MonsterInstance): void {
    if (monster.state === "dead") return;
    monster.state = "dead";
    const def = getMonster(monster.defId);
    monster.respawnTimer = def.respawn > 0 ? def.respawn : 0;
    this.emit({ type: "death", who: "monster", defId: def.id, x: monster.x, y: monster.y });
    this.lastCombat = this.elapsed;
    if (def.boss && !this.save.defeatedBosses.includes(def.id)) {
      this.save.defeatedBosses.push(def.id);
    }
    if (def.boss) this.advanceStoryFromBoss();
    if (monster.elite === "volatile" && length(this.save.x - monster.x, this.save.y - monster.y) <= 90) {
      this.damagePlayer(def.attack * this.difficultyScale.attack * 1.4, `${def.name} (Volatile)`);
      this.emit({ type: "log", text: `${def.name} bursts in a volatile blast!`, tone: "bad" });
    }
    if (SUMMON_IDS.has(def.id)) return;
    if (def.xp > 0) this.gainXp(Math.round(def.xp * this.difficultyScale.xp));
    const gold = Math.round(this.rng.int(def.goldMin, def.goldMax) * this.difficultyScale.gold);
    if (gold > 0) {
      this.save.gold += gold;
      this.emit({ type: "gold", amount: gold });
    }
    const drops: ItemStack[] = [];
    for (const entry of def.loot) {
      if (!this.rng.chance(entry.chance)) continue;
      const item = ITEMS[entry.itemId];
      const qty = this.rng.int(entry.min, entry.max);
      const instance = item && isEquippable(item) ? createItemInstance(entry.itemId, this.rng) : undefined;
      drops.push({ itemId: entry.itemId, qty: instance ? 1 : qty, instance });
    }
    for (const drop of drops) {
      const item = ITEMS[drop.itemId];
      if (!item) continue;
      this.loot.push({
        uid: this.nextUid("l"),
        itemId: drop.itemId,
        qty: drop.qty,
        x: monster.x + this.rng.between(-10, 10),
        y: monster.y + this.rng.between(-10, 10),
        ttl: 90,
        instance: drop.instance,
      });
      this.emit({ type: "loot", itemId: drop.itemId, qty: drop.qty, x: monster.x, y: monster.y });
    }
    this.recordKill(def.id);
  }

  private updateHatchling(dt: number): void {
    const companion = this.save.companion;
    if (!companion || !companion.hatched) return;
    this.hatchlingAttackTimer = Math.max(0, this.hatchlingAttackTimer - dt);
    const target = this.nearestMonster(this.save.x, this.save.y, 150);
    if (!target || this.hatchlingAttackTimer > 0) return;
    this.hatchlingAttackTimer = 1.6;
    this.hatchlingHitting = true;
    this.hitMonster(target, 4 + this.save.level, false, "physical", []);
    this.hatchlingHitting = false;
  }

  private updatePets(dt: number): void {
    for (const pet of this.pets) pet.ttl -= dt;
    this.pets = this.pets.filter((p) => p.ttl > 0 && p.hp > 0);
    for (const pet of this.pets) {
      pet.attackTimer = Math.max(0, pet.attackTimer - dt);
      const def = getMonster(pet.kind === "wolf" ? "spirit_wolf" : pet.kind === "skeleton" ? "skeleton_minion" : "familiar");
      const target = this.nearestMonster(pet.x, pet.y, 190);
      if (target) {
        const d = length(target.x - pet.x, target.y - pet.y);
        const range = pet.kind === "familiar" ? 130 : def.attackRange;
        if (d > range) {
          const dir = normalize(target.x - pet.x, target.y - pet.y);
          const speed = pet.kind === "familiar" ? 76 : 92;
          this.moveEntity(pet, dir.x * speed * dt, dir.y * speed * dt, 8);
        } else if (pet.attackTimer <= 0) {
          pet.attackTimer = def.attackCooldown;
          const damage = this.rng.between(pet.damage * 0.85, pet.damage * 1.15);
          this.hitMonster(target, damage, false, "physical", []);
        }
      } else if (length(this.save.x - pet.x, this.save.y - pet.y) > 52) {
        const dir = normalize(this.save.x - pet.x, this.save.y - pet.y);
        this.moveEntity(pet, dir.x * 90 * dt, dir.y * 90 * dt, 8);
      }
    }
  }

  private updateProjectiles(dt: number): void {
    for (const projectile of this.projectiles) {
      projectile.ttl -= dt;
      projectile.x += projectile.dirX * projectile.speed * dt;
      projectile.y += projectile.dirY * projectile.speed * dt;
      if (this.isBlockedAt(projectile.x, projectile.y, projectile.radius)) {
        projectile.ttl = 0;
        continue;
      }
      for (const monster of this.monsters) {
        if (monster.state === "dead") continue;
        const def = getMonster(monster.defId);
        if (dist2(projectile.x, projectile.y, monster.x, monster.y) <= (projectile.radius + def.radius) ** 2) {
          this.hitMonster(monster, projectile.damage, projectile.crit > 0, projectile.damageType, projectile.statuses);
          projectile.ttl = 0;
          break;
        }
      }
    }
    this.projectiles = this.projectiles.filter((p) => p.ttl > 0);
  }

  private updateLoot(dt: number): void {
    for (const drop of this.loot) {
      drop.ttl -= dt;
      if (dist2(this.save.x, this.save.y, drop.x, drop.y) <= PICKUP_RANGE * PICKUP_RANGE) {
        if (this.addItem(drop.itemId, drop.qty, drop.instance) === 0) {
          this.emit({ type: "pickup", itemId: drop.itemId, qty: drop.qty });
          drop.ttl = 0;
        }
      }
    }
    this.loot = this.loot.filter((l) => l.ttl > 0);
  }

  nearestMonster(x: number, y: number, maxRange: number): MonsterInstance | null {
    let best: MonsterInstance | null = null;
    let bestD = maxRange * maxRange;
    for (const monster of this.monsters) {
      if (monster.state === "dead") continue;
      const d = dist2(x, y, monster.x, monster.y);
      if (d < bestD) {
        bestD = d;
        best = monster;
      }
    }
    return best;
  }

  private hitMonster(monster: MonsterInstance, raw: number, crit: boolean, damageType: DamageType, statuses: StatusInstance[]): void {
    if (monster.state === "dead") return;
    const def = getMonster(monster.defId);
    const mods = this.modifiers;
    const marked = monster.statuses.some((s) => s.kind === "mark");
    const maxHp = monster.maxHp ?? def.maxHp;
    const execute = monster.hp / maxHp <= 0.3 ? 1 + mods.execute / 100 : 1;
    const eliteDefense = monster.elite === "armored" ? 1.35 : 1;
    const mitigated = Math.max(1, Math.round(raw * (100 / (100 + def.defense * 2.5 * eliteDefense)) * (marked ? 1.2 : 1) * execute));
    monster.hp -= mitigated;
    if (mods.lifesteal > 0) this.healPlayer(mitigated * (mods.lifesteal / 100));
    this.lastCombat = this.elapsed;
    this.emit({
      type: "damage",
      target: "monster",
      uid: monster.uid,
      amount: mitigated,
      crit,
      x: monster.x,
      y: monster.y,
      damageType,
      source: this.hatchlingHitting ? "hatchling" : undefined,
    });
    for (const status of statuses) {
      if (status.kind === "stun") {
        const existing = monster.statuses.find((s) => s.kind === "stun");
        if (existing) existing.remaining = Math.max(existing.remaining, status.remaining);
        else monster.statuses.push({ ...status });
      } else if (status.kind === "slow" || status.kind === "mark") {
        const existing = monster.statuses.find((s) => s.kind === status.kind);
        if (existing) {
          existing.remaining = Math.max(existing.remaining, status.remaining);
          existing.value = Math.max(existing.value, status.value);
        } else monster.statuses.push({ ...status });
      } else {
        monster.statuses.push({ ...status });
      }
    }
    if (monster.hp <= 0) {
      if (mods.healOnKill > 0) this.healPlayer(this.stats.maxHp * (mods.healOnKill / 100));
      this.killMonster(monster);
    }
  }

  private gainXp(amount: number): void {
    if (this.save.level >= LEVEL_CAP || amount <= 0) return;
    this.save.xp += amount;
    this.emit({ type: "xp", amount });
    while (this.save.level < LEVEL_CAP) {
      const needed = xpToNext(this.save.level);
      if (this.save.xp < needed) break;
      this.save.xp -= needed;
      const before = this.stats;
      this.save.level += 1;
      const after = this.stats;
      this.save.hp = Math.min(after.maxHp, this.save.hp + (after.maxHp - before.maxHp));
      this.save.resource = Math.min(after.maxResource, this.save.resource + (after.maxResource - before.maxResource));
      this.emit({ type: "levelup", level: this.save.level });
      this.emit({ type: "log", text: `Level up! You are now level ${this.save.level}.`, tone: "good" });
      for (const ability of this.classDef.abilities) {
        if (ability.unlockLevel === this.save.level) this.emit({ type: "log", text: `New ability unlocked: ${ability.name}.`, tone: "good" });
      }
    }
    if (this.save.level >= LEVEL_CAP) this.save.xp = 0;
  }

  private resourceGain(amount: number): void {
    this.save.resource = Math.min(this.stats.maxResource, this.save.resource + amount);
  }

  getAbilities(): AbilityDef[] {
    return [this.classDef.basic, ...unlockedAbilities(this.classDef, this.save.level)];
  }

  abilityCooldown(id: string): number {
    return this.cooldowns[id] ?? 0;
  }

  castAbility(id: string, aim: Vec2): boolean {
    if (this.dead) return false;
    const basic = id === "basic";
    const ability = basic ? this.classDef.basic : this.classDef.abilities.find((a) => a.id === id);
    if (!ability) return false;
    if (!basic && !isAbilityUnlocked(this.classDef, this.save.level, id)) return false;
    if ((this.cooldowns[id] ?? 0) > 0) return false;
    if (ability.cost > this.save.resource) {
      this.emit({ type: "log", text: `Not enough ${this.resourceLabel.toLowerCase()}.`, tone: "bad" });
      return false;
    }
    const dir = normalize(aim.x - this.save.x, aim.y - this.save.y);
    this.lastAim = dir;
    this.save.resource -= ability.cost;
    this.cooldowns[id] = ability.cooldown * (1 - this.modifiers.cooldown / 100);
    if (basic) this.resourceGain(RESOURCE_GAIN[this.classDef.resource]);
    this.lastCombat = this.elapsed;
    const castRadius = ability.effects.find((effect) => effect.radius)?.radius ?? (ability.targeting === "self" ? 72 : 0);
    const castRange = ability.range > 0 ? ability.range : ability.targeting === "point" ? 160 : 0;
    const castTarget =
      ability.targeting === "self"
        ? { x: this.save.x, y: this.save.y }
        : {
            x: this.save.x + dir.x * Math.min(castRange, Math.max(0, length(aim.x - this.save.x, aim.y - this.save.y))),
            y: this.save.y + dir.y * Math.min(castRange, Math.max(0, length(aim.x - this.save.x, aim.y - this.save.y))),
          };
    this.emit({
      type: "cast",
      abilityId: ability.id,
      x: this.save.x,
      y: this.save.y,
      targetX: castTarget.x,
      targetY: castTarget.y,
      targeting: ability.targeting,
      radius: castRadius,
      basic,
      color: this.classDef.accent,
      icon: ability.icon,
    });

    if (ability.targeting === "self") {
      this.castSelf(ability);
    } else if (ability.targeting === "point") {
      const range = ability.range > 0 ? ability.range : 160;
      const distance = Math.min(range, length(aim.x - this.save.x, aim.y - this.save.y));
      const point = { x: this.save.x + dir.x * distance, y: this.save.y + dir.y * distance };
      this.castPoint(ability, point);
    } else if (ability.targeting === "direction") {
      this.castDirection(ability, dir);
    } else {
      this.castMelee(ability, dir);
    }
    return true;
  }

  private statusesFromEffects(effects: AbilityEffect[], damageType: DamageType): StatusInstance[] {
    const statuses: StatusInstance[] = [];
    for (const effect of effects) {
      if (effect.kind === "slow") statuses.push({ kind: "slow", remaining: effect.duration ?? 2, value: effect.percent ?? 30 });
      else if (effect.kind === "stun") statuses.push({ kind: "stun", remaining: effect.duration ?? 0.5, value: 0 });
      else if (effect.kind === "mark") statuses.push({ kind: "mark", remaining: effect.duration ?? 5, value: effect.percent ?? 20 });
      else if (effect.kind === "dot") {
        const kind = damageType === "poison" || damageType === "nature" ? "poison" : "burn";
        statuses.push({ kind, remaining: effect.duration ?? 3, value: (effect.amount ?? 0) * 0.5 });
      }
    }
    return statuses;
  }

  private effectDamage(effect: AbilityEffect): number {
    const stats = this.stats;
    const raw = (effect.amount ?? 0) + (effect.scaling ?? 0) * stats.attack;
    const crit = this.rng.chance(stats.crit);
    return Math.round(raw * (crit ? 1.8 + this.modifiers.critDamage / 100 : 1) * this.rng.between(0.9, 1.1)) + (crit ? 1 : 0);
  }

  private castDirection(ability: AbilityDef, dir: Vec2): void {
    const damageEffects = ability.effects.filter((e) => e.kind === "damage");
    if (damageEffects.length === 0) {
      this.castSelf(ability);
      return;
    }
    // Several arrows (like Multi-Shot) fan out in a tight spread instead of stacking.
    const count = damageEffects.length;
    const spreadStep = count > 1 ? 0.14 : 0;
    damageEffects.forEach((effect, index) => {
      const speed = effect.projectile?.speed ?? 430;
      const radius = effect.projectile?.radius ?? 6;
      const damageType = effect.damageType ?? "physical";
      const damage = this.effectDamage(effect);
      const crit = damage > 0 && this.rng.chance(this.stats.crit);
      const angle = (index - (count - 1) / 2) * spreadStep;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const aimX = dir.x * cos - dir.y * sin;
      const aimY = dir.x * sin + dir.y * cos;
      this.projectiles.push({
        uid: this.nextUid("p"),
        abilityId: ability.id,
        x: this.save.x + aimX * 14,
        y: this.save.y + aimY * 14,
        dirX: aimX,
        dirY: aimY,
        speed,
        ttl: Math.max(0.5, ability.range / speed),
        radius,
        damage,
        crit: crit ? 1 : 0,
        damageType,
        color: DAMAGE_COLORS[damageType],
        statuses: this.statusesFromEffects(ability.effects, damageType),
        owner: "player",
      });
    });
  }

  private castPoint(ability: AbilityDef, point: Vec2): void {
    const radius = ability.effects.find((e) => e.radius)?.radius ?? 40;
    const targets = this.monsters.filter((m) => m.state !== "dead" && dist2(m.x, m.y, point.x, point.y) <= (radius + 12) ** 2);
    this.applyEffects(ability, targets, point);
  }

  private castSelf(ability: AbilityDef): void {
    const radius = ability.effects.find((e) => e.radius)?.radius ?? 72;
    const damageEffects = ability.effects.some((e) => e.kind === "damage");
    const targets = damageEffects
      ? this.monsters.filter((m) => m.state !== "dead" && dist2(m.x, m.y, this.save.x, this.save.y) <= (radius + 12) ** 2)
      : [];
    this.applyEffects(ability, targets, { x: this.save.x, y: this.save.y });
  }

  private castMelee(ability: AbilityDef, dir: Vec2): void {
    const candidates = this.monsters
      .filter((m) => m.state !== "dead")
      .map((m) => ({ m, d: length(m.x - this.save.x, m.y - this.save.y), dot: normalize(m.x - this.save.x, m.y - this.save.y).x * dir.x + normalize(m.x - this.save.x, m.y - this.save.y).y * dir.y }))
      .filter((entry) => entry.d <= ability.range + 14)
      .sort((a, b) => b.dot - a.dot || a.d - b.d);
    const primary = candidates[0]?.m;
    const radius = ability.effects.find((e) => e.radius)?.radius;
    const targets = primary
      ? this.monsters.filter((m) => m.state !== "dead" && (m === primary || (radius && dist2(m.x, m.y, primary.x, primary.y) <= radius * radius)))
      : [];
    if (targets.length === 0) {
      if (ability.targeting === "melee" && dir.x !== 0) this.facing = dir.x > 0 ? "right" : "left";
    }
    this.applyEffects(ability, targets, primary ? { x: primary.x, y: primary.y } : { x: this.save.x + dir.x * 30, y: this.save.y + dir.y * 30 });
  }

  private applyEffects(ability: AbilityDef, targets: MonsterInstance[], center: Vec2): void {
    for (const effect of ability.effects) {
      if (effect.kind === "damage") {
        const damage = this.effectDamage(effect);
        const crit = this.rng.chance(this.stats.crit);
        const statuses = this.statusesFromEffects(ability.effects, effect.damageType ?? "physical");
        if (targets.length === 0) continue;
        for (const target of targets) this.hitMonster(target, damage, crit, effect.damageType ?? "physical", statuses);
      } else if (effect.kind === "heal") {
        const amount = (effect.amount ?? 0) + (effect.scaling ?? 0) * this.stats.attack;
        this.healPlayer(amount);
      } else if (effect.kind === "buff" && effect.stat && effect.duration) {
        const existing = this.buffs.find((b) => b.name === (effect.name ?? ability.name));
        if (existing) {
          existing.remaining = Math.max(existing.remaining, effect.duration);
          existing.percent = Math.max(existing.percent, effect.percent ?? 0);
        } else {
          this.buffs.push({
            name: effect.name ?? ability.name,
            stat: effect.stat,
            percent: effect.percent ?? 20,
            remaining: effect.duration,
          });
        }
        this.emit({ type: "log", text: `${effect.name ?? ability.name} activated.`, tone: "good" });
      } else if (effect.kind === "shield") {
        this.shield += effect.amount ?? 30;
        this.emit({ type: "log", text: `A shield absorbs incoming damage.`, tone: "good" });
      } else if (effect.kind === "summon") {
        this.summon(effect);
      } else if (effect.kind === "dash") {
        this.dash(effect.amount ?? 80);
      } else if (effect.kind === "trap") {
        this.placeTrap(effect, center);
      } else if (effect.kind === "dot" || effect.kind === "slow" || effect.kind === "stun" || effect.kind === "mark") {
        if (targets.length === 0) continue;
        const statuses = this.statusesFromEffects([effect], effect.damageType ?? "physical");
        for (const target of targets) {
          for (const status of statuses) {
            const existing = target.statuses.find((s) => s.kind === status.kind);
            if (existing) {
              existing.remaining = Math.max(existing.remaining, status.remaining);
              existing.value = Math.max(existing.value, status.value);
            } else target.statuses.push({ ...status });
          }
        }
      }
    }
  }

  private dash(distance: number): void {
    const dir = this.lastAim;
    const steps = 14;
    const step = distance / steps;
    for (let i = 0; i < steps; i += 1) {
      if (this.isBlockedAt(this.save.x + dir.x * step, this.save.y + dir.y * step, PLAYER_RADIUS)) break;
      this.save.x += dir.x * step;
      this.save.y += dir.y * step;
    }
  }

  private summon(effect: AbilityEffect): void {
    const count = effect.summonCount ?? 1;
    const kind = effect.summonId === "skeleton_minion" ? "skeleton" : effect.summonId === "spirit_wolf" ? "wolf" : "familiar";
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count + this.rng.next();
      this.pets.push({
        uid: this.nextUid("pet"),
        kind,
        x: this.save.x + Math.cos(angle) * 28,
        y: this.save.y + Math.sin(angle) * 28,
        hp: 100,
        ttl: effect.summonDuration ?? 15,
        attackTimer: 0,
        damage: Math.round((8 + this.save.level * 2 + this.stats.attack * 0.4) * 10) / 10,
      });
    }
    this.emit({ type: "log", text: `${count > 1 ? count + " companions answer" : "A companion answers"} your call.`, tone: "good" });
  }

  private placeTrap(effect: AbilityEffect, center: Vec2): void {
    this.traps.push({
      uid: this.nextUid("trap"),
      x: center.x,
      y: center.y,
      radius: effect.radius ?? 40,
      damage: Math.round((effect.amount ?? 20) + (effect.scaling ?? 0) * this.stats.attack),
      armed: true,
      rearmTimer: 0,
    });
    this.emit({ type: "log", text: "A trap is set.", tone: "info" });
  }

  healPlayer(amount: number): void {
    if (this.dead) return;
    const stats = this.stats;
    const before = this.save.hp;
    this.save.hp = Math.min(stats.maxHp, this.save.hp + amount);
    const healed = Math.round(this.save.hp - before);
    if (healed > 0) this.emit({ type: "heal", amount: healed, x: this.save.x, y: this.save.y });
  }

  private recordKill(monsterId: string): void {
    for (const state of this.save.quests) {
      if (state.completed) continue;
      const quest = QUESTS[state.id];
      if (!quest) continue;
      quest.objectives.forEach((objective, i) => {
        if (objective.kind === "kill" && objective.monsterId === monsterId) state.progress[i] = Math.min(objective.count, (state.progress[i] ?? 0) + 1);
        else if (objective.kind === "boss" && objective.monsterId === monsterId) state.progress[i] = 1;
      });
      this.refreshQuestCompletion(state);
    }
  }

  private refreshQuestCompletion(state: QuestState): void {
    const quest = QUESTS[state.id];
    if (!quest) return;
    const done = quest.objectives.every((objective, i) => (state.progress[i] ?? 0) >= this.objectiveCount(objective));
    if (done && !state.completed) {
      state.completed = true;
      this.emit({ type: "quest", questId: quest.id, text: `${quest.name} is ready to turn in.` });
      this.emit({ type: "log", text: `${quest.name} complete. Return to ${NPCS[quest.giverNpc]?.name ?? "the quest giver"}.`, tone: "quest" });
    }
  }

  private objectiveCount(objective: { kind: string; count?: number }): number {
    return objective.kind === "boss" ? 1 : objective.count ?? 1;
  }

  private refreshCollectQuests(): void {
    for (const state of this.save.quests) {
      if (state.completed) continue;
      const quest = QUESTS[state.id];
      if (!quest) continue;
      let changed = false;
      quest.objectives.forEach((objective, i) => {
        if (objective.kind !== "collect") return;
        const count = Math.min(objective.count, this.countItem(objective.itemId));
        if ((state.progress[i] ?? 0) !== count) {
          state.progress[i] = count;
          changed = true;
        }
      });
      if (changed) this.refreshQuestCompletion(state);
    }
  }

  addItem(itemId: string, qty: number, instance?: ItemStack["instance"]): number {
    const def = ITEMS[itemId];
    if (!def || qty <= 0) return qty;
    if (instance) {
      const free = this.save.inventory.findIndex((stack) => stack === null);
      if (free === -1) return qty;
      this.save.inventory[free] = { itemId, qty: 1, instance };
      this.refreshCollectQuests();
      return Math.max(0, qty - 1);
    }
    let remaining = qty;
    for (const stack of this.save.inventory) {
      if (!stack || stack.itemId !== itemId || stack.qty >= def.stack) continue;
      const add = Math.min(remaining, def.stack - stack.qty);
      stack.qty += add;
      remaining -= add;
      if (remaining <= 0) break;
    }
    for (let i = 0; i < this.save.inventory.length && remaining > 0; i += 1) {
      if (this.save.inventory[i]) continue;
      const add = Math.min(remaining, def.stack);
      this.save.inventory[i] = { itemId, qty: add };
      remaining -= add;
    }
    if (remaining !== qty) this.refreshCollectQuests();
    return remaining;
  }

  canAdd(itemId: string, qty: number): boolean {
    const def = ITEMS[itemId];
    if (!def) return false;
    let space = 0;
    for (const stack of this.save.inventory) {
      if (!stack) space += def.stack;
      else if (stack.itemId === itemId) space += Math.max(0, def.stack - stack.qty);
      if (space >= qty) return true;
    }
    return space >= qty;
  }

  removeItem(itemId: string, qty: number): boolean {
    if (this.countItem(itemId) < qty) return false;
    let remaining = qty;
    for (let i = this.save.inventory.length - 1; i >= 0 && remaining > 0; i -= 1) {
      const stack = this.save.inventory[i];
      if (!stack || stack.itemId !== itemId) continue;
      const take = Math.min(remaining, stack.qty);
      stack.qty -= take;
      remaining -= take;
      if (stack.qty <= 0) this.save.inventory[i] = null;
    }
    this.refreshCollectQuests();
    return true;
  }

  dodge(dirX = 0, dirY = 0): boolean {
    if (this.dead) return false;
    if (this.stunned) return false;
    if (this.dodgeCooldown > 0) return false;
    const dir = dirX !== 0 || dirY !== 0
      ? normalize(dirX, dirY)
      : normalize(
        this.facing === "left" ? -1 : this.facing === "right" ? 1 : 0,
        this.facing === "up" ? -1 : this.facing === "down" ? 1 : 0,
      );
    this.dodgeDir = dir;
    this.dodgeTimer = DODGE_DURATION;
    this.invulnerable = DODGE_INVULN;
    this.dodgeCooldown = DODGE_COOLDOWN;
    const shieldOnDodge = this.modifiers.shieldOnDodge;
    if (shieldOnDodge > 0) this.shield += shieldOnDodge;
    if (Math.abs(dir.x) > Math.abs(dir.y)) this.facing = dir.x > 0 ? "right" : "left";
    else this.facing = dir.y > 0 ? "down" : "up";
    this.emit({ type: "dodge", x: this.save.x, y: this.save.y });
    return true;
  }

  learnTalent(talentId: string): boolean {
    const choice = getTalentChoice(this.save.classId, talentId);
    if (!choice) {
      this.emit({ type: "log", text: "That talent is not available to your class.", tone: "bad" });
      return false;
    }
    if (this.save.level < choice.level) {
      this.emit({ type: "log", text: `${choice.name} requires level ${choice.level}.`, tone: "info" });
      return false;
    }
    const existing = talentTierChosen(this.save.classId, this.save.talents, choice.tier);
    if (existing) {
      this.emit({ type: "log", text: `You already chose ${existing.name} for this tier.`, tone: "info" });
      return false;
    }
    const before = this.stats;
    this.save.talents.push(choice.id);
    const after = this.stats;
    this.save.hp = Math.min(after.maxHp, this.save.hp + Math.max(0, after.maxHp - before.maxHp));
    this.save.resource = Math.min(after.maxResource, this.save.resource + Math.max(0, after.maxResource - before.maxResource));
    this.emit({ type: "log", text: `Learned talent: ${choice.name}.`, tone: "good" });
    return true;
  }

  respecCost(): number {
    if (this.save.talents.length === 0) return 0;
    return 40 + this.save.level * 12;
  }

  respecTalents(): boolean {
    if (this.save.talents.length === 0) {
      this.emit({ type: "log", text: "You have no talents to reset.", tone: "info" });
      return false;
    }
    const cost = this.respecCost();
    if (this.save.gold < cost) {
      this.emit({ type: "log", text: `Respec costs ${cost} gold.`, tone: "bad" });
      return false;
    }
    this.save.gold -= cost;
    this.save.talents = [];
    const stats = this.stats;
    this.save.hp = Math.min(this.save.hp, stats.maxHp);
    this.save.resource = Math.min(this.save.resource, stats.maxResource);
    this.emit({ type: "log", text: `Master Kael resets your talents for ${cost} gold.`, tone: "good" });
    return true;
  }

  isGathered(nodeId: string): boolean {
    return this.gathered.has(nodeId);
  }

  get dodgeCooldownRemaining(): number {
    return this.dodgeCooldown;
  }

  get isInvulnerable(): boolean {
    return this.invulnerable > 0;
  }

  get stunned(): boolean {
    return this.statuses.some((s) => s.kind === "stun");
  }

  bindQuickSlot(index: number, itemId: string | null): boolean {
    if (index !== 0 && index !== 1) return false;
    if (itemId) {
      const def = ITEMS[itemId];
      if (!def) return false;
      if (def.type !== "consumable") {
        this.emit({ type: "log", text: "Only consumables can be bound to the quickbar.", tone: "info" });
        return false;
      }
    }
    this.save.quickSlots[index] = itemId;
    return true;
  }

  useQuickSlot(index: number): boolean {
    if (index !== 0 && index !== 1) return false;
    const itemId = this.save.quickSlots[index];
    if (!itemId) {
      this.emit({ type: "log", text: "That quick slot is empty. Bind a consumable in your inventory.", tone: "info" });
      return false;
    }
    const slot = this.save.inventory.findIndex((stack) => stack?.itemId === itemId);
    if (slot < 0) {
      this.emit({ type: "log", text: `No ${getItem(itemId).name} left in your pack.`, tone: "bad" });
      return false;
    }
    return this.useItem(slot);
  }

  countItem(itemId: string): number {
    return this.save.inventory.reduce((sum, stack) => (stack && stack.itemId === itemId ? sum + stack.qty : sum), 0);
  }

  useItem(slotIndex: number): boolean {
    const stack = this.save.inventory[slotIndex];
    if (!stack) return false;
    const def = getItem(stack.itemId);
    if (def.type !== "consumable") return false;
    if (this.potionCooldown > 0) {
      this.emit({ type: "log", text: `Potion cooldown: ${this.potionCooldown.toFixed(1)}s.`, tone: "info" });
      return false;
    }
    if (def.heal && this.save.hp >= this.stats.maxHp) {
      this.emit({ type: "log", text: "Health is already full.", tone: "info" });
      return false;
    }
    if (def.restore && this.save.resource >= this.stats.maxResource) {
      this.emit({ type: "log", text: `${this.resourceLabel} is already full.`, tone: "info" });
      return false;
    }
    this.potionCooldown = POTION_COOLDOWN;
    if (def.heal) this.healPlayer(def.heal);
    if (def.restore) this.save.resource = Math.min(this.stats.maxResource, this.save.resource + def.restore);
    stack.qty -= 1;
    if (stack.qty <= 0) this.save.inventory[slotIndex] = null;
    this.emit({ type: "pickup", itemId: def.id, qty: 1 });
    return true;
  }

  equip(slotIndex: number): boolean {
    const stack = this.save.inventory[slotIndex];
    if (!stack) return false;
    const def = getItem(stack.itemId);
    if (!isEquippable(def)) return false;
    if (!canClassUse(def, this.save.classId)) {
      this.emit({ type: "log", text: `${this.classDef.name}s cannot use ${def.name}.`, tone: "bad" });
      return false;
    }
    const type = def.type;
    if (type === "consumable" || type === "material") return false;
    const current = this.save.equipment[type];
    this.save.equipment[type] = { itemId: stack.itemId, qty: 1 };
    stack.qty -= 1;
    if (stack.qty <= 0) this.save.inventory[slotIndex] = null;
    if (current) {
      this.addItem(current.itemId, current.qty);
    }
    const before = this.stats;
    this.save.hp = Math.min(this.save.hp, before.maxHp);
    this.save.resource = Math.min(this.save.resource, before.maxResource);
    this.emit({ type: "log", text: `Equipped ${def.name}.`, tone: "good" });
    return true;
  }

  unequip(slot: keyof CharacterSave["equipment"]): boolean {
    const current = this.save.equipment[slot];
    if (!current) return false;
    const free = this.save.inventory.findIndex((s) => s === null);
    if (free === -1) {
      this.emit({ type: "log", text: "Your inventory is full.", tone: "bad" });
      return false;
    }
    this.save.inventory[free] = current;
    delete this.save.equipment[slot];
    const stats = this.stats;
    this.save.hp = Math.min(this.save.hp, stats.maxHp);
    this.save.resource = Math.min(this.save.resource, stats.maxResource);
    this.emit({ type: "log", text: `Unequipped ${getItem(current.itemId).name}.`, tone: "info" });
    return true;
  }

  sell(slotIndex: number, qty = 1): boolean {
    const stack = this.save.inventory[slotIndex];
    if (!stack) return false;
    const amount = Math.max(1, Math.min(qty, stack.qty));
    const def = getItem(stack.itemId);
    const gold = itemSellValue(stack) * amount;
    stack.qty -= amount;
    if (stack.qty <= 0) this.save.inventory[slotIndex] = null;
    this.save.gold += gold;
    this.emit({ type: "gold", amount: gold });
    this.emit({ type: "log", text: `Sold ${amount}x ${def.name} for ${gold} gold.`, tone: "good" });
    this.refreshCollectQuests();
    return true;
  }

  buy(shopId: string, itemId: string, qty = 1): boolean {
    const shop = SHOPS[shopId];
    if (!shop || !shop.itemIds.includes(itemId)) return false;
    const def = getItem(itemId);
    const amount = Math.max(1, Math.min(qty, def.stack));
    const cost = (def.buy ?? 0) * amount;
    if (!def.buy) return false;
    if (this.save.gold < cost) {
      this.emit({ type: "log", text: "Not enough gold.", tone: "bad" });
      return false;
    }
    if (!this.canAdd(itemId, amount)) {
      this.emit({ type: "log", text: "Your inventory is full.", tone: "bad" });
      return false;
    }
    this.save.gold -= cost;
    this.addItem(itemId, amount);
    this.emit({ type: "log", text: `Bought ${amount}x ${def.name} for ${cost} gold.`, tone: "good" });
    return true;
  }

  upgradeCost(slot: keyof CharacterSave["equipment"]): { gold: number; ore: number; next: number } | null {
    const stack = this.save.equipment[slot];
    if (!stack) return null;
    const def = getItem(stack.itemId);
    const next = (stack.instance?.upgrade ?? 0) + 1;
    if (next > MAX_UPGRADE) return null;
    return {
      gold: Math.round(25 + next * 45 + (def.buy ?? 20) * 0.15),
      ore: 2 + next * 2,
      next,
    };
  }

  upgradeEquipped(slot: keyof CharacterSave["equipment"]): boolean {
    const stack = this.save.equipment[slot];
    if (!stack) return false;
    const cost = this.upgradeCost(slot);
    if (!cost) {
      this.emit({ type: "log", text: "That item is already masterwork quality.", tone: "info" });
      return false;
    }
    if (this.save.gold < cost.gold || this.countItem("iron_ore") < cost.ore) {
      this.emit({ type: "log", text: `Upgrading requires ${cost.gold} gold and ${cost.ore}x Iron Ore.`, tone: "bad" });
      return false;
    }
    this.save.gold -= cost.gold;
    this.removeItem("iron_ore", cost.ore);
    if (!stack.instance) {
      stack.instance = {
        uid: `i_${Date.now().toString(36)}_${Math.floor(this.rng.next() * 1e9).toString(36)}`,
        affixes: [],
        upgrade: 0,
      };
    }
    stack.instance.upgrade += 1;
    this.emit({ type: "log", text: `${getItem(stack.itemId).name} upgraded to +${stack.instance.upgrade}.`, tone: "good" });
    return true;
  }

  craft(recipeId: string): boolean {
    const recipe = getRecipe(recipeId);
    if (!recipe) return false;
    if (this.save.gold < recipe.gold) {
      this.emit({ type: "log", text: `Crafting requires ${recipe.gold} gold.`, tone: "bad" });
      return false;
    }
    for (const material of recipe.materials) {
      if (this.countItem(material.itemId) < material.qty) {
        this.emit({ type: "log", text: `You need ${material.qty}x ${getItem(material.itemId).name}.`, tone: "bad" });
        return false;
      }
    }
    if (!this.canAdd(recipe.resultItemId, 1)) {
      this.emit({ type: "log", text: "Your inventory is full.", tone: "bad" });
      return false;
    }
    this.save.gold -= recipe.gold;
    for (const material of recipe.materials) this.removeItem(material.itemId, material.qty);
    const instance = createItemInstance(recipe.resultItemId, this.rng, 1);
    this.addItem(recipe.resultItemId, 1, instance);
    this.emit({ type: "log", text: `Borin crafts ${recipe.name}${instance ? " with an affix" : ""}.`, tone: "good" });
    return true;
  }

  healCost(): number {
    const missing = Math.max(0, this.stats.maxHp - this.save.hp);
    if (missing <= 0) return 0;
    return Math.max(HEAL_MIN_COST, Math.ceil(missing * HEAL_COST_PER_HP));
  }

  healAtNpc(): boolean {
    const cost = this.healCost();
    if (cost <= 0) {
      this.emit({ type: "log", text: "You are already at full health.", tone: "info" });
      return false;
    }
    if (this.save.gold < cost) {
      this.emit({ type: "log", text: `You need ${cost} gold for healing.`, tone: "bad" });
      return false;
    }
    this.save.gold -= cost;
    this.save.hp = this.stats.maxHp;
    this.emit({ type: "heal", amount: this.stats.maxHp, x: this.save.x, y: this.save.y });
    this.emit({ type: "log", text: `Elara restores you for ${cost} gold.`, tone: "good" });
    return true;
  }

  getNpcQuestStates(npcId: string): { questId: string; name: string; level: number; state: QuestState | null; available: boolean; canTurnIn: boolean; description: string; repeatable: boolean }[] {
    const npc = NPCS[npcId];
    if (!npc?.quests) return [];
    return npc.quests.map((questId) => {
      const quest = getQuest(questId);
      const state = this.save.quests.find((q) => q.id === questId) ?? null;
      const available = !state && this.questUnlocked(quest);
      const canTurnIn = Boolean(state && state.completed && (quest.repeatable || state.completions === 0));
      return { questId, name: quest.name, level: quest.requiresLevel ?? 1, state, available, canTurnIn, description: quest.description, repeatable: Boolean(quest.repeatable) };
    });
  }

  // A quest unlocks when the level is high enough and every quest it requires is done.
  private questUnlocked(quest: QuestDef): boolean {
    if (this.save.level < (quest.requiresLevel ?? 1)) return false;
    return (quest.requires ?? []).every((id) => this.save.quests.some((q) => q.id === id && q.completions > 0));
  }

  acceptQuest(questId: string): boolean {
    const quest = QUESTS[questId];
    if (!quest) return false;
    if (!this.questUnlocked(quest)) return false;
    const existing = this.save.quests.find((q) => q.id === questId);
    if (existing) return false;
    const state: QuestState = { id: questId, progress: quest.objectives.map(() => 0), completed: false, completions: 0 };
    this.save.quests.push(state);
    for (const [i, objective] of quest.objectives.entries()) {
      if (objective.kind === "collect") state.progress[i] = Math.min(objective.count, this.countItem(objective.itemId));
      if (objective.kind === "visit" && objective.zone === this.save.zone) state.progress[i] = 1;
    }
    this.refreshQuestCompletion(state);
    this.emit({ type: "quest", questId, text: `Quest accepted: ${quest.name}.` });
    this.emit({ type: "log", text: `Quest accepted: ${quest.name}.`, tone: "quest" });
    return true;
  }

  turnInQuest(questId: string): boolean {
    const quest = QUESTS[questId];
    if (!quest) return false;
    const state = this.save.quests.find((q) => q.id === questId);
    if (!state) return false;
    if (!state.completed) {
      this.refreshQuestCompletion(state);
      if (!state.completed) return false;
    }
    if (quest.objectives.some((o) => o.kind === "collect")) {
      for (const objective of quest.objectives) {
        if (objective.kind === "collect" && !this.removeItem(objective.itemId, objective.count)) {
          this.emit({ type: "log", text: `You still need ${objective.count}x ${getItem(objective.itemId).name}.`, tone: "bad" });
          return false;
        }
      }
    }
    this.save.gold += quest.rewards.gold;
    this.emit({ type: "gold", amount: quest.rewards.gold });
    this.gainXp(quest.rewards.xp);
    for (const reward of quest.rewards.items ?? []) {
      const leftover = this.addItem(reward.itemId, reward.qty);
      if (leftover > 0) {
        this.loot.push({ uid: this.nextUid("l"), itemId: reward.itemId, qty: leftover, x: this.save.x, y: this.save.y, ttl: 120 });
      }
    }
    state.completions += 1;
    if (quest.repeatable) {
      state.completed = false;
      state.progress = quest.objectives.map(() => 0);
    } else {
      state.completed = true;
    }
    this.emit({ type: "quest", questId, text: `Quest turned in: ${quest.name}.` });
    this.emit({ type: "log", text: `Turned in ${quest.name}. Earned ${quest.rewards.gold} gold and ${quest.rewards.xp} XP.`, tone: "good" });
    return true;
  }

  /** Hatch the saved egg companion once. Returns false if there is no unhatched egg. */
  hatchCompanion(): boolean {
    const companion = this.save.companion;
    if (!companion || companion.hatched) return false;
    companion.hatched = true;
    this.emit({ type: "log", text: "Your egg hatched! A small hatchling now follows you.", tone: "good" });
    return true;
  }

  pickQuestReward(questId: string, index: number): boolean {
    const quest = QUESTS[questId];
    if (!quest?.choose) return false;
    const reward = quest.choose[index];
    if (!reward) return false;
    const state = this.save.quests.find((q) => q.id === questId);
    if (!state || !state.completed) return false;
    this.save.gold += reward.gold;
    this.emit({ type: "gold", amount: reward.gold });
    this.gainXp(reward.xp);
    for (const item of reward.items ?? []) {
      const leftover = this.addItem(item.itemId, item.qty);
      if (leftover > 0) {
        this.loot.push({ uid: this.nextUid("l"), itemId: item.itemId, qty: leftover, x: this.save.x, y: this.save.y, ttl: 120 });
      }
    }
    this.emit({ type: "log", text: `${quest.name}: you chose your reward.`, tone: "good" });
    if (questId === "forest_keeper_gift" && !this.save.companion) {
      const species = this.rng.pick(PET_SPECIES);
      this.save.companion = { kind: "egg", name: "Forest Egg", species: species.id };
      this.emit({ type: "log", text: "A warm egg has joined you. It will hatch in time.", tone: "good" });
    }
    return true;
  }

  /** Pick a dialogue choice with an NPC. Changes that NPC's standing and gives a small reward. */
  pickNpcChoice(npcId: string, choice: "kind" | "rude"): boolean {
    if (!npcId || (choice !== "kind" && choice !== "rude")) return false;
    const relationships = this.save.relationships;
    const current = relationships[npcId] ?? 0;
    if (choice === "kind") {
      relationships[npcId] = Math.min(10, current + 1);
      this.save.gold += 5;
      this.emit({ type: "gold", amount: 5 });
      this.emit({ type: "log", text: "They appreciate your kindness. +5 gold.", tone: "good" });
    } else {
      relationships[npcId] = Math.max(-10, current - 1);
      this.emit({ type: "log", text: "They remember that. Their trust drops a little.", tone: "bad" });
    }
    return true;
  }

  findInteractable(): InteractResult | null {
    if (this.dead) return null;
    let best: InteractResult | null = null;
    let bestD = INTERACT_RANGE * INTERACT_RANGE;
    const consider = (x: number, y: number, result: InteractResult) => {
      const d = dist2(this.save.x, this.save.y, x, y);
      if (d <= bestD) {
        bestD = d;
        best = result;
      }
    };
    for (const npc of this.zone.npcs) {
      const def = NPCS[npc.id];
      if (!def) continue;
      consider(npc.x, npc.y, { kind: "npc", id: npc.id, label: def.name });
    }
    for (const portal of this.zone.portals) {
      const cx = portal.x + portal.w / 2;
      const cy = portal.y + portal.h / 2;
      const inside = this.save.x >= portal.x && this.save.x <= portal.x + portal.w && this.save.y >= portal.y && this.save.y <= portal.y + portal.h;
      if (inside || dist2(this.save.x, this.save.y, cx, cy) <= INTERACT_RANGE * INTERACT_RANGE) {
        consider(cx, cy, { kind: "portal", id: portal.id, label: portal.label });
      }
    }
    for (const chest of this.zone.chests) {
      if (this.save.openedChests.includes(chest.id)) continue;
      consider(chest.x, chest.y, { kind: "chest", id: chest.id, label: "Open chest" });
    }
    for (const node of this.zone.gatherNodes) {
      if (this.gathered.has(node.id)) continue;
      const def = ITEMS[node.itemId];
      consider(node.x, node.y, { kind: "gather", id: node.id, label: `Gather ${def?.name ?? "herb"}` });
    }
    return best;
  }

  interact(): InteractResult | null {
    const target = this.findInteractable();
    if (!target) return null;
    if (target.kind === "portal") {
      const portal = this.zone.portals.find((p) => p.id === target.id);
      if (portal) this.travel(portal);
    } else if (target.kind === "chest") {
      this.openChest(target.id);
    } else if (target.kind === "gather") {
      this.gatherNode(target.id);
    } else {
      this.emit({ type: "interact", kind: "npc", id: target.id });
    }
    return target;
  }

  private travel(portal: PortalDef): void {
    this.save.zone = portal.targetZone;
    this.save.x = portal.targetX;
    this.save.y = portal.targetY;
    this.loadZone();
    this.emit({ type: "zone", zone: this.save.zone });
    this.emit({ type: "log", text: `Entered ${ZONES[this.save.zone].name}.`, tone: "info" });
    for (const state of this.save.quests) {
      if (state.completed) continue;
      const quest = QUESTS[state.id];
      if (!quest) continue;
      quest.objectives.forEach((objective, i) => {
        if (objective.kind === "visit" && objective.zone === this.save.zone) state.progress[i] = 1;
      });
      this.refreshQuestCompletion(state);
    }
  }

  private openChest(id: string): void {
    const chest = this.zone.chests.find((c) => c.id === id);
    if (!chest) return;
    if (this.save.openedChests.includes(id)) return;
    this.save.openedChests.push(id);
    const gold = this.save.zone === "dungeon" ? this.rng.int(90, 170) : this.rng.int(45, 90);
    this.save.gold += gold;
    this.emit({ type: "gold", amount: gold });
    const items: ItemStack[] = this.save.zone === "dungeon"
      ? [{ itemId: "greater_health_potion", qty: 1 }, { itemId: "iron_ore", qty: this.rng.int(1, 3) }]
      : [{ itemId: "health_potion", qty: 2 }, { itemId: "herb", qty: this.rng.int(1, 2) }];
    if (this.rng.chance(0.35)) items.push({ itemId: "gemstone", qty: 1 });
    for (const item of items) {
      const leftover = this.addItem(item.itemId, item.qty);
      if (leftover > 0) this.loot.push({ uid: this.nextUid("l"), itemId: item.itemId, qty: leftover, x: chest.x, y: chest.y, ttl: 120 });
      this.emit({ type: "loot", itemId: item.itemId, qty: item.qty - leftover, x: chest.x, y: chest.y });
    }
    this.emit({ type: "log", text: `Opened a chest: ${gold} gold and supplies.`, tone: "good" });
  }

  private gatherNode(id: string): void {
    const node = this.zone.gatherNodes.find((n) => n.id === id);
    if (!node || this.gathered.has(id)) return;
    const leftover = this.addItem(node.itemId, 1);
    if (leftover > 0) {
      this.emit({ type: "log", text: "Your inventory is full.", tone: "bad" });
      return;
    }
    this.gathered.add(id);
    const def = ITEMS[node.itemId];
    this.emit({ type: "pickup", itemId: node.itemId, qty: 1 });
    this.emit({ type: "log", text: `Gathered ${def?.name ?? "an herb"}.`, tone: "good" });
  }

  npcById(id: string): NpcSpawn | undefined {
    return this.zone.npcs.find((n) => n.id === id);
  }

  portalById(id: string): PortalDef | undefined {
    return this.zone.portals.find((p) => p.id === id);
  }

  chestById(id: string): ChestSpawn | undefined {
    return this.zone.chests.find((c) => c.id === id);
  }

  gatherById(id: string): GatherSpawn | undefined {
    return this.zone.gatherNodes.find((g) => g.id === id);
  }

  snapshot(): CharacterSave {
    this.clampSave();
    this.save.updatedAt = Date.now();
    this.save.zone = this.zone.id;
    return cloneSave(this.save);
  }
}
