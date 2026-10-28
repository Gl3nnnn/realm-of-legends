import {
  COMBAT_TIMEOUT,
  DODGE_COOLDOWN,
  DODGE_DURATION,
  DODGE_INVULN,
  DODGE_SPEED,
  INTERACT_RANGE,
  PICKUP_RANGE,
  PERFECT_DODGE_WINDOW,
  PLAYER_RADIUS,
  POTION_COOLDOWN,
  RESOURCE_LABELS,
} from "../constants";
import { getClass } from "../data/classes";
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
import { getMonster } from "../data/monsters";
import { HEAL_COST_PER_HP, HEAL_MIN_COST, NPCS, SHOPS } from "../data/npcs";
import { CLASS_INTROS, NG_PLUS_OPENINGS } from "../data/story";
import {
  getTalentChoice,
  talentBonuses,
  talentAbilityModifiers as computeTalentAbilityModifiers,
  talentModifiers as computeTalentModifiers,
  talentTierChosen,
  type TalentModifiers,
} from "../data/talents";
import { getZone, ZONES } from "../generated/world-data";
import { deriveStats, isAbilityUnlocked, rageDecayPerSecond, resourceRegen, unlockedAbilities, xpToNext, type DerivedStats } from "../progression";
import { Rng } from "../rng";
import { dist2, length, normalize, segmentDistanceSquared } from "./geometry";
import { travel, openChest, gatherNode } from "./world";
import { killPlayer, respawn, respawnMonster } from "./death";
import * as combat from "./combat";
import * as abilities from "./abilities";
import * as quests from "./quests";
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

export const DAMAGE_COLORS: Record<DamageType, string> = {
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

export class GameSession {
  readonly save: CharacterSave;
  zone: ZoneData;
  monsters: MonsterInstance[] = [];
  pets: PetInstance[] = [];
  hatchlingAttackTimer = 0;
  hatchlingHitting = false;
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
  perfectDodgeTimer = 0;
  potionCooldown = 0;
  dead = false;
  respawnTimer = 0;
  facing: Direction = "down";
  moving = false;
  animationTime = 0;
  elapsed = 0;

  events: SimEvent[] = [];
  rng: Rng;
  uidCounter = 1;
  readonly classDef: ClassDef;
  lastCombat = -999;
  gathered = new Set<string>();
  questSurvivalElapsed = new Map<string, number>();
  lastAim: Vec2 = { x: 0, y: 1 };
  dodgeDir: Vec2 = { x: 0, y: 1 };
  lastImmuneEvent = -999;

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

  get abilityTalentModifiers(): ReturnType<typeof computeTalentAbilityModifiers> {
    return computeTalentAbilityModifiers(this.save.classId, this.save.talents);
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
    for (const monster of this.monsters) {
      const def = getMonster(monster.defId);
      const previousMaxHp = monster.maxHp ?? def.maxHp;
      const nextMaxHp = Math.max(1, Math.round(def.maxHp * this.difficultyScale.hp * (monster.elite ? 1.6 : 1)));
      monster.hp = monster.state === "dead" ? 0 : Math.max(1, Math.round(monster.hp / previousMaxHp * nextMaxHp));
      monster.maxHp = nextMaxHp;
    }
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
    this.save.gatherCooldowns = {};
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

  nextUid(prefix: string): string {
    this.uidCounter += 1;
    return `${prefix}_${this.uidCounter}`;
  }

  emit(event: SimEvent): void {
    this.events.push(event);
  }

  drainEvents(): SimEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  loadZone(): void {
    const zone = getZone(this.save.zone);
    this.zone = zone;
    this.monsters = zone.monsterSpawns
      .filter((spawn) => !(getMonster(spawn.id).boss && this.save.defeatedBosses.includes(spawn.id)))
      .map((spawn) => this.makeMonster(spawn));
    this.traps = zone.traps.map((trap) => ({
      uid: trap.id,
      x: trap.x,
      y: trap.y,
      radius: trap.radius,
      damage: trap.damage,
      kind: "hazard",
      armed: true,
      rearmTimer: 0,
      rearmDelay: trap.cooldown,
    }));
    this.projectiles = [];
    this.pets = [];
    this.loot = [];
    this.telegraphs = [];
    this.statuses = [];
    this.buffs = [];
    this.gathered = new Set(zone.gatherNodes
      .filter((node) => (this.save.gatherCooldowns[`${zone.id}:${node.id}`] ?? 0) > this.save.playtime)
      .map((node) => node.id));
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

  hasLineOfSight(fromX: number, fromY: number, toX: number, toY: number): boolean {
    const distance = length(toX - fromX, toY - fromY);
    const steps = Math.ceil(distance / 8);
    for (let i = 1; i < steps; i += 1) {
      const progress = i / steps;
      if (this.isBlockedAt(fromX + (toX - fromX) * progress, fromY + (toY - fromY) * progress, 2)) return false;
    }
    return true;
  }

  pushMonster(monster: MonsterInstance, dx: number, dy: number): void {
    const distance = length(dx, dy);
    const steps = Math.max(1, Math.ceil(distance / 4));
    const stepX = dx / steps;
    const stepY = dy / steps;
    const radius = getMonster(monster.defId).radius;
    for (let i = 0; i < steps; i += 1) {
      const canMoveX = !this.isBlockedAt(monster.x + stepX, monster.y, radius);
      const canMoveY = !this.isBlockedAt(monster.x, monster.y + stepY, radius);
      if (canMoveX) monster.x += stepX;
      if (canMoveY) monster.y += stepY;
      if (!canMoveX && !canMoveY) break;
    }
  }

  // Pushes a monster gently away from any other living monster standing too close,
  // so a crowd spreads out instead of stacking on one spot.
  private separationFrom(self: MonsterInstance, radius: number): { x: number; y: number } {
    let px = 0;
    let py = 0;
    const gap = radius * 2.2;
    for (const other of this.monsters) {
      if (other === self || other.state === "dead") continue;
      const dx = self.x - other.x;
      const dy = self.y - other.y;
      const d = length(dx, dy);
      if (d <= 0 || d >= gap) continue;
      const weight = (gap - d) / gap;
      px += (dx / d) * weight;
      py += (dy / d) * weight;
    }
    const m = length(px, py);
    if (m === 0) return { x: 0, y: 0 };
    const strength = Math.min(1, m) * 0.6;
    return { x: (px / m) * strength, y: (py / m) * strength };
  }

  // When the straight line to the target is blocked by a wall, pick the nearby
  // direction that gets closest to the target without being blocked, so monsters
  // walk round obstacles instead of sliding into them.
  private routeAround(
    entity: { x: number; y: number },
    target: { x: number; y: number },
    radius: number,
  ): { x: number; y: number } {
    const dir = normalize(target.x - entity.x, target.y - entity.y);
    const step = radius * 1.5;
    if (!this.isBlockedAt(entity.x + dir.x * step, entity.y + dir.y * step, radius)) return dir;
    let best = { x: 0, y: 0 };
    let bestDist = dist2(entity.x, entity.y, target.x, target.y);
    for (let i = 0; i < 16; i += 1) {
      const angle = (i / 16) * Math.PI * 2;
      const cx = Math.cos(angle);
      const cy = Math.sin(angle);
      const nx = entity.x + cx * step;
      const ny = entity.y + cy * step;
      if (this.isBlockedAt(nx, ny, radius)) continue;
      const d = dist2(nx, ny, target.x, target.y);
      if (d < bestDist) {
        bestDist = d;
        best = { x: cx, y: cy };
      }
    }
    return best;
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
    for (const node of this.zone.gatherNodes) {
      const key = `${this.zone.id}:${node.id}`;
      if ((this.save.gatherCooldowns[key] ?? 0) <= this.save.playtime) {
        delete this.save.gatherCooldowns[key];
        this.gathered.delete(node.id);
      }
    }
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
    quests.advanceSurvival(this, clamped);
    this.updatePets(clamped);
    this.updateHatchling(clamped);
    this.updateProjectiles(clamped);
    this.updateTraps(clamped);
    this.updateTelegraphs(clamped);
    this.perfectDodgeTimer = Math.max(0, this.perfectDodgeTimer - clamped);
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
      const stunned = monster.statuses.some((s) => s.kind === "stun");
      const slowed = monster.statuses.find((s) => s.kind === "slow");
      const marked = monster.statuses.some((s) => s.kind === "mark");
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
          if (def.role && playerDist < def.attackRange * 0.55) {
            const away = normalize(monster.x - player.x, monster.y - player.y);
            const sep = this.separationFrom(monster, def.radius);
            this.moveEntity(monster, (away.x + sep.x) * speed * dt, (away.y + sep.y) * speed * dt, def.radius);
            monster.facing = away.x >= 0 ? 1 : -1;
          } else {
            monster.state = "attack";
          }
        } else {
          const dir = this.routeAround(monster, player, def.radius);
          const sep = this.separationFrom(monster, def.radius);
          this.moveEntity(monster, (dir.x + sep.x) * speed * dt, (dir.y + sep.y) * speed * dt, def.radius);
          monster.facing = dir.x >= 0 ? 1 : -1;
          if (leashDist > def.leashRadius * 1.4) monster.state = "return";
        }
      }

      if (monster.state === "attack") {
        if (playerDist > def.attackRange + PLAYER_RADIUS + 12 || (def.role && playerDist < def.attackRange * 0.45)) {
          monster.state = "chase";
        } else if (!this.hasLineOfSight(monster.x, monster.y, player.x, player.y)) {
          monster.state = "chase";
        } else if (monster.attackTimer <= 0) {
          monster.attackTimer = def.attackCooldown;
          const raw = def.attack * this.difficultyScale.attack * this.rng.between(0.85, 1.15) * (marked ? 1.2 : 1);
          if (def.role === "support") {
            const ally = this.monsters
              .filter((candidate) =>
                candidate !== monster
                && candidate.state !== "dead"
                && length(candidate.x - monster.x, candidate.y - monster.y) <= 120
                && this.hasLineOfSight(monster.x, monster.y, candidate.x, candidate.y))
              .sort((a, b) => a.hp / (a.maxHp ?? getMonster(a.defId).maxHp) - b.hp / (b.maxHp ?? getMonster(b.defId).maxHp))[0];
            if (ally) {
              const maxHp = ally.maxHp ?? getMonster(ally.defId).maxHp;
              if (ally.hp < maxHp) {
                ally.hp = Math.min(maxHp, ally.hp + Math.max(1, Math.round(maxHp * 0.12)));
                this.emit({ type: "log", text: `${def.name} mends a nearby ally.`, tone: "bad" });
              } else {
                this.spawnTelegraph(monster.x, monster.y, def.attackRange, raw, 0.75, "line", Math.atan2(player.y - monster.y, player.x - monster.x), def.name, "enemy", monster.uid);
              }
            } else {
              this.spawnTelegraph(monster.x, monster.y, def.attackRange, raw, 0.75, "line", Math.atan2(player.y - monster.y, player.x - monster.x), def.name, "enemy", monster.uid);
            }
          } else if (def.role === "ranged") {
            this.spawnTelegraph(monster.x, monster.y, def.attackRange, raw, 0.75, "line", Math.atan2(player.y - monster.y, player.x - monster.x), def.name, "enemy", monster.uid);
          } else {
            const poison = monster.elite === "venomous"
              ? { kind: "poison" as const, remaining: 3, value: def.attack * 0.12 }
              : undefined;
            this.spawnTelegraph(player.x, player.y, 26, raw, 0.4, "spot", 0, def.name, "enemy", monster.uid, poison);
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
        const phase = monster.phase ?? 0;
        this.spawnTelegraph(player.x, player.y, 62 + phase * 8, def.attack * this.difficultyScale.attack * (1.8 + phase * 0.2), 1.25 - phase * 0.15, this.bossShape(def.id, phase), Math.atan2(player.y - monster.y, player.x - monster.x), def.name, "boss", monster.uid);
      }

      if (def.boss) {
        const maxHp = monster.maxHp ?? def.maxHp;
        const nextPhase = monster.hp / maxHp <= 0.33 ? 2 : monster.hp / maxHp <= 0.66 ? 1 : 0;
        if (nextPhase > (monster.phase ?? 0)) {
          monster.phase = nextPhase;
          monster.attackTimer = Math.max(monster.attackTimer, 0.8);
          this.emit({ type: "log", text: `${def.name} enters phase ${nextPhase + 1}!`, tone: "bad" });
          this.spawnTelegraph(player.x, player.y, 74 + nextPhase * 12, def.attack * this.difficultyScale.attack * (2.2 + nextPhase * 0.25), Math.max(0.8, 1.5 - nextPhase * 0.2), this.bossShape(def.id, nextPhase), Math.atan2(player.y - monster.y, player.x - monster.x), def.name, "boss", monster.uid);
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

  private bossShape(bossId: string, phase: number): "ring" | "line" | "cone" | "spot" {
    const shapes: Record<string, ("ring" | "line" | "cone" | "spot")[]> = {
      bone_warden: ["cone", "line", "ring"],
      miremother: ["spot", "cone", "ring"],
      ice_revenant: ["ring", "line", "cone"],
      hollow_king: ["line", "ring", "spot"],
    };
    const list = shapes[bossId] ?? ["ring", "cone"];
    return list[Math.min(phase, list.length - 1)]!;
  }

  private spawnTelegraph(
    x: number,
    y: number,
    radius: number,
    damage: number,
    delay: number,
    shape: "ring" | "line" | "cone" | "spot" = "ring",
    angle = 0,
    source = "Bone Warden",
    kind: TelegraphInstance["kind"] = "boss",
    sourceUid?: string,
    statusEffect?: TelegraphInstance["statusEffect"],
  ): void {
    const telegraph: TelegraphInstance = {
      uid: this.nextUid("t"),
      x,
      y,
      radius,
      remaining: delay,
      total: delay,
      damage,
      kind,
      shape,
      angle,
      source,
      sourceUid,
      statusEffect,
    };
    this.telegraphs.push(telegraph);
    this.emit({ type: "telegraph", x, y, radius, remaining: delay, shape, angle });
  }

  private updateTelegraphs(dt: number): void {
    for (const telegraph of this.telegraphs) {
      telegraph.remaining -= dt;
      if (telegraph.remaining <= 0) {
        const source = telegraph.sourceUid ? this.monsters.find((monster) => monster.uid === telegraph.sourceUid) : undefined;
        if (source?.state === "dead") continue;
        if (this.telegraphHits(telegraph)) {
          const wasInvulnerable = this.invulnerable > 0;
          this.damagePlayer(telegraph.damage, telegraph.source ?? "Bone Warden");
          if (!wasInvulnerable && !this.dead && telegraph.statusEffect) {
            const existing = this.statuses.find((status) => status.kind === telegraph.statusEffect?.kind);
            if (existing) {
              existing.remaining = Math.max(existing.remaining, telegraph.statusEffect.remaining);
              existing.value = Math.max(existing.value, telegraph.statusEffect.value);
            } else {
              this.statuses.push({ ...telegraph.statusEffect });
            }
          }
        }
      }
    }
    this.telegraphs = this.telegraphs.filter((telegraph) =>
      telegraph.remaining > 0
      && !this.monsters.some((monster) => monster.uid === telegraph.sourceUid && monster.state === "dead"));
  }

  private telegraphHits(t: TelegraphInstance): boolean {
    const px = this.save.x;
    const py = this.save.y;
    const shape = t.shape ?? "ring";
    if (shape === "ring" || shape === "spot") {
      return dist2(px, py, t.x, t.y) <= (t.radius + PLAYER_RADIUS) ** 2;
    }
    const dx = px - t.x;
    const dy = py - t.y;
    if (shape === "cone") {
      const distance = Math.hypot(dx, dy);
      if (distance > t.radius + PLAYER_RADIUS) return false;
      const a = Math.atan2(dy, dx);
      let diff = Math.abs(a - (t.angle ?? 0));
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      return diff <= Math.PI / 4 + Math.asin(Math.min(1, PLAYER_RADIUS / Math.max(distance, PLAYER_RADIUS)));
    }
    // line: a thin strip reaching out from the boss along its angle
    const cos = Math.cos(t.angle ?? 0);
    const sin = Math.sin(t.angle ?? 0);
    const along = dx * cos + dy * sin;
    const across = -dx * sin + dy * cos;
    return along >= -PLAYER_RADIUS && along <= t.radius + PLAYER_RADIUS && Math.abs(across) <= 14 + PLAYER_RADIUS;
  }

  private updateTraps(dt: number): void {
    for (const trap of this.traps) {
      if (trap.kind === "snare") {
        if (!trap.armed) continue;
        const target = this.monsters.find((monster) =>
          monster.state !== "dead"
          && dist2(monster.x, monster.y, trap.x, trap.y) <= (trap.radius + getMonster(monster.defId).radius) ** 2);
        if (target) {
          this.hitMonster(target, trap.damage, false, "physical", trap.statusEffect ? [trap.statusEffect] : []);
          trap.armed = false;
        }
        continue;
      }
      if (trap.rearmTimer > 0) {
        trap.rearmTimer -= dt;
        if (trap.rearmTimer <= 0) trap.armed = true;
        continue;
      }
      if (!trap.armed) continue;
      if (dist2(this.save.x, this.save.y, trap.x, trap.y) <= trap.radius * trap.radius) {
        this.damagePlayer(trap.damage, "Ancient Trap");
        trap.armed = false;
        trap.rearmTimer = trap.rearmDelay;
        this.emit({ type: "log", text: "A hidden trap springs!", tone: "bad" });
      }
    }
    this.traps = this.traps.filter((trap) => trap.kind !== "snare" || trap.armed);
  }

  damagePlayer(raw: number, source: string): void {
    combat.damagePlayer(this, raw, source);
  }

  killPlayer(source: string): void {
    killPlayer(this, source);
  }

  private respawn(): void {
    respawn(this);
  }

  private respawnMonster(monster: MonsterInstance): void {
    respawnMonster(this, monster);
  }

  private killMonster(monster: MonsterInstance): void {
    combat.killMonster(this, monster);
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
      const startX = projectile.x;
      const startY = projectile.y;
      const endX = startX + projectile.dirX * projectile.speed * dt;
      const endY = startY + projectile.dirY * projectile.speed * dt;
      const steps = Math.max(1, Math.ceil(length(endX - startX, endY - startY) / 4));
      for (let step = 1; step <= steps && projectile.ttl > 0; step += 1) {
        const progress = step / steps;
        const previousProgress = (step - 1) / steps;
        const x = startX + (endX - startX) * progress;
        const y = startY + (endY - startY) * progress;
        if (this.isBlockedAt(x, y, projectile.radius)) {
          projectile.ttl = 0;
          this.logArrowMiss(projectile);
          break;
        }
        for (const monster of this.monsters) {
          if (monster.state === "dead") continue;
          const def = getMonster(monster.defId);
          const segmentStartX = startX + (endX - startX) * previousProgress;
          const segmentStartY = startY + (endY - startY) * previousProgress;
          if (segmentDistanceSquared(monster.x, monster.y, segmentStartX, segmentStartY, x, y) <= (projectile.radius + def.radius) ** 2) {
            projectile.x = x;
            projectile.y = y;
            this.hitMonster(monster, projectile.damage, projectile.crit > 0, projectile.damageType, projectile.statuses);
            projectile.hit = true;
            projectile.ttl = 0;
            break;
          }
        }
      }
      if (projectile.ttl > 0) {
        projectile.x = endX;
        projectile.y = endY;
      }
      if (projectile.ttl <= 0 && !projectile.hit && !projectile.missLogged) {
        this.logArrowMiss(projectile);
      }
    }
    this.projectiles = this.projectiles.filter((p) => p.ttl > 0);
  }

  private logArrowMiss(projectile: ProjectileInstance): void {
    if (projectile.hit || projectile.missLogged) return;
    projectile.missLogged = true;
    const name = projectile.abilityName ?? "Your arrow";
    this.emit({ type: "log", text: `${name} missed: no enemy was hit.`, tone: "info" });
  }

  private updateLoot(dt: number): void {
    for (const drop of this.loot) {
      drop.ttl -= dt;
      if (dist2(this.save.x, this.save.y, drop.x, drop.y) <= PICKUP_RANGE * PICKUP_RANGE) {
        const leftover = this.addItem(drop.itemId, drop.qty, drop.instance);
        const collected = drop.qty - leftover;
        if (collected > 0) {
          this.emit({ type: "pickup", itemId: drop.itemId, qty: collected });
          if (leftover === 0) drop.ttl = 0;
          else drop.qty = leftover;
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

  hitMonster(monster: MonsterInstance, raw: number, crit: boolean, damageType: DamageType, statuses: StatusInstance[]): void {
    combat.hitMonster(this, monster, raw, crit, damageType, statuses);
  }

  gainXp(amount: number): void {
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
    // Face the aim for every skill, so ranged casts turn the character the same way melee does.
    if (dir.x !== 0 || dir.y !== 0) {
      if (Math.abs(dir.x) > Math.abs(dir.y)) this.facing = dir.x > 0 ? "right" : "left";
      else this.facing = dir.y > 0 ? "down" : "up";
    }
    this.save.resource -= ability.cost;
    const abilityCooldown = this.abilityTalentModifiers[id]?.cooldownPercent ?? 0;
    this.cooldowns[id] = ability.cooldown * (1 - this.modifiers.cooldown / 100) * (1 - abilityCooldown / 100);
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

  statusesFromEffects(effects: AbilityEffect[], damageType: DamageType): StatusInstance[] {
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

  /** Rolls damage and the critical hit once. The same result drives the damage and the crit indicator. */
  effectDamage(effect: AbilityEffect, abilityId?: string): { damage: number; crit: boolean } {
    const stats = this.stats;
    const raw = (effect.amount ?? 0) + (effect.scaling ?? 0) * stats.attack;
    const crit = this.rng.chance(stats.crit);
    const abilityDamage = abilityId ? this.abilityTalentModifiers[abilityId]?.damagePercent ?? 0 : 0;
    const damage = Math.round(raw * (1 + abilityDamage / 100) * (crit ? 1.8 + this.modifiers.critDamage / 100 : 1) * this.rng.between(0.9, 1.1)) + (crit ? 1 : 0);
    return { damage, crit };
  }

  castDirection(ability: AbilityDef, dir: Vec2): void {
    abilities.castDirection(this, ability, dir);
  }

  castPoint(ability: AbilityDef, point: Vec2): void {
    abilities.castPoint(this, ability, point);
  }

  castSelf(ability: AbilityDef): void {
    abilities.castSelf(this, ability);
  }

  castMelee(ability: AbilityDef, dir: Vec2): void {
    abilities.castMelee(this, ability, dir);
  }

  applyEffects(ability: AbilityDef, targets: MonsterInstance[], center: Vec2): void {
    abilities.applyEffects(this, ability, targets, center);
  }

  dash(distance: number): void {
    abilities.dash(this, distance);
  }

  summon(effect: AbilityEffect): void {
    abilities.summon(this, effect);
  }

  placeTrap(effect: AbilityEffect, center: Vec2): void {
    abilities.placeTrap(this, effect, center);
  }

  healPlayer(amount: number): void {
    if (this.dead) return;
    const stats = this.stats;
    const before = this.save.hp;
    this.save.hp = Math.min(stats.maxHp, this.save.hp + amount);
    const healed = Math.round(this.save.hp - before);
    if (healed > 0) this.emit({ type: "heal", amount: healed, x: this.save.x, y: this.save.y });
  }

  recordKill(monsterId: string): void {
    quests.recordKill(this, monsterId);
  }

  refreshQuestCompletion(state: QuestState): void {
    quests.refreshQuestCompletion(this, state);
  }

  refreshCollectQuests(): void {
    quests.refreshCollectQuests(this);
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
    this.perfectDodgeTimer = PERFECT_DODGE_WINDOW;
    this.dodgeCooldown = DODGE_COOLDOWN;
    const shieldOnDodge = this.modifiers.shieldOnDodge;
    if (shieldOnDodge > 0) this.shield += shieldOnDodge;
    if (Math.abs(dir.x) > Math.abs(dir.y)) this.facing = dir.x > 0 ? "right" : "left";
    else this.facing = dir.y > 0 ? "down" : "up";
    this.emit({ type: "dodge", x: this.save.x, y: this.save.y });
    return true;
  }

  rewardPerfectDodge(): void {
    this.save.resource = Math.min(this.stats.maxResource, this.save.resource + 12);
    for (const id of Object.keys(this.cooldowns)) {
      this.cooldowns[id] = Math.max(0, this.cooldowns[id] - 0.6);
    }
    this.emit({ type: "log", text: "Perfect dodge! Restore 12 resource and reduce skill cooldowns.", tone: "good" });
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
    if (this.dead) return false;
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
    this.save.equipment[type] = { ...stack, qty: 1 };
    stack.qty -= 1;
    this.save.inventory[slotIndex] = stack.qty <= 0 ? current ?? null : stack;
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
    if (!stack || !Number.isInteger(qty) || qty < 1) return false;
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
    if (!shop || !shop.itemIds.includes(itemId) || !Number.isInteger(qty) || qty < 1) return false;
    const def = getItem(itemId);
    if (!canClassUse(def, this.save.classId)) {
      this.emit({ type: "log", text: `${this.classDef.name}s cannot use ${def.name}.`, tone: "bad" });
      return false;
    }
    const amount = Math.max(1, Math.min(qty, def.stack));
    const cost = (def.buy ?? 0) * amount;
    if (!def.buy) return false;
    if (def.requiresLevel && this.save.level < def.requiresLevel) {
      this.emit({ type: "log", text: `${def.name} needs level ${def.requiresLevel}.`, tone: "bad" });
      return false;
    }
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
    const result = getItem(recipe.resultItemId);
    if (!canClassUse(result, this.save.classId)) {
      this.emit({ type: "log", text: `${this.classDef.name}s cannot use ${result.name}.`, tone: "bad" });
      return false;
    }
    for (const material of recipe.materials) this.removeItem(material.itemId, material.qty);
    if (!this.canAdd(recipe.resultItemId, 1)) {
      for (const material of recipe.materials) this.addItem(material.itemId, material.qty);
      this.emit({ type: "log", text: "Your inventory is full.", tone: "bad" });
      return false;
    }
    this.save.gold -= recipe.gold;
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
    return quests.getNpcQuestStates(this, npcId);
  }

  questUnlocked(quest: QuestDef): boolean {
    return quests.questUnlocked(this, quest);
  }

  acceptQuest(questId: string): boolean {
    return quests.acceptQuest(this, questId);
  }

  turnInQuest(questId: string): boolean {
    return quests.turnInQuest(this, questId);
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
    return quests.pickQuestReward(this, questId, index);
  }

  /** Pick a dialogue choice with an NPC. Changes that NPC's standing and gives a small reward. */
  pickNpcChoice(npcId: string, choice: "kind" | "rude"): boolean {
    if (!NPCS[npcId] || (choice !== "kind" && choice !== "rude")) return false;
    const relationships = this.save.relationships;
    const current = relationships[npcId] ?? 0;
    if (choice === "kind") {
      relationships[npcId] = Math.min(10, current + 1);
      if (!this.save.npcKindRewards.includes(npcId)) {
        this.save.npcKindRewards.push(npcId);
        this.save.gold += 5;
        this.emit({ type: "gold", amount: 5 });
        this.emit({ type: "log", text: "They appreciate your kindness. +5 gold.", tone: "good" });
      } else {
        this.emit({ type: "log", text: "They appreciate your kind words.", tone: "good" });
      }
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
      if ((this.save.gatherCooldowns[`${this.zone.id}:${node.id}`] ?? 0) > this.save.playtime) continue;
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
      if (portal) travel(this, portal);
    } else if (target.kind === "chest") {
      openChest(this, target.id);
    } else if (target.kind === "gather") {
      gatherNode(this, target.id);
    } else {
      this.emit({ type: "interact", kind: "npc", id: target.id });
    }
    return target;
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
