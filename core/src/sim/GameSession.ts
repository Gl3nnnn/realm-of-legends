import {
  COMBAT_TIMEOUT,
  AUTOLOOT_RADIUS,
  DODGE_COOLDOWN,
  DODGE_DURATION,
  DODGE_INVULN,
  DODGE_SPEED,
  INTERACT_RANGE,
  INVENTORY_SIZE,
  PICKUP_RANGE,
  PERFECT_DODGE_WINDOW,
  PLAYER_RADIUS,
  POTION_COOLDOWN,
  RESOURCE_LABELS,
  MAX_GOLD,
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
  itemStats,
} from "../data/items";
import { getMonster } from "../data/monsters";
import { HEAL_COST_PER_HP, HEAL_MIN_COST, NPCS, SHOPS } from "../data/npcs";
import { pendingAchievements, availableTitles } from "../data/achievements";
import { findReaction, REACTIONS, statusElement } from "../data/reactions";
import { masteryCostCut, masteryCooldownCut, masteryRows, rankFor, type MasteryState } from "../data/mastery";
import { writeDiary } from "./diary";
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
import { weatherFor, type WeatherState } from "./weather";
import * as bountyBoard from "./bounties";
import type { BountyDef } from "./bounties";
import { blessingDay as blessingDayOf, getBlessing } from "../data/blessings";
import { bossLore } from "../data/boss-lore";
import { isWeaknessHit, monsterWeakness, weaknessMultiplier } from "../data/weakness";
import { arenaWave } from "../data/arena";
import { DEEDS, getDeed, journeyLevelFor, journeyNextStop, journeyPointsToNext, JOURNEY_STOPS, TOTAL_DEED_POINTS } from "../data/journey";
import { pickRival, rivalFlavour, type RivalDef } from "../data/rival";
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
  ZoneId,
} from "../types";

export const DAMAGE_COLORS: Record<DamageType, string> = {
  physical: "#ffeccb",
  fire: "#ff7a2e",
  ice: "#8fe6ff",
  arcane: "#c98bff",
  holy: "#ffe27a",
  shadow: "#9a5cf0",
  nature: "#6ff09a",
  poison: "#b8f04a",
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
  shieldRemaining = 0;
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
  /** Monsters killed in a row without being hit; shown as a chip and used by achievements. */
  killStreak = 0;
  /** Seconds since the hero last took damage, so a streak can be judged fairly. */
  hurtRecently = 0;
  private achievementTimer = 0;
  /** Weather is re-rolled a few times a second rather than every frame. */
  private weatherTimer = 0;
  private weatherState: WeatherState | null = null;
  /** Set when a fresh boss notices the hero, so its warning plays once per fight. */
  private bossSeen = new Set<string>();
  /** When the hero last asked to go home; blocks the recall until the marker runs out. */
  private recallBlockedUntil = 0;
  /** The biggest hit the hero has taken recently, shown on the death screen. */
  lastHitSource = "";
  lastHitAmount = 0;
  /** Seconds since the hero's feet last moved, used to count the distance walked. */
  private walkedSinceSample = 0;
  private lastStepX = 0;
  private lastStepY = 0;
  /** Set by combat when a reaction just fired, so the next hit does not pay for it twice. */
  private lastReactionAt = -999;
  /**
   * Momentum: the chain of hits landed without taking one. It builds on every
   * landed hit, breaks the moment something lands on the hero, and pays out at
   * milestones so a clean fight feels better than a scrappy one.
   */
  combo = 0;
  /** Seconds left before the chain expires on its own. */
  comboTimer = 0;
  /** The strongest chain reached this run, for the HUD's "best" line. */
  comboBest = 0;
  /** Set on the cast that triggers the ultimate, so the HUD can flash. */
  ultimateReady = false;
  /** The Hollow Ring run in progress, or null when the hero is not in the ring. */
  arenaWaveNumber = 0;
  arenaAlive = 0;
  arenaActive = false;
  private arenaAnnounced = -1;
  private zoneStates = new Map<string, { monsters: MonsterInstance[]; loot: GroundLoot[] }>();
  private zoneLoaded = false;

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

  /**
   * A slow day-and-night clock that follows play time rather than the real clock, so a session
   * always starts in the morning and the world darkens as the hero keeps adventuring.
   * One full day is twenty minutes of play.
   */
  get dayTime(): number {
    return (0.28 + this.save.playtime / 1200) % 1;
  }

  get dayPhase(): { key: "dawn" | "day" | "dusk" | "night"; label: string; icon: string } {
    const t = this.dayTime;
    if (t < 0.22) return { key: "night", label: "Night", icon: "🌙" };
    if (t < 0.34) return { key: "dawn", label: "Dawn", icon: "🌅" };
    if (t < 0.68) return { key: "day", label: "Day", icon: "☀" };
    if (t < 0.8) return { key: "dusk", label: "Dusk", icon: "🌇" };
    return { key: "night", label: "Night", icon: "🌙" };
  }

  /** Level of the hatched companion, earned from the experience it shares with the hero. */
  get petLevel(): number {
    return Math.min(20, 1 + Math.floor(this.save.petXp / 140));
  }

  /** Experience still needed for the companion's next level, or 0 at the cap. */
  get petXpToNext(): number {
    if (this.petLevel >= 20) return 0;
    return 140 - (this.save.petXp % 140);
  }

  /** How much the companion's own hits grow with its level. */
  get petPower(): number {
    return 1 + (this.petLevel - 1) * 0.08;
  }

  /** Standing with one villager, from -10 to 10. */
  npcTrust(npcId: string): number {
    return Math.max(-10, Math.min(10, this.save.relationships[npcId] ?? 0));
  }

  /**
   * Trust turns into a real discount: every two points of standing with the villager who
   * keeps the shop or the shrine knocks 5% off, to a maximum of 15%.
   */
  private trustPercent(kind: "shop" | "heal"): number {
    let best = 0;
    for (const [id, def] of Object.entries(NPCS)) {
      if (kind === "heal" && !def.healer) continue;
      if (kind === "shop" && !def.shop) continue;
      best = Math.max(best, this.npcTrust(id));
    }
    return Math.min(15, Math.max(0, Math.floor(best / 2) * 5));
  }

  /** Percent off shop prices, earned by being kind to the merchant. */
  get shopDiscountPercent(): number {
    return this.trustPercent("shop");
  }

  /** Percent off healing at the shrine, earned by being kind to the healer. */
  get healDiscountPercent(): number {
    return this.trustPercent("heal");
  }

  /** Titles the hero may wear right now. */
  get titles(): string[] {
    return availableTitles(this.save);
  }

  /** The weather over the hero's head right now, and what it is doing to them. */
  get weather(): WeatherState {
    if (!this.weatherState) this.weatherState = weatherFor(this.zone.id, this.save.playtime);
    return this.weatherState;
  }

  /** How much faster or slower the hero moves because of the sky. */
  get weatherMoveBonus(): number {
    return this.weather.effects.moveSpeed;
  }

  /** The three jobs on the bounty board right now. */
  get bounties(): BountyDef[] {
    return bountyBoard.currentBounties(this.save);
  }

  /** Bounty progress for one job, already capped at what it needs. */
  bountyProgress(key: string): number {
    return bountyBoard.bountyProgress(this.save, key);
  }

  /** Bounties finished and waiting to be collected. */
  get readyBountyCount(): number {
    return bountyBoard.readyBounties(this.save, this.bounties);
  }

  /**
   * Take the purse for a finished bounty. The reward grows with the streak of bounties
   * turned in without dying, so a careful run pays better than a reckless one.
   */
  claimBounty(key: string): boolean {
    const bounty = this.bounties.find((entry) => entry.key === key);
    if (!bounty) return false;
    if (this.bountyProgress(key) < bounty.need) {
      this.emit({ type: "log", text: `That bounty needs ${bounty.need} ${bounty.monsterName} kills.`, tone: "info" });
      return false;
    }
    if (!bountyBoard.markBountyClaimed(this.save, key, bounty.need)) return false;
    const bonus = 1 + Math.min(0.5, this.save.bountyStreak * 0.1);
    const gold = this.gainGold(Math.round(bounty.gold * bonus));
    this.gainXp(Math.round(bounty.xp * bonus));
    this.save.bountyStreak += 1;
    this.save.stats.bountyGold = (this.save.stats.bountyGold ?? 0) + gold;
    const streakNote = bonus > 1 ? ` (streak bonus +${Math.round((bonus - 1) * 100)}%)` : "";
    this.emit({ type: "log", text: `Bounty paid: ${gold} gold and ${Math.round(bounty.xp * bonus)} XP${streakNote}.`, tone: "good" });
    return true;
  }

  /** Which blessing this hero can still buy today, and what it costs after trust. */
  blessingStatus(): { available: boolean; reason: string; cost: number } {
    const day = blessingDayOf(this.save.playtime);
    const available = this.save.blessingDay !== day;
    return {
      available,
      reason: available ? "" : "Elara can only bless you once a day.",
      cost: this.blessingCost(),
    };
  }

  /** Blessing price after the healer's trust discount. */
  blessingCost(base = 35): number {
    const off = this.healDiscountPercent;
    return Math.max(5, Math.round(base * (1 - off / 100)));
  }

  /** Buy one shrine blessing. One per in-game day, so it stays a treat rather than a crutch. */
  buyBlessing(id: string): boolean {
    if (this.dead) return false;
    const blessing = getBlessing(id);
    if (!blessing) return false;
    const day = blessingDayOf(this.save.playtime);
    if (this.save.blessingDay === day) {
      this.emit({ type: "log", text: "Elara can only bless you once a day. Come back tomorrow.", tone: "info" });
      return false;
    }
    const cost = this.blessingCost(blessing.cost);
    if (this.save.gold < cost) {
      this.emit({ type: "log", text: `That blessing costs ${cost} gold.`, tone: "bad" });
      return false;
    }
    this.save.gold -= cost;
    this.save.blessingDay = day;
    const existing = this.buffs.find((buff) => buff.name === blessing.buff.name);
    if (existing) existing.remaining = Math.max(existing.remaining, blessing.duration);
    else this.buffs.push({ ...blessing.buff, remaining: blessing.duration });
    this.emit({ type: "log", text: `${blessing.name} settles over you for ${Math.round(blessing.duration / 60)} minutes.`, tone: "good" });
    return true;
  }

  /** Seconds of blessing left, or 0 when none is running. */
  get blessingRemaining(): number {
    return this.buffs.reduce((longest, buff) => Math.max(longest, buff.remaining), 0);
  }

  /**
   * Recall home: leave a fight behind and wake up at the village shrine. Free, instant, and
   * always available, but never during a boss fight so it cannot be used to skip one.
   */
  recallHome(): boolean {
    if (this.dead) return false;
    if (this.elapsed < this.recallBlockedUntil) {
      this.emit({ type: "log", text: "You cannot gather yourself yet. Steady your breath.", tone: "info" });
      return false;
    }
    const inBossFight = this.monsters.some((monster) => monster.state !== "dead" && getMonster(monster.defId).boss && length(this.save.x - monster.x, this.save.y - monster.y) < 320);
    if (inBossFight) {
      this.emit({ type: "log", text: "Something will not let you leave. Deal with it first.", tone: "bad" });
      return false;
    }
    if (this.save.zone === "village") {
      this.emit({ type: "log", text: "You are already home.", tone: "info" });
      return false;
    }
    const village = ZONES.village;
    this.save.zone = "village";
    this.save.x = village.spawn.x;
    this.save.y = village.spawn.y;
    this.unlockWaypoint("village");
    this.dodgeTimer = 0;
    this.loadZone();
    this.recallBlockedUntil = this.elapsed + 6;
    this.emit({ type: "zone", zone: "village" });
    this.emit({ type: "log", text: "You follow Elara's light home to Eldoria Village.", tone: "good" });
    return true;
  }

  /** Whether the recall is off its short cooldown right now. */
  get canRecall(): boolean {
    return !this.dead && this.elapsed >= this.recallBlockedUntil;
  }

  /** Put on one of the earned titles, or fall back to the default one. */
  setTitle(title: string): boolean {
    if (!this.titles.includes(title)) return false;
    if (this.save.title === title) return false;
    this.save.title = title;
    this.emit({ type: "log", text: `You now go by ${title}.`, tone: "good" });
    return true;
  }

  /**
   * Hand out any achievement the hero has just earned. Cheap enough to call a couple of
   * times a second, and it never fires the same one twice.
   */
  checkAchievements(): boolean {
    const earned = pendingAchievements(this.save);
    if (earned.length === 0) return false;
    for (const achievement of earned) {
      this.save.achievements.push(achievement.id);
      this.emit({ type: "achievement", id: achievement.id, name: achievement.name, title: achievement.title });
      writeDiary(this.save, "achievement", `Earned ${achievement.name}.`);
    }
    return true;
  }

  /** Record a kill in the streak, and remember the best one the hero ever managed. */
  bumpKillStreak(): void {
    this.killStreak += 1;
    if (this.killStreak > this.save.stats.bestStreak) this.save.stats.bestStreak = this.killStreak;
    if (this.killStreak === 5 || this.killStreak === 10 || this.killStreak % 25 === 0) {
      this.emit({ type: "log", text: `${this.killStreak} kills in a row without a scratch!`, tone: "good" });
    }
  }

  /** Any hit taken ends the clean streak. */
  resetKillStreak(): void {
    if (this.killStreak >= 5) {
      this.emit({ type: "log", text: `Your ${this.killStreak}-kill streak ends.`, tone: "info" });
    }
    this.killStreak = 0;
    this.hurtRecently = 0;
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
    const seen = new Set<string>();
    for (const monster of this.monsters) {
      seen.add(monster.uid);
      this.rescaleMonster(monster);
    }
    for (const state of this.zoneStates.values()) {
      for (const monster of state.monsters) {
        if (seen.has(monster.uid)) continue;
        seen.add(monster.uid);
        this.rescaleMonster(monster);
      }
    }
    this.emit({ type: "log", text: `Difficulty set to ${difficulty}.`, tone: "info" });
    return true;
  }

  private rescaleMonster(monster: MonsterInstance): void {
    const def = getMonster(monster.defId);
    const previousMaxHp = monster.maxHp ?? def.maxHp;
    const nextMaxHp = Math.max(1, Math.round(def.maxHp * this.difficultyScale.hp * (monster.elite ? 1.6 : 1)));
    monster.hp = monster.state === "dead" ? 0 : Math.max(1, Math.round(monster.hp / previousMaxHp * nextMaxHp));
    monster.maxHp = nextMaxHp;
  }

  canNewGamePlus(): boolean {
    return this.save.ngPlus < 99 && this.save.defeatedBosses.includes("hollow_king");
  }

  startNewGamePlus(): boolean {
    if (!this.canNewGamePlus()) {
      const message = this.save.ngPlus >= 99
        ? "New Game+ has reached the maximum cycle."
        : "Defeat the Hollow King before beginning a new cycle.";
      this.emit({ type: "log", text: message, tone: "info" });
      return false;
    }

    this.save.ngPlus += 1;
    this.save.storyChapter = 0;
    this.save.defeatedBosses = [];
    this.save.quests = [];
    this.save.openedChests = [];
    this.save.gatherCooldowns = {};
    this.save.zone = "village";
    this.zoneStates.clear();
    this.zoneLoaded = false;
    this.monsters = [];
    this.loot = [];
    this.cooldowns = {};
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
    if (this.zoneLoaded) this.zoneStates.set(this.zone.id, { monsters: this.monsters, loot: this.loot });
    const baseZone = getZone(this.save.zone);
    const zone = {
      ...baseZone,
      blocked: [...baseZone.blocked],
      portals: [...baseZone.portals],
      traps: [...baseZone.traps],
      npcs: [...baseZone.npcs],
      chests: [...baseZone.chests],
      gatherNodes: [...baseZone.gatherNodes],
      monsterSpawns: [...baseZone.monsterSpawns],
    };
    this.zone = zone;
    if (zone.id === "dungeon" && this.save.defeatedBosses.includes("bone_warden")) {
      this.openDungeonWing(false);
    }
    const savedState = this.zoneStates.get(zone.id);
    this.monsters = savedState?.monsters ?? zone.monsterSpawns
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
    this.loot = savedState?.loot ?? [];
    this.telegraphs = [];
    this.statuses = [];
    this.buffs = [];
    this.gathered = new Set(zone.gatherNodes
      .filter((node) => (this.save.gatherCooldowns[`${zone.id}:${node.id}`] ?? 0) > this.save.playtime)
      .map((node) => node.id));
    this.dead = false;
    this.respawnTimer = 0;
    this.shield = 0;
    this.shieldRemaining = 0;
    this.save.x = Math.max(8, Math.min(this.save.x, zone.width * zone.tileWidth - 8));
    this.save.y = Math.max(8, Math.min(this.save.y, zone.height * zone.tileHeight - 8));
    this.zoneLoaded = true;
  }

  openDungeonWing(emitEvent = true): void {
    if (this.zone.id !== "dungeon") return;
    const x = 37;
    const y = 21;
    const width = 1;
    const height = 3;
    for (let row = y; row < y + height; row += 1) {
      this.zone.blocked[row * this.zone.width + x] = false;
    }
    const portal = this.zone.portals.find((entry) => entry.id === "to_marsh_after_warden") ?? {
      id: "to_marsh_after_warden",
      x: 45 * this.zone.tileWidth,
      y: 21 * this.zone.tileHeight,
      w: 2 * this.zone.tileWidth,
      h: 2 * this.zone.tileHeight,
      targetZone: "marsh" as const,
      targetX: 72,
      targetY: 360,
      label: "Ashen Marsh",
    };
    if (!this.zone.portals.some((entry) => entry.id === portal.id)) this.zone.portals.push(portal);
    if (emitEvent) {
      this.emit({ type: "passage", zone: "dungeon", x, y, width, height, portal });
      this.emit({ type: "log", text: "The Bone Warden's defeat opens the eastern crypt passage to Ashen Marsh.", tone: "quest" });
    }
  }

  private makeMonster(spawn: { id: string; x: number; y: number }, uid?: string): MonsterInstance {
    const def = getMonster(spawn.id);
    const eliteChance = Math.min(0.5, 0.08 + this.save.ngPlus * 0.02);
    const elite = !def.boss && this.rng.chance(eliteChance)
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
    if (this.shieldRemaining > 0) {
      this.shieldRemaining = Math.max(0, this.shieldRemaining - clamped);
      if (this.shieldRemaining <= 1e-6) {
        this.shieldRemaining = 0;
        this.shield = 0;
      }
    }
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
    // The hit chain fades on its own if the hero stops swinging, so it cannot be banked.
    if (this.comboTimer > 0) {
      this.comboTimer = Math.max(0, this.comboTimer - clamped);
      if (this.comboTimer <= 0 && this.combo > 0) {
        this.combo = 0;
      }
    }
    this.ultimateReady = this.ultimateCharged;
    this.tickStatuses(clamped);
    this.tickBuffs(clamped);
    // The sky changes slowly; a couple of times a second is plenty.
    this.weatherTimer += clamped;
    if (this.weatherTimer >= 0.5) {
      this.weatherTimer = 0;
      this.weatherState = null;
    }

    const stats = this.stats;
    const currentStats = stats;
    const slow = this.statuses.find((s) => s.kind === "slow");
    const stunned = this.statuses.some((s) => s.kind === "stun");
    const speed = currentStats.moveSpeed * (slow ? 1 - slow.value / 100 : 1) * (1 + this.weatherMoveBonus / 100);
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
    // Distance walked, sampled once a second so it stays cheap.
    this.walkedSinceSample += clamped;
    if (this.walkedSinceSample >= 1) {
      this.walkedSinceSample = 0;
      const step = Math.hypot(this.save.x - this.lastStepX, this.save.y - this.lastStepY) / 32;
      if (step < 20) this.save.stats.distanceWalked += step;
      this.lastStepX = this.save.x;
      this.lastStepY = this.save.y;
    }
    // Achievements are checked a few times a second rather than every frame.
    this.achievementTimer += clamped;
    if (this.achievementTimer >= 0.5) {
      this.achievementTimer = 0;
      this.checkAchievements();
    }

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
    this.announceBosses();
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
    const playerDot = this.statuses
      .filter((s) => s.kind === "poison" || s.kind === "burn")
      .reduce((sum, s) => sum + s.value * Math.min(dt, Math.max(0, s.remaining)), 0);
    for (const status of this.statuses) status.remaining -= dt;
    if (playerDot > 0 && !this.dead) {
      this.save.hp = Math.max(0, this.save.hp - playerDot);
      if (this.save.hp <= 0) this.killPlayer("Venom");
    }
    this.statuses = this.statuses.filter((s) => s.remaining > 0);
    for (const monster of this.monsters) {
      if (monster.state === "dead") continue;
      const damage = monster.statuses
        .filter((s) => s.kind === "burn" || s.kind === "poison")
        .reduce((sum, s) => sum + s.value * Math.min(dt, Math.max(0, s.remaining)), 0);
      for (const status of monster.statuses) status.remaining -= dt;
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
        // Respawn timers only advance for the loaded zone; cached zones resume when re-entered.
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
        // Meeting a creature is enough to fill its bestiary page, before the first kill.
        this.noteEncounter(def.id);
      }

      if (stunned) continue;
      const speed = def.speed * (monster.elite === "swift" ? 1.3 : 1) * (slowed ? 1 - slowed.value / 100 : 1) * (1 + this.weather.effects.monsterSpeed / 100);

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
            this.spawnTelegraph(player.x, player.y, 26, raw, 0.4, "spot", 0, def.name, "enemy", monster.uid, poison, poison ? "poison" : "physical");
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
        this.spawnTelegraph(player.x, player.y, 62 + phase * 8, def.attack * this.difficultyScale.attack * (1.8 + phase * 0.2), 1.25 - phase * 0.15, this.bossShape(def.id, phase), Math.atan2(player.y - monster.y, player.x - monster.x), def.name, "boss", monster.uid, undefined, this.bossDamageType(def.id));
      }

      if (def.boss) {
        const maxHp = monster.maxHp ?? def.maxHp;
        const nextPhase = monster.hp / maxHp <= 0.33 ? 2 : monster.hp / maxHp <= 0.66 ? 1 : 0;
        if (nextPhase > (monster.phase ?? 0)) {
          monster.phase = nextPhase;
          monster.attackTimer = Math.max(monster.attackTimer, 0.8);
          this.emit({ type: "log", text: `${def.name} enters phase ${nextPhase + 1}!`, tone: "bad" });
          this.spawnTelegraph(player.x, player.y, 74 + nextPhase * 12, def.attack * this.difficultyScale.attack * (2.2 + nextPhase * 0.25), Math.max(0.8, 1.5 - nextPhase * 0.2), this.bossShape(def.id, nextPhase), Math.atan2(player.y - monster.y, player.x - monster.x), def.name, "boss", monster.uid, undefined, this.bossDamageType(def.id));
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
      frost_revenant: ["ring", "line", "cone"],
      hollow_king: ["line", "ring", "spot"],
    };
    const list = shapes[bossId] ?? ["ring", "cone"];
    return list[Math.min(phase, list.length - 1)]!;
  }

  private bossDamageType(defId: string): DamageType {
    if (defId === "miremother") return "poison";
    if (defId === "frost_revenant") return "ice";
    if (defId === "hollow_king") return "shadow";
    return "physical";
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
    damageType: DamageType = "physical",
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
      damageType,
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
          this.damagePlayer(telegraph.damage, telegraph.source ?? "Bone Warden", telegraph.damageType ?? "physical");
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

  damagePlayer(raw: number, source: string, damageType: DamageType = "physical"): void {
    combat.damagePlayer(this, raw, source, damageType);
  }

  killPlayer(source: string, killerId = ""): void {
    killPlayer(this, source, killerId);
  }

  private killMonster(monster: MonsterInstance): void {
    const def = getMonster(monster.defId);
    const wasArena = this.arenaActive;
    combat.killMonster(this, monster);
    // The rival is not a separate monster: it is one of these, wearing a grudge.
    this.settleRival(def.id);
    this.recordDeed("kills", def.boss ? 0 : 1);
    if (def.boss && this.save.defeatedBosses.includes(def.id)) this.recordDeed("bosses", 1);
    if (wasArena) this.onArenaKill();
  }

  /** Records that one deed counter went up, in every zone that counts it. */
  recordDeed(kind: "kills" | "bosses" | "chests" | "gathers" | "arena" | "quests", amount: number): void {
    if (amount <= 0) return;
    for (const deed of DEEDS) {
      if (deed.kind !== kind) continue;
      // "kills in the forest" only counts forest kills, so the zone has to match.
      if (kind !== "arena" && deed.zone !== this.save.zone) continue;
      if (this.save.deeds.includes(deed.id)) continue;
      const current = this.save.deedProgress[deed.id] ?? 0;
      const next = Math.min(deed.target, current + amount);
      this.save.deedProgress[deed.id] = next;
      if (next >= deed.target) this.finishDeed(deed.id);
    }
  }

  /** Pays a finished deed: journey points, gold and a line in the log. */
  private finishDeed(deedId: string): void {
    const deed = getDeed(deedId);
    if (!deed || this.save.deeds.includes(deed.id)) return;
    this.save.deeds.push(deed.id);
    this.save.journeyPoints += deed.points;
    this.save.stats.goldEarned += deed.gold;
    this.save.gold = Math.min(MAX_GOLD, this.save.gold + deed.gold);
    this.emit({ type: "log", text: `Deed done: ${deed.name}. +${deed.points} Journey, +${deed.gold} gold.`, tone: "good" });
    writeDiary(this.save, "quest", `Finished the deed "${deed.name}".`);
    // A finished deed can push the journey over the next stop, so check it right away.
    this.checkJourneyStop();
    this.checkAchievements();
  }

  /** The whole Journey track as the journal shows it. */
  get journey(): { level: number; points: number; next: ReturnType<typeof journeyNextStop>; toNext: number; claimed: number; stops: { level: number; needed: number; gold: number; label: string; state: "claimed" | "ready" | "locked" }[] } {
    const points = this.save.journeyPoints;
    const level = journeyLevelFor(points);
    const stops = JOURNEY_STOPS;
    return {
      level,
      points,
      next: journeyNextStop(points),
      toNext: journeyPointsToNext(points),
      claimed: this.save.journeyClaimed,
      stops: stops.map((stop) => ({
        level: stop.level,
        needed: stop.needed,
        gold: stop.gold,
        label: stop.label,
        state: this.save.journeyClaimed >= stop.level ? "claimed" : points >= stop.needed ? "ready" : "locked",
      })),
    };
  }

  /** Which deeds are done, grouped by zone, with live progress. */
  get deedBoard(): { id: string; zone: string; name: string; task: string; progress: number; target: number; done: boolean; points: number; gold: number }[] {
    return DEEDS.map((deed) => ({
      id: deed.id,
      zone: this.zoneName(deed.zone),
      name: deed.name,
      task: deed.task,
      progress: Math.min(deed.target, this.save.deedProgress[deed.id] ?? 0),
      target: deed.target,
      done: this.save.deeds.includes(deed.id),
      points: deed.points,
      gold: deed.gold,
    }));
  }

  /** Claim every Journey stop the hero has reached but not yet collected. */
  claimJourney(): number {
    let claimed = 0;
    for (const stop of JOURNEY_STOPS) {
      if (this.save.journeyPoints < stop.needed) break;
      if (this.save.journeyClaimed >= stop.level) continue;
      this.save.journeyClaimed = stop.level;
      this.save.gold = Math.min(MAX_GOLD, this.save.gold + stop.gold);
      if (stop.itemId) this.addItem(stop.itemId, 1);
      claimed += 1;
      this.emit({ type: "log", text: `Journey ${stop.level}: ${stop.label}. +${stop.gold} gold.`, tone: "good" });
    }
    if (claimed === 0) this.emit({ type: "log", text: "Nothing to claim on the Journey yet. Finish a deed.", tone: "info" });
    return claimed;
  }

  private checkJourneyStop(): void {
    const level = journeyLevelFor(this.save.journeyPoints);
    // Only speak up when a new stop is waiting to be claimed, never twice for the same one.
    if (level > this.save.journeyClaimed) {
      this.emit({ type: "log", text: `Journey ${level} reached. Claim it in the journal.`, tone: "good" });
    }
  }

  /** Total journey points still available from unfinished deeds, for the journal header. */
  get deedPointsLeft(): number {
    return Math.max(0, TOTAL_DEED_POINTS - this.save.deeds.reduce((sum, id) => sum + (getDeed(id)?.points ?? 0), 0));
  }

  /** The zone display name for a deed row. */
  private zoneName(zone: CharacterSave["zone"]): string {
    return ZONES[zone].name;
  }

  /** The rival, levelled to the hero's own progress. */
  get rival(): RivalDef | null {
    if (!this.save.rival) return null;
    return rivalFlavour(this.save.rival, Math.max(1, this.save.level + this.save.rival.wins));
  }

  /**
   * The first death of a hero's life picks the monster that did it. Later deaths
   * feed the same grudge, so there is always one thing that got away.
   */
  pickRivalOnDeath(killerId: string): void {
    if (!killerId || getMonster(killerId)?.boss) return;
    if (!this.save.rival) {
      const picked = pickRival(this.save.metMonsters, killerId);
      this.save.rival = { ...picked, wins: 1, losses: 0 };
      this.emit({ type: "log", text: `Something remembers you: ${picked.name}. It will want another turn.`, tone: "bad" });
      writeDiary(this.save, "death", `${picked.name} put you down. It will come back.`);
      return;
    }
    if (this.save.rival.species === killerId) {
      this.save.rival.wins += 1;
      return;
    }
    // A different monster doing the job just makes the old one angrier.
    this.save.rival.wins += 1;
  }

  /** The rival fell: the grudge is settled, and a new one starts from a clean slate. */
  private settleRival(monsterId: string): void {
    const rival = this.save.rival;
    if (!rival) return;
    if (rival.species !== monsterId) return;
    rival.losses += 1;
    if (rival.wins <= 0) {
      this.save.rival = null;
      this.emit({ type: "log", text: "The grudge is settled. Nothing is left to remember you.", tone: "good" });
      writeDiary(this.save, "kill", "Settled the score with the one that got away.");
      return;
    }
    rival.wins = Math.max(0, rival.wins - 1);
    this.emit({ type: "log", text: `${rival.name} went down. It has lost one of its wins back.`, tone: "good" });
    writeDiary(this.save, "kill", `Finally put ${rival.name} down.`);
  }

  /** Land one hit in the momentum chain. Milestones pay a little resource and a log line. */
  bumpCombo(): void {
    this.combo += 1;
    this.comboTimer = 4;
    if (this.combo > this.comboBest) this.comboBest = this.combo;
    if (this.combo > this.save.stats.bestCombo) this.save.stats.bestCombo = this.combo;
    if (this.combo === 10 || this.combo === 25 || this.combo === 50 || this.combo % 100 === 0) {
      this.save.resource = Math.min(this.stats.maxResource, this.save.resource + 8);
      this.emit({ type: "log", text: `${this.combo} hit chain! The rhythm carries you.`, tone: "good" });
    }
  }

  /** Anything landing on the hero ends the chain, which is what makes keeping it hard. */
  breakCombo(): void {
    if (this.combo >= 10) {
      this.emit({ type: "log", text: `The ${this.combo} hit chain breaks.`, tone: "info" });
    }
    this.combo = 0;
    this.comboTimer = 0;
  }

  /** True while the momentum chain is high enough that a special shows up. */
  get ultimateCharged(): boolean {
    return this.combo >= 20;
  }

  /** The Hollow Ring wave the hero is on, for the HUD and journal. */
  get arenaStatus(): { active: boolean; wave: number; alive: number; best: number } {
    return { active: this.arenaActive, wave: this.arenaWaveNumber, alive: this.arenaAlive, best: this.save.arenaBest };
  }

  /**
   * Enter the Hollow Ring: clears the arena's floor and brings in wave one.
   * Entering costs nothing, which is the whole point of the mode.
   */
  enterArena(): boolean {
    if (this.dead) return false;
    this.arenaActive = true;
    this.arenaWaveNumber = 0;
    this.arenaAlive = 0;
    this.arenaAnnounced = -1;
    this.emit({ type: "log", text: "You step into the Hollow Ring. Nothing in here is on your side.", tone: "quest" });
    this.startArenaWave();
    return true;
  }

  /** Leave the ring and take nothing that is still standing with you. */
  leaveArena(): boolean {
    if (!this.arenaActive) return false;
    this.arenaActive = false;
    this.arenaWaveNumber = 0;
    this.arenaAlive = 0;
    this.monsters = this.monsters.filter((monster) => !monster.uid.startsWith("arena_"));
    this.emit({ type: "log", text: "You step out of the ring. It will be waiting when you come back.", tone: "info" });
    return true;
  }

  /** Bring in the next wave around the hero, close enough to matter. */
  private startArenaWave(): void {
    const wave = arenaWave(this.arenaWaveNumber + 1);
    this.arenaWaveNumber = wave.wave;
    this.arenaAlive = 0;
    for (let index = 0; index < wave.count; index += 1) {
      const species = wave.species[index % wave.species.length];
      const angle = (Math.PI * 2 * index) / wave.count + this.rng.between(0, 6) / 10;
      const radius = 120 + this.rng.between(0, 60);
      const x = Math.min(this.zone.width * this.zone.tileWidth - 20, Math.max(20, this.save.x + Math.cos(angle) * radius));
      const y = Math.min(this.zone.height * this.zone.tileHeight - 20, Math.max(20, this.save.y + Math.sin(angle) * radius));
      const monster = this.makeMonster({ id: species, x, y }, `arena_${wave.wave}_${index}_${this.nextUid("a")}`);
      if (!monster) continue;
      // Waves scale with the hero, so the ring stays a test rather than a wall.
      const scale = 1 + wave.wave * 0.08;
      monster.hp = Math.round(monster.hp * scale);
      monster.maxHp = Math.round((monster.maxHp ?? monster.hp) * scale);
      this.monsters.push(monster);
      this.arenaAlive += 1;
    }
    if (this.arenaAnnounced !== wave.wave) {
      this.arenaAnnounced = wave.wave;
      this.emit({ type: "log", text: wave.announcement, tone: "quest" });
    }
  }

  /** One wave member down: when the floor is clear, the next wave walks in. */
  private onArenaKill(): void {
    if (!this.arenaActive) return;
    this.arenaAlive = Math.max(0, this.arenaAlive - 1);
    if (this.arenaAlive > 0) return;
    const wave = arenaWave(this.arenaWaveNumber);
    this.save.gold = Math.min(MAX_GOLD, this.save.gold + wave.gold);
    this.save.stats.goldEarned += wave.gold;
    this.gainXp(wave.xp);
    this.recordDeed("arena", 1);
    if (this.arenaWaveNumber > this.save.arenaBest) {
      this.save.arenaBest = this.arenaWaveNumber;
      if (this.arenaWaveNumber % 5 === 0) {
        this.emit({ type: "log", text: `Deepest run yet: wave ${this.arenaWaveNumber}.`, tone: "good" });
      }
    }
    this.emit({ type: "log", text: `Wave ${this.arenaWaveNumber} cleared. +${wave.gold} gold.`, tone: "good" });
    // A short breath between waves, then the next one is already on its way in.
    this.startArenaWave();
  }

  /**
   * Weakness: hitting a creature with the element it cannot stand. The bestiary
   * and the boss card both print it, so the fight is a puzzle with a written answer.
   */
  weaknessFor(monsterId: string): { type: string; note: string; bonus: number } {
    const weak = monsterWeakness(monsterId);
    return { type: weak.type, note: weak.note, bonus: weak.bonus };
  }

  /** Count a weakness hit, and pay the little feedback that teaches the rule. */
  recordWeaknessHit(_monsterId: string): void {
    this.save.stats.weaknessHits += 1;
    if (this.save.stats.weaknessHits === 1) {
      this.emit({ type: "log", text: "A weakness! The right element cuts deeper.", tone: "good" });
    }
  }

  /** True when this element is the answer for that species. */
  isWeakTo(monsterId: string, damageType: string): boolean {
    return isWeaknessHit(monsterId, damageType as Parameters<typeof isWeaknessHit>[1]);
  }

  /** How much a matching element multiplies damage by, for the damage maths. */
  weaknessFactor(monsterId: string, damageType: string): number {
    return weaknessMultiplier(monsterId, damageType as Parameters<typeof weaknessMultiplier>[1]);
  }

  /** Save the gear the hero is wearing as a named set, ready to put back on later. */
  saveLoadout(name: string): boolean {
    const clean = name.trim().slice(0, 24);
    if (!clean) return false;
    if (this.save.loadouts.length >= 3) {
      this.emit({ type: "log", text: "Three saved sets is the limit. Overwrite one first.", tone: "info" });
      return false;
    }
    this.save.loadouts.push({
      name: clean,
      equipment: cloneSave(this.save).equipment,
      quickSlots: [this.save.quickSlots[0], this.save.quickSlots[1]],
    });
    this.emit({ type: "log", text: `Saved your current gear as "${clean}".`, tone: "good" });
    return true;
  }

  /** Put a saved set back on, if every piece is still in the bag or already worn. */
  wearLoadout(index: number): boolean {
    const loadout = this.save.loadouts[index];
    if (!loadout) return false;
    for (const [slot, stack] of Object.entries(loadout.equipment) as [keyof CharacterSave["equipment"], ItemStack | undefined][]) {
      if (!stack) continue;
      const def = ITEMS[stack.itemId];
      if (!def || !canClassUse(def, this.save.classId)) {
        this.emit({ type: "log", text: `You cannot wear ${def?.name ?? "that piece"} any more.`, tone: "bad" });
        return false;
      }
      const worn = this.save.equipment[slot];
      if (worn && worn.itemId === stack.itemId) continue;
      // The piece has to exist somewhere: worn in another slot, or in the bag.
      const bagIndex = this.save.inventory.findIndex((entry) => entry && entry.itemId === stack.itemId);
      if (bagIndex < 0) {
        this.emit({ type: "log", text: `${def.name} is no longer in your bag.`, tone: "bad" });
        return false;
      }
      this.equip(bagIndex);
    }
    this.save.quickSlots = [loadout.quickSlots[0], loadout.quickSlots[1]];
    this.emit({ type: "log", text: `Wearing "${loadout.name}".`, tone: "good" });
    return true;
  }

  /** Remove a saved set, so another can take its place. */
  deleteLoadout(index: number): boolean {
    if (!this.save.loadouts[index]) return false;
    this.save.loadouts.splice(index, 1);
    return true;
  }

  private respawn(): void {
    respawn(this);
  }

  private respawnMonster(monster: MonsterInstance): void {
    respawnMonster(this, monster);
  }


  private updateHatchling(dt: number): void {
    const companion = this.save.companion;
    if (!companion || !companion.hatched) return;
    this.hatchlingAttackTimer = Math.max(0, this.hatchlingAttackTimer - dt);
    const target = this.nearestMonster(this.save.x, this.save.y, 150, true);
    if (!target || this.hatchlingAttackTimer > 0) return;
    this.hatchlingAttackTimer = 1.6;
    this.hatchlingHitting = true;
    // The companion grows with the hero: its level raises its damage.
    this.hitMonster(target, (4 + this.save.level) * this.petPower, false, "physical", []);
    this.hatchlingHitting = false;
  }

  private updatePets(dt: number): void {
    for (const pet of this.pets) pet.ttl -= dt;
    this.pets = this.pets.filter((p) => p.ttl > 0 && p.hp > 0);
    for (const pet of this.pets) {
      pet.attackTimer = Math.max(0, pet.attackTimer - dt);
      const def = getMonster(pet.kind === "wolf" ? "spirit_wolf" : pet.kind === "skeleton" ? "skeleton_minion" : "familiar");
      const target = this.nearestMonster(pet.x, pet.y, 190, true);
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
    const ricochets: ProjectileInstance[] = [];
    for (const projectile of this.projectiles) {
      const startX = projectile.x;
      const startY = projectile.y;
      const travelTime = Math.min(dt, Math.max(0, projectile.ttl));
      projectile.ttl = Math.max(0, projectile.ttl - dt);
      const endX = startX + projectile.dirX * projectile.speed * travelTime;
      const endY = startY + projectile.dirY * projectile.speed * travelTime;
      const steps = Math.max(1, Math.ceil(length(endX - startX, endY - startY) / 4));
      stepLoop: for (let step = 1; step <= steps; step += 1) {
        const progress = step / steps;
        const previousProgress = (step - 1) / steps;
        const x = startX + (endX - startX) * progress;
        const y = startY + (endY - startY) * progress;
        if (this.isBlockedAt(x, y, projectile.radius)) {
          projectile.ttl = 0;
          this.logArrowMiss(projectile);
          break stepLoop;
        }
        for (const monster of this.monsters) {
          if (monster.state === "dead") continue;
          if (projectile.hitTargets?.includes(monster.uid)) continue;
          const def = getMonster(monster.defId);
          const segmentStartX = startX + (endX - startX) * previousProgress;
          const segmentStartY = startY + (endY - startY) * previousProgress;
          if (segmentDistanceSquared(monster.x, monster.y, segmentStartX, segmentStartY, x, y) <= (projectile.radius + def.radius) ** 2) {
            projectile.x = x;
            projectile.y = y;
            this.hitMonster(monster, projectile.damage, projectile.crit > 0, projectile.damageType, projectile.statuses, projectile.armorPiercing);
            if (projectile.healingOnHit) this.healPlayer(projectile.healingOnHit);
            if (projectile.ricochetsRemaining && projectile.ricochetsRemaining > 0) {
              const hitTargets = [...(projectile.hitTargets ?? []), monster.uid];
              const next = this.monsters
                .filter((candidate) =>
                  candidate.state !== "dead"
                  && !hitTargets.includes(candidate.uid)
                  && length(candidate.x - monster.x, candidate.y - monster.y) <= 180
                  && this.hasLineOfSight(monster.x, monster.y, candidate.x, candidate.y))
                .sort((left, right) => length(left.x - monster.x, left.y - monster.y) - length(right.x - monster.x, right.y - monster.y))[0];
              if (next) {
                const direction = normalize(next.x - monster.x, next.y - monster.y);
                ricochets.push({
                  ...projectile,
                  uid: this.nextUid("p"),
                  x: monster.x,
                  y: monster.y,
                  dirX: direction.x,
                  dirY: direction.y,
                  ttl: 180 / projectile.speed,
                  hit: false,
                  missLogged: false,
                  ricochetsRemaining: projectile.ricochetsRemaining - 1,
                  hitTargets,
                });
              }
            }
            projectile.hit = true;
            projectile.ttl = 0;
            break stepLoop;
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
    this.projectiles.push(...ricochets);
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
      const reach = PICKUP_RANGE + AUTOLOOT_RADIUS;
      if (dist2(this.save.x, this.save.y, drop.x, drop.y) <= reach * reach) {
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

  nearestMonster(x: number, y: number, maxRange: number, requireLineOfSight = false): MonsterInstance | null {
    let best: MonsterInstance | null = null;
    let bestD = maxRange * maxRange;
    for (const monster of this.monsters) {
      if (monster.state === "dead") continue;
      if (requireLineOfSight && !this.hasLineOfSight(x, y, monster.x, monster.y)) continue;
      const d = dist2(x, y, monster.x, monster.y);
      if (d < bestD) {
        bestD = d;
        best = monster;
      }
    }
    return best;
  }

  hitMonster(monster: MonsterInstance, raw: number, crit: boolean, damageType: DamageType, statuses: StatusInstance[], armorPiercing = false): void {
    combat.hitMonster(this, monster, raw, crit, damageType, statuses, armorPiercing);
  }

  addShield(amount: number, duration: number): void {
    this.shield = Math.min(this.stats.maxHp, this.shield + Math.max(0, amount));
    this.shieldRemaining = Math.max(this.shieldRemaining, duration);
  }

  gainGold(amount: number): number {
    if (!Number.isFinite(amount)) return 0;
    const gained = Math.max(0, Math.min(MAX_GOLD - this.save.gold, Math.floor(amount)));
    if (gained > 0) {
      this.save.gold += gained;
      this.save.stats.goldEarned += gained;
      this.emit({ type: "gold", amount: gained });
    }
    return gained;
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
      writeDiary(this.save, "level", `Reached level ${this.save.level}.`);
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

  abilityCooldownDuration(id: string): number {
    const ability = id === "basic" ? this.classDef.basic : this.classDef.abilities.find((entry) => entry.id === id);
    if (!ability) return 0;
    const abilityCooldown = this.abilityTalentModifiers[id]?.cooldownPercent ?? 0;
    const masteryCut = masteryCooldownCut(rankFor(this.save.abilityUses[id] ?? 0)) / 100;
    return ability.cooldown * (1 - this.modifiers.cooldown / 100) * (1 - abilityCooldown / 100) * (1 - masteryCut);
  }

  /** Every ability of this class with the mastery the hero has earned on it. */
  get mastery(): MasteryState[] {
    return masteryRows(this.classDef, this.save.abilityUses);
  }

  /** The resource an ability costs once mastery is taken off, never below one point. */
  abilityCost(id: string): number {
    const ability = id === "basic" ? this.classDef.basic : this.classDef.abilities.find((entry) => entry.id === id);
    if (!ability) return 0;
    const cut = masteryCostCut(rankFor(this.save.abilityUses[id] ?? 0)) / 100;
    return Math.max(ability.cost > 0 ? 1 : 0, Math.round(ability.cost * (1 - cut)));
  }

  /**
   * Mastery is earned by using a skill, so every cast is counted here and the rank-up is
   * announced the moment it happens. Returns the new rank when the cast pushed it up.
   */
  private recordCast(abilityId: string): number {
    const before = rankFor(this.save.abilityUses[abilityId] ?? 0);
    this.save.abilityUses[abilityId] = (this.save.abilityUses[abilityId] ?? 0) + 1;
    const after = rankFor(this.save.abilityUses[abilityId] ?? 0);
    return after > before ? after : 0;
  }

  castAbility(id: string, aim: Vec2): boolean {
    if (this.dead) return false;
    const basic = id === "basic";
    const ability = basic ? this.classDef.basic : this.classDef.abilities.find((a) => a.id === id);
    if (!ability) return false;
    if (!basic && !isAbilityUnlocked(this.classDef, this.save.level, id)) return false;
    if ((this.cooldowns[id] ?? 0) > 0) return false;
    const cost = this.abilityCost(id);
    if (cost > this.save.resource) {
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
    this.save.resource -= cost;
    this.cooldowns[id] = this.abilityCooldownDuration(id);
    const newRank = this.recordCast(id);
    if (newRank > 0) {
      this.emit({ type: "log", text: `${ability.name} reaches mastery rank ${newRank}: cheaper to cast and quicker to return.`, tone: "good" });
      writeDiary(this.save, "level", `${ability.name} reached mastery rank ${newRank}.`);
    }
    if (basic) this.resourceGain(RESOURCE_GAIN[this.classDef.resource]);
    this.lastCombat = this.elapsed;
    const origin = { x: this.save.x, y: this.save.y };
    const dashDistance = ability.effects.find((effect) => effect.kind === "dash")?.amount;
    const castRadius = ability.effects.find((effect) => effect.radius)?.radius ?? (ability.targeting === "self" ? 72 : 0);
    const castRange = ability.range > 0 ? ability.range : ability.targeting === "point" ? 160 : dashDistance ?? 0;
    const castTarget =
      ability.targeting === "self"
        ? { x: this.save.x, y: this.save.y }
        : {
            x: this.save.x + dir.x * Math.min(castRange, Math.max(0, length(aim.x - this.save.x, aim.y - this.save.y))),
            y: this.save.y + dir.y * Math.min(castRange, Math.max(0, length(aim.x - this.save.x, aim.y - this.save.y))),
          };
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
    const isDash = ability.effects.some((effect) => effect.kind === "dash");
    this.emit({
      type: "cast",
      abilityId: ability.id,
      x: origin.x,
      y: origin.y,
      targetX: isDash ? this.save.x : castTarget.x,
      targetY: isDash ? this.save.y : castTarget.y,
      targeting: ability.targeting,
      radius: castRadius,
      basic,
      color: this.classDef.accent,
      icon: ability.icon,
    });
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
    // The bestiary fills in by playing: every id killed gets a tally, and a first kill is a diary line.
    const tally = (this.save.monsterKills[monsterId] ?? 0) + 1;
    this.save.monsterKills[monsterId] = tally;
    if (!this.save.metMonsters.includes(monsterId)) this.save.metMonsters.push(monsterId);
    const def = getMonster(monsterId);
    if (def && tally === 1 && !def.boss) writeDiary(this.save, "kill", `First ${def.name} brought down in ${this.zone.name}.`);
  }

  /** How many times this hero has killed one species, for the bestiary column. */
  killCount(monsterId: string): number {
    return this.save.monsterKills[monsterId] ?? 0;
  }

  /** True once the hero has met this species, whether by killing it or by being seen by it. */
  hasMet(monsterId: string): boolean {
    return this.save.metMonsters.includes(monsterId) || this.killCount(monsterId) > 0;
  }

  /** Remember a monster the hero has come near, so the bestiary fills in before the first kill. */
  noteEncounter(monsterId: string): void {
    if (this.save.metMonsters.includes(monsterId)) return;
    this.save.metMonsters.push(monsterId);
  }

  /** Pin one quest above the others. Passing null clears the pin. */
  pinQuest(questId: string | null): boolean {
    if (questId === null) {
      this.save.pinnedQuest = null;
      return true;
    }
    const state = this.save.quests.find((entry) => entry.id === questId);
    if (!state) return false;
    this.save.pinnedQuest = this.save.pinnedQuest === questId ? null : questId;
    return true;
  }

  /**
   * Wake an elemental reaction: the monster is already carrying an element and a different
   * one just landed. Pays a little extra damage and remembers the combo for the journal.
   * Returns the extra damage as a fraction of the hit (0 when nothing happened).
   */
  wakeReaction(monster: MonsterInstance, incoming: DamageType): number {
    if (this.elapsed - this.lastReactionAt < 0.08) return 0;
    const carried: DamageType[] = [];
    for (const status of monster.statuses) {
      const element = statusElement(status.kind);
      if (element) carried.push(element);
    }
    if (carried.length === 0) return 0;
    const reaction = findReaction(carried, incoming);
    if (!reaction) return 0;
    this.lastReactionAt = this.elapsed;
    if (!this.save.reactionsSeen.includes(reaction.id)) {
      this.save.reactionsSeen.push(reaction.id);
      this.emit({ type: "log", text: `${reaction.name}! ${reaction.text}`, tone: "good" });
      writeDiary(this.save, "kill", `Discovered ${reaction.name} in ${this.zone.name}.`);
    } else {
      this.emit({ type: "log", text: `${reaction.name}!`, tone: "info" });
    }
    return reaction.bonus;
  }

  /** Every reaction in the game with whether this hero has found it. */
  get reactionBook(): { id: string; name: string; text: string; icon: string; found: boolean }[] {
    return REACTIONS.map((reaction) => ({
      id: reaction.id,
      name: reaction.name,
      text: reaction.text,
      icon: reaction.icon,
      found: this.save.reactionsSeen.includes(reaction.id),
    }));
  }

  /** Count a kill toward the bounty board, and say so when one is finished. */
  recordBountyKill(monsterId: string): void {
    const open = this.bounties;
    const touched = bountyBoard.addBountyKill(this.save, monsterId, open);
    for (const key of touched) {
      const bounty = open.find((entry) => entry.key === key);
      if (!bounty) continue;
      const done = this.bountyProgress(key);
      if (done >= bounty.need) {
        this.emit({ type: "log", text: `Bounty complete: ${bounty.monsterName}. Collect it from the journal.`, tone: "quest" });
      }
    }
  }

  /** Remember the last big hit for the death screen. */
  rememberHit(source: string, damage: number): void {
    if (damage <= 0) return;
    this.lastHitSource = source;
    this.lastHitAmount = Math.round(damage);
  }

  /**
   * What killed the hero and what to try next, built when the hero falls. It exists so a
   * death reads as a lesson rather than a four-second wait with nothing to look at.
   */
  get deathRecap(): { source: string; damage: number; tip: string; level: number } {
    const source = this.lastHitSource || "the dark";
    const damage = this.lastHitAmount;
    const stats = this.stats;
    let tip = "Dodge through the wind-up, not away from it. Rolling into a swing passes it.";
    if (this.statuses.some((status) => status.kind === "poison")) tip = "Poison finished you. Carry an antidote or kill the venomous ones from range.";
    if (this.statuses.some((status) => status.kind === "burn")) tip = "You burned down. Step out of the fire before it stacks.";
    else if (this.inventoryEmptyOfPotions) tip = "Your bag had no potions left. The village shop sells them cheap.";
    else if (damage >= stats.maxHp * 0.6) tip = "That was one huge blow. Shrine blessings give you a bigger health pool for fights like this.";
    return { source, damage, tip, level: this.save.level };
  }

  /** True when there is nothing in the bag that can heal the hero. */
  get inventoryEmptyOfPotions(): boolean {
    return this.consumableCount("heal") === 0;
  }

  /**
   * Say something when a fresh boss first notices the hero: a line of lore and one useful
   * warning, once per boss per visit, so the fight opens with intent.
   */
  announceBosses(): void {
    if (this.dead) return;
    for (const monster of this.monsters) {
      if (monster.state === "dead" || monster.state === "idle") continue;
      const def = getMonster(monster.defId);
      if (!def.boss || this.bossSeen.has(monster.uid)) continue;
      this.bossSeen.add(monster.uid);
      const lore = bossLore(def.id);
      this.emit({ type: "boss-intro", monsterId: def.id, name: def.name, text: lore.text, warning: lore.warning, level: def.level });
    }
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
    // Everything picked up is counted for the journal before it lands in the bag.
    this.save.stats.itemsFound += qty;
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
    if (shieldOnDodge > 0) this.addShield(shieldOnDodge, 5);
    if (Math.abs(dir.x) > Math.abs(dir.y)) this.facing = dir.x > 0 ? "right" : "left";
    else this.facing = dir.y > 0 ? "down" : "up";
    this.emit({ type: "dodge", x: this.save.x, y: this.save.y });
    return true;
  }

  rewardPerfectDodge(): void {
    this.save.stats.perfectDodges += 1;
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

  /** How many free inventory squares are left, so the HUD can warn before a bag is full. */
  freeSlots(): number {
    return this.save.inventory.reduce((free, stack) => (stack === null ? free + 1 : free), 0);
  }

  /** Potions and elixirs on hand, counted by what they do rather than by item id. */
  consumableCount(kind: "heal" | "resource"): number {
    return this.save.inventory.reduce((sum, stack) => {
      if (!stack) return sum;
      const def = ITEMS[stack.itemId];
      if (!def || def.type !== "consumable") return sum;
      if (kind === "heal" && def.heal) return sum + stack.qty;
      if (kind === "resource" && def.restore) return sum + stack.qty;
      return sum;
    }, 0);
  }

  /**
   * Sort the backpack so the bag reads neatly: gear by rarity then name, gear first,
   * then consumables and materials. Empty squares always go last so nothing floats.
   */
  sortInventory(): boolean {
    const order: Record<string, number> = { legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1 };
    const typeOrder: Record<string, number> = { weapon: 0, armor: 1, helm: 2, boots: 3, trinket: 4, consumable: 5, material: 6 };
    const stacks = this.save.inventory
      .filter((stack): stack is ItemStack => Boolean(stack))
      .sort((a, b) => {
        const defA = ITEMS[a.itemId];
        const defB = ITEMS[b.itemId];
        if (!defA || !defB) return 0;
        const typeDiff = (typeOrder[defA.type] ?? 9) - (typeOrder[defB.type] ?? 9);
        if (typeDiff !== 0) return typeDiff;
        const rarityDiff = (order[defB.rarity] ?? 0) - (order[defA.rarity] ?? 0);
        if (rarityDiff !== 0) return rarityDiff;
        return defA.name.localeCompare(defB.name);
      });
    if (stacks.length === 0) return false;
    const before = this.save.inventory.map((stack) => stack?.itemId ?? "").join(",");
    this.save.inventory = [
      ...stacks,
      ...Array.from({ length: Math.max(0, INVENTORY_SIZE - stacks.length) }, () => null),
    ];
    const after = this.save.inventory.map((stack) => stack?.itemId ?? "").join(",");
    if (before === after) return false;
    this.emit({ type: "log", text: "Backpack sorted.", tone: "info" });
    return true;
  }

  /** Sell every stack that only the shop wants: materials and spare potions, never equipped gear. */
  sellAllMaterials(): number {
    let gold = 0;
    let sold = 0;
    for (let i = 0; i < this.save.inventory.length; i += 1) {
      const stack = this.save.inventory[i];
      if (!stack) continue;
      const def = ITEMS[stack.itemId];
      if (!def || def.type !== "material") continue;
      gold += itemSellValue(stack) * stack.qty;
      sold += stack.qty;
      this.save.inventory[i] = null;
    }
    if (sold === 0) {
      this.emit({ type: "log", text: "You have no spare materials to sell.", tone: "info" });
      return 0;
    }
    const gained = this.gainGold(gold);
    this.emit({ type: "log", text: `Sold ${sold} materials for ${gained} gold.`, tone: "good" });
    this.refreshCollectQuests();
    return gained;
  }

  /** Drink the first healing potion on hand, best one first. Returns false when there is none. */
  drinkBestPotion(kind: "heal" | "resource" = "heal"): boolean {
    if (this.dead) return false;
    const slots = this.save.inventory
      .map((stack, index) => ({ stack, index }))
      .filter((entry): entry is { stack: ItemStack; index: number } => Boolean(entry.stack))
      .filter(({ stack }) => {
        const def = ITEMS[stack.itemId];
        return Boolean(def && def.type === "consumable" && (kind === "heal" ? def.heal : def.restore));
      })
      .sort((a, b) => {
        const defA = ITEMS[a.stack.itemId];
        const defB = ITEMS[b.stack.itemId];
        const amountA = (kind === "heal" ? defA?.heal : defA?.restore) ?? 0;
        const amountB = (kind === "heal" ? defB?.heal : defB?.restore) ?? 0;
        return amountB - amountA;
      });
    const best = slots[0];
    if (!best) {
      this.emit({ type: "log", text: kind === "heal" ? "You have no healing potions left." : `You have no ${this.resourceLabel.toLowerCase()} potions left.`, tone: "bad" });
      return false;
    }
    return this.useItem(best.index);
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
    this.save.stats.potionsUsed += 1;
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
    if (def.requiresLevel && this.save.level < def.requiresLevel) {
      this.emit({ type: "log", text: `${def.name} needs level ${def.requiresLevel}.`, tone: "bad" });
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

  /**
   * Wear the strongest piece in the bag for every slot at once, so a player who has just
   * cleared a dungeon does not have to compare ten items by hand. Returns how many changed.
   */
  equipBestGear(): number {
    let changed = 0;
    for (const slot of ["weapon", "armor", "helm", "boots", "trinket"] as const) {
      // Compare with what is already worn, so the best piece always ends up on the hero.
      const candidates = this.save.inventory
        .map((stack, index) => ({ stack, index }))
        .filter((entry): entry is { stack: ItemStack; index: number } => Boolean(entry.stack))
        .filter(({ stack }) => {
          const def = ITEMS[stack.itemId];
          return Boolean(def && isEquippable(def) && def.type === slot && canClassUse(def, this.save.classId));
        })
        .filter(({ stack }) => {
          const def = ITEMS[stack.itemId];
          return !def.requiresLevel || this.save.level >= def.requiresLevel;
        });
      if (candidates.length === 0) continue;
      const scoreOf = (stack: ItemStack) => {
        const bonus = itemStats(stack);
        return (bonus.attack ?? 0) * 2 + (bonus.defense ?? 0) * 2 + (bonus.maxHp ?? 0) * 0.3
          + (bonus.maxResource ?? 0) * 0.2 + (bonus.crit ?? 0) * 100 + (bonus.moveSpeed ?? 0) * 0.5;
      };
      const currentPiece = this.save.equipment[slot];
      const best = candidates.sort((a, b) => scoreOf(b.stack) - scoreOf(a.stack))[0];
      if (currentPiece && scoreOf(currentPiece) >= scoreOf(best.stack)) continue;
      if (this.equip(best.index)) changed += 1;
    }
    if (changed === 0) {
      this.emit({ type: "log", text: "You are already wearing your best gear.", tone: "info" });
    } else {
      this.emit({ type: "log", text: `Changed ${changed} piece${changed === 1 ? "" : "s"} of gear.`, tone: "good" });
    }
    return changed;
  }

  /** A plain-words comparison of a bag item against what is worn in the same slot. */
  compareToEquipped(stack: ItemStack): { slot: keyof CharacterSave["equipment"]; lines: string[] } | null {
    const def = ITEMS[stack.itemId];
    if (!def || !isEquippable(def)) return null;
    const slot = def.type as keyof CharacterSave["equipment"];
    const worn = this.save.equipment[slot];
    const next = itemStats(stack);
    const now = worn ? itemStats(worn) : {};
    const labels: Record<string, string> = { attack: "Attack", defense: "Defence", maxHp: "Health", maxResource: "Resource", crit: "Critical", moveSpeed: "Move speed" };
    const lines: string[] = [];
    for (const key of Object.keys(labels) as (keyof typeof labels)[]) {
      const before = (now[key as keyof typeof now] ?? 0) as number;
      const after = (next[key as keyof typeof next] ?? 0) as number;
      const diff = Math.round((after - before) * 10) / 10;
      if (diff === 0) continue;
      lines.push(`${diff > 0 ? "+" : ""}${diff} ${labels[key]}`);
    }
    return { slot, lines };
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
    if (this.save.gold >= MAX_GOLD) {
      this.emit({ type: "log", text: "Your gold is already at its limit.", tone: "bad" });
      return false;
    }
    const amount = Math.max(1, Math.min(qty, stack.qty));
    const def = getItem(stack.itemId);
    const gold = itemSellValue(stack) * amount;
    stack.qty -= amount;
    if (stack.qty <= 0) this.save.inventory[slotIndex] = null;
    const gained = this.gainGold(gold);
    this.emit({ type: "log", text: `Sold ${amount}x ${def.name} for ${gained} gold.`, tone: "good" });
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
    const baseCost = (def.buy ?? 0) * amount;
    const cost = Math.max(1, Math.ceil(baseCost * (1 - this.shopDiscountPercent / 100)));
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

  /**
   * Walk the hero to another zone they have already unlocked. Fast travel is a small kindness
   * for a long walk back, never a shortcut past content: only zones already visited count.
   */
  fastTravel(zoneId: ZoneId): boolean {
    if (this.dead) return false;
    if (!this.save.waypoints.includes(zoneId)) {
      this.emit({ type: "log", text: "You have not been there yet.", tone: "bad" });
      return false;
    }
    if (this.save.zone === zoneId) {
      this.emit({ type: "log", text: "You are already here.", tone: "info" });
      return false;
    }
    const target = ZONES[zoneId];
    if (!target) return false;
    this.save.zone = zoneId;
    this.save.x = target.spawn.x;
    this.save.y = target.spawn.y;
    this.dodgeTimer = 0;
    this.loadZone();
    this.emit({ type: "zone", zone: zoneId });
    this.emit({ type: "log", text: `Travelled to ${target.name}.`, tone: "good" });
    return true;
  }

  /** Unlock a zone for fast travel the first time it is reached. */
  unlockWaypoint(zoneId: ZoneId): boolean {
    if (this.save.waypoints.includes(zoneId)) return false;
    this.save.waypoints.push(zoneId);
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
    if (result.requiresLevel && this.save.level < result.requiresLevel) {
      this.emit({ type: "log", text: `${result.name} needs level ${result.requiresLevel}.`, tone: "bad" });
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
    const base = Math.max(HEAL_MIN_COST, Math.ceil(missing * HEAL_COST_PER_HP));
    // A healer who trusts you charges less.
    return Math.max(HEAL_MIN_COST, Math.ceil(base * (1 - this.healDiscountPercent / 100)));
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
    const healed = this.stats.maxHp - this.save.hp;
    this.save.gold -= cost;
    this.save.hp = this.stats.maxHp;
    this.emit({ type: "heal", amount: healed, x: this.save.x, y: this.save.y });
    this.emit({ type: "log", text: `Elara restores you for ${cost} gold.`, tone: "good" });
    return true;
  }

  getNpcQuestStates(npcId: string): { questId: string; name: string; level: number; state: QuestState | null; available: boolean; canTurnIn: boolean; description: string; repeatable: boolean; requires: string[] }[] {
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
    this.emit({ type: "log", text: "It fights beside you and grows stronger with every monster you defeat.", tone: "info" });
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
        const gained = this.gainGold(5);
        this.emit({ type: "log", text: gained > 0 ? "They appreciate your kindness. +5 gold." : "They appreciate your kindness.", tone: "good" });
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
