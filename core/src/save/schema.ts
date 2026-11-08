import { z } from "zod";
import { INVENTORY_SIZE, LEVEL_CAP, MAX_GOLD, PLAYER_RADIUS, SAVE_VERSION, STASH_CAPACITIES, STASH_SIZE } from "../constants";
import { getClass, CLASSES } from "../data/classes";
import { AFFIX_IDS, ITEMS, MAX_UPGRADE, canClassUse, isEquippable } from "../data/items";
import { getTalentChoice, talentTierChosen } from "../data/talents";
import { NPCS } from "../data/npcs";
import { getZone, ZONES } from "../generated/world-data";
import { getAchievement, ACHIEVEMENT_IDS, DEFAULT_TITLE } from "../data/achievements";
import { DESCENT_RELICS } from "../data/descent";
import type { CharacterSave, ClassId, ItemStack } from "../types";
import { clampLevel, deriveStats } from "../progression";
import { talentBonuses } from "../data/talents";

const CLASS_IDS = Object.keys(CLASSES) as [ClassId, ...ClassId[]];
const ZONE_IDS = ["village", "forest", "dungeon", "marsh", "frost", "throne"] as const;
const DIFFICULTIES = ["story", "normal", "nightmare"] as const;
const BOSS_IDS = ["bone_warden", "miremother", "frost_revenant", "hollow_king"] as const;
/** Relic ids, so a save can never name one that does not exist. */
const DESCENT_RELIC_IDS = DESCENT_RELICS.map((relic) => relic.id) as [string, ...string[]];

const affixIds = AFFIX_IDS as [string, ...string[]];

const itemInstanceSchema = z.object({
  uid: z.string().min(1).max(80),
  affixes: z.array(z.enum(affixIds)).max(8),
  upgrade: z.number().int().min(0).max(MAX_UPGRADE),
});

const itemStackSchema = z.object({
  itemId: z.string().min(1),
  qty: z.number().int().min(1).max(9999),
  instance: itemInstanceSchema.optional(),
});

const equipmentSchema = z.object({
  weapon: itemStackSchema.optional(),
  armor: itemStackSchema.optional(),
  helm: itemStackSchema.optional(),
  boots: itemStackSchema.optional(),
  trinket: itemStackSchema.optional(),
});

const questSchema = z.object({
  id: z.string().min(1),
  progress: z.array(z.number().int().min(0)),
  completed: z.boolean(),
  completions: z.number().int().min(0),
  exploredZones: z.array(z.enum(ZONE_IDS)).optional(),
  claimedReward: z.number().int().min(0).max(9).optional(),
});

const bountySchema = z.object({
  key: z.string().min(1).max(24),
  progress: z.number().int().min(0).max(999),
  claimed: z.boolean().default(false),
});

const statsSchema = z.object({
  monstersSlain: z.number().int().min(0).default(0),
  bossesSlain: z.number().int().min(0).default(0),
  deaths: z.number().int().min(0).default(0),
  chestsOpened: z.number().int().min(0).default(0),
  questsCompleted: z.number().int().min(0).default(0),
  goldEarned: z.number().int().min(0).default(0),
  itemsFound: z.number().int().min(0).default(0),
  potionsUsed: z.number().int().min(0).default(0),
  perfectDodges: z.number().int().min(0).default(0),
  bestHit: z.number().int().min(0).default(0),
  distanceWalked: z.number().min(0).default(0),
  bestStreak: z.number().int().min(0).default(0),
  bountyGold: z.number().int().min(0).default(0),
  flawlessFights: z.number().int().min(0).default(0),
  bestCombo: z.number().int().min(0).default(0),
  weaknessHits: z.number().int().min(0).default(0),
  bestDummyHit: z.number().int().min(0).default(0),
  bestDummyCombo: z.number().int().min(0).default(0),
});

/** The monster with a grudge: one species that beat the hero and grows with them. */
const rivalSchema = z.object({
  name: z.string().min(1).max(40),
  species: z.string().min(1).max(60),
  faces: z.string().min(1).max(60),
  wins: z.number().int().min(0).max(999),
  losses: z.number().int().min(0).max(999),
});

/** A saved gear set, worn again with one press. */
const loadoutSchema = z.object({
  name: z.string().min(1).max(24),
  equipment: equipmentSchema,
  quickSlots: z.tuple([z.string().nullable(), z.string().nullable()]),
});

/** One finished Endless Descent run, kept for the local leaderboard. */
const descentRunSchema = z.object({
  score: z.number().int().min(0).max(9999),
  seed: z.number().int().min(0).max(0xffffffff),
  at: z.number().int().min(0),
});

const achievementIds = ACHIEVEMENT_IDS as [string, ...string[]];
void achievementIds;

export const saveSchema = z.object({
  version: z.literal(SAVE_VERSION),
  id: z.string().min(1).max(80),
  name: z.string().min(1).max(16),
  classId: z.enum(CLASS_IDS),
  level: z.number().int().min(1).max(LEVEL_CAP),
  xp: z.number().int().min(0),
  gold: z.number().int().min(0).max(MAX_GOLD),
  hp: z.number().finite().min(0),
  resource: z.number().finite().min(0),
  zone: z.enum(ZONE_IDS),
  x: z.number().finite(),
  y: z.number().finite(),
  inventory: z.array(itemStackSchema.nullable()).length(INVENTORY_SIZE),
  quickSlots: z.tuple([z.string().nullable(), z.string().nullable()]),
  gatherCooldowns: z.record(z.string().min(1), z.number().finite().min(0)).default({}),
  talents: z.array(z.string().min(1)).max(5),
  equipment: equipmentSchema,
  quests: z.array(questSchema),
  openedChests: z.array(z.string()),
  difficulty: z.enum(DIFFICULTIES),
  ngPlus: z.number().int().min(0).max(99),
  defeatedBosses: z.array(z.enum(BOSS_IDS)).max(32),
  storyChapter: z.number().int().min(0).max(99),
  introShown: z.boolean().optional(),
  relationships: z.record(z.string().min(1).max(40), z.number().int().min(-10).max(10)).default({}),
  npcKindRewards: z.array(z.string().min(1)).max(Object.keys(NPCS).length).default([]),
  playtime: z.number().finite().min(0),
  rngState: z.number().int().min(0).max(0xffffffff),
  createdAt: z.number().int().min(0),
  updatedAt: z.number().int().min(0),
  companion: z.object({ kind: z.literal("egg"), name: z.string().min(1).max(16), hatched: z.boolean().optional(), species: z.string().max(24).optional() }).optional(),
  stats: statsSchema.default({}),
  achievements: z.array(z.string().min(1).max(40)).max(ACHIEVEMENT_IDS.length + 40).default([]),
  waypoints: z.array(z.enum(ZONE_IDS)).max(8).default(["village"]),
  petXp: z.number().int().min(0).default(0),
  title: z.string().min(1).max(40).default(DEFAULT_TITLE),
  bounties: z.array(bountySchema).max(16).default([]),
  blessingDay: z.number().int().min(-1).default(-1),
  bountyStreak: z.number().int().min(0).default(0),
  abilityUses: z.record(z.string().min(1).max(40), z.number().int().min(0).max(1_000_000)).default({}),
  reactionsSeen: z.array(z.string().min(1).max(24)).max(64).default([]),
  pinnedQuest: z.string().min(1).max(60).nullable().default(null),
  metMonsters: z.array(z.string().min(1).max(60)).max(400).default([]),
  monsterKills: z.record(z.string().min(1).max(60), z.number().int().min(0).max(1_000_000)).default({}),
  diary: z.array(z.object({
    t: z.number().finite().min(0),
    kind: z.enum(["kill", "quest", "boss", "level", "loot", "death", "zone", "achievement"]),
    text: z.string().min(1).max(160),
  })).max(60).default([]),
  journeyPoints: z.number().int().min(0).max(1_000_000).default(0),
  deeds: z.array(z.string().min(1).max(40)).max(200).default([]),
  journeyClaimed: z.number().int().min(0).max(200).default(0),
  deedProgress: z.record(z.string().min(1).max(40), z.number().int().min(0).max(1_000_000)).default({}),
  rival: rivalSchema.nullable().default(null),
  arenaBest: z.number().int().min(0).max(9999).default(0),
  descentBest: z.number().int().min(0).max(9999).default(0),
  descentShards: z.number().int().min(0).max(1_000_000).default(0),
  descentRelics: z.array(z.enum(DESCENT_RELIC_IDS)).max(DESCENT_RELIC_IDS.length).default([]),
  descentPact: z.number().int().min(0).max(3).default(0),
  gauntletCleared: z.array(z.enum(BOSS_IDS)).max(32).default([]),
  descentRuns: z.array(descentRunSchema).max(5).default([]),
  dailyClaimedOn: z.string().max(10).default(""),
  dailyStreak: z.number().int().min(0).max(9999).default(0),
  weeklyKey: z.string().max(10).default(""),
  weeklyBest: z.number().int().min(0).max(9999).default(0),
  loadouts: z.array(loadoutSchema).max(3).default([]),
  stash: z.array(itemStackSchema.nullable()).length(STASH_SIZE).default(() => Array.from({ length: STASH_SIZE }, () => null)),
  stashTier: z.number().int().min(0).max(STASH_CAPACITIES.length - 1).default(0),
});

export const MAX_NAME_LENGTH = 16;

export function sanitizeName(raw: string): string {
  return raw.replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, MAX_NAME_LENGTH);
}

export function isValidName(raw: string): boolean {
  const name = sanitizeName(raw);
  return name.length >= 2 && /^[\p{L}\p{N}][\p{L}\p{N} _'’.-]*$/u.test(name);
}

function positionBlocked(zone: ReturnType<typeof getZone>, x: number, y: number): boolean {
  if (
    x < PLAYER_RADIUS
    || y < PLAYER_RADIUS
    || x > zone.width * zone.tileWidth - PLAYER_RADIUS
    || y > zone.height * zone.tileHeight - PLAYER_RADIUS
  ) return true;
  const minTx = Math.max(0, Math.floor((x - PLAYER_RADIUS) / zone.tileWidth));
  const maxTx = Math.min(zone.width - 1, Math.floor((x + PLAYER_RADIUS) / zone.tileWidth));
  const minTy = Math.max(0, Math.floor((y - PLAYER_RADIUS) / zone.tileHeight));
  const maxTy = Math.min(zone.height - 1, Math.floor((y + PLAYER_RADIUS) / zone.tileHeight));
  for (let ty = minTy; ty <= maxTy; ty += 1) {
    for (let tx = minTx; tx <= maxTx; tx += 1) {
      if (!zone.blocked[ty * zone.width + tx]) continue;
      const left = tx * zone.tileWidth;
      const top = ty * zone.tileHeight;
      const nearestX = Math.max(left, Math.min(x, left + zone.tileWidth));
      const nearestY = Math.max(top, Math.min(y, top + zone.tileHeight));
      if ((x - nearestX) ** 2 + (y - nearestY) ** 2 < PLAYER_RADIUS ** 2) return true;
    }
  }
  return false;
}

const STARTER_WEAPON: Record<ClassId, string> = {
  warrior: "iron_sword",
  mage: "oak_staff",
  archer: "shortbow",
  assassin: "iron_daggers",
  paladin: "oathblade",
  priest: "novice_staff",
  necromancer: "bone_staff",
  druid: "oak_staff",
  monk: "training_wraps",
  gunslinger: "flintlock",
  berserker: "hand_axe",
  summoner: "apprentice_tome",
  ranger: "shortbow",
  spellblade: "runeblade",
  dragonknight: "dragon_lance",
  warden: "starter_warden_hammer",
  oracle: "starter_oracle_focus",
  battlemage: "starter_battlemage_blade",
  shadowdancer: "starter_shadowdancer_blades",
  artificer: "starter_artificer_repeater",
  beastmaster: "starter_beastmaster_bow",
  duelist: "starter_duelist_rapier",
  elementalist: "starter_elementalist_focus",
  sentinel: "starter_sentinel_halberd",
  stormcaller: "starter_stormcaller_rod",
};

function newId(): string {
  return `c_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e9).toString(36)}`;
}

export function starterEquipment(classId: ClassId): CharacterSave["equipment"] {
  const weaponId = STARTER_WEAPON[classId];
  return weaponId ? { weapon: { itemId: weaponId, qty: 1 } } : {};
}

export function createCharacter(name: string, classId: ClassId, options: { id?: string; now?: number } = {}): CharacterSave {
  const clean = sanitizeName(name);
  if (!isValidName(clean)) throw new Error("Name must be 2-16 letters, numbers, spaces, or simple punctuation.");
  if (!CLASSES[classId]) throw new Error(`Unknown class: ${classId}`);
  const classDef = getClass(classId);
  const now = options.now ?? Date.now();
  const equipment = starterEquipment(classId);
  // Start at full health; rage starts empty, the same as after death and New Game+.
  const startStats = deriveStats(classDef, 1, equipment, talentBonuses(classId, []));
  const inventory: (ItemStack | null)[] = new Array(INVENTORY_SIZE).fill(null);
  inventory[0] = { itemId: "health_potion", qty: 3 };
  const stash: (ItemStack | null)[] = new Array(STASH_SIZE).fill(null);
  const zone = ZONES.village;
  return {
    version: SAVE_VERSION,
    id: options.id ?? newId(),
    name: clean,
    classId,
    level: 1,
    xp: 0,
    gold: 30,
    hp: startStats.maxHp,
    resource: classDef.resource === "rage" ? 0 : startStats.maxResource,
    zone: "village",
    x: zone.spawn.x,
    y: zone.spawn.y,
    inventory,
    quickSlots: ["health_potion", null],
    gatherCooldowns: {},
    talents: [],
    equipment,
    quests: [],
    openedChests: [],
    difficulty: "normal",
    ngPlus: 0,
    defeatedBosses: [],
    storyChapter: 0,
    relationships: {},
    npcKindRewards: [],
    playtime: 0,
    rngState: (Math.floor(Math.random() * 0xffffffff) >>> 0) || 1,
    createdAt: now,
    updatedAt: now,
    stats: { monstersSlain: 0, bossesSlain: 0, deaths: 0, chestsOpened: 0, questsCompleted: 0, goldEarned: 0, itemsFound: 0, potionsUsed: 0, perfectDodges: 0, bestHit: 0, distanceWalked: 0, bestStreak: 0, bountyGold: 0, flawlessFights: 0, bestCombo: 0, weaknessHits: 0, bestDummyHit: 0, bestDummyCombo: 0 },
    achievements: [],
    waypoints: ["village"],
    petXp: 0,
    title: DEFAULT_TITLE,
    bounties: [],
    blessingDay: -1,
    bountyStreak: 0,
    abilityUses: {},
    reactionsSeen: [],
    pinnedQuest: null,
    metMonsters: [],
    monsterKills: {},
    diary: [],
    journeyPoints: 0,
    deeds: [],
    journeyClaimed: 0,
    deedProgress: {},
    rival: null,
    arenaBest: 0,
    descentBest: 0,
    descentShards: 0,
    descentRelics: [],
    descentPact: 0,
    gauntletCleared: [],
    descentRuns: [],
    dailyClaimedOn: "",
    dailyStreak: 0,
    weeklyKey: "",
    weeklyBest: 0,
    loadouts: [],
    stash,
    stashTier: 0,
  };
}

export interface SaveParseSuccess {
  ok: true;
  save: CharacterSave;
}

export interface SaveParseFailure {
  ok: false;
  error: string;
}

export type SaveParseResult = SaveParseSuccess | SaveParseFailure;

export function validateSave(input: unknown): SaveParseResult {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first ? `${first.path.join(".") || "save"}: ${first.message}` : "Invalid save data." };
  }
  const save = parsed.data as CharacterSave;
  if (save.hp > 10_000 || save.resource > 10_000) return { ok: false, error: "Stats exceed safe limits." };
  if (!ZONE_IDS.includes(save.zone)) return { ok: false, error: "Unknown zone." };
  const zone = getZone(save.zone);
  if (save.x < 0 || save.y < 0 || save.x > zone.width * zone.tileWidth || save.y > zone.height * zone.tileHeight) {
    return { ok: false, error: "Player position is outside the map." };
  }
  if (positionBlocked(zone, save.x, save.y)) return { ok: false, error: "Player position is inside blocked terrain." };
  for (const stack of save.inventory) {
    if (!stack) continue;
    if (!ITEMS[stack.itemId]) return { ok: false, error: `Unknown inventory item: ${stack.itemId}` };
    if (stack.qty > ITEMS[stack.itemId].stack) return { ok: false, error: `${ITEMS[stack.itemId].name} exceeds its stack limit.` };
    if (stack.instance && (stack.qty !== 1 || !isEquippable(ITEMS[stack.itemId]))) return { ok: false, error: "Item instances must be single pieces of equipment." };
  }
  const stashCapacity = STASH_CAPACITIES[save.stashTier] ?? STASH_CAPACITIES[0];
  for (const [index, stack] of save.stash.entries()) {
    if (!stack) continue;
    if (index >= stashCapacity) return { ok: false, error: "The vault holds items beyond its unlocked space." };
    if (!ITEMS[stack.itemId]) return { ok: false, error: `Unknown vault item: ${stack.itemId}` };
    if (stack.qty > ITEMS[stack.itemId].stack) return { ok: false, error: `${ITEMS[stack.itemId].name} exceeds its stack limit in the vault.` };
    if (stack.instance && (stack.qty !== 1 || !isEquippable(ITEMS[stack.itemId]))) return { ok: false, error: "Vault instances must be single pieces of equipment." };
  }
  for (const itemId of save.quickSlots) {
    if (itemId && !ITEMS[itemId]) return { ok: false, error: `Unknown quick-slot item: ${itemId}` };
    if (itemId && ITEMS[itemId].type !== "consumable") return { ok: false, error: "Quick slots can only contain consumables." };
  }
  if (new Set(save.npcKindRewards).size !== save.npcKindRewards.length || save.npcKindRewards.some((npcId) => !NPCS[npcId])) {
    return { ok: false, error: "Invalid NPC kindness reward tracking." };
  }
  const seenTiers = new Set<number>();
  for (const talentId of save.talents) {
    const choice = getTalentChoice(save.classId, talentId);
    if (!choice) return { ok: false, error: `Unknown talent: ${talentId}` };
    if (seenTiers.has(choice.tier) || talentTierChosen(save.classId, save.talents, choice.tier)?.id !== choice.id) {
      return { ok: false, error: "Only one talent can be chosen per tier." };
    }
    seenTiers.add(choice.tier);
    if (save.level < choice.level) return { ok: false, error: `${choice.name} requires level ${choice.level}.` };
  }
  for (const [slot, stack] of Object.entries(save.equipment)) {
    if (!stack) continue;
    const def = ITEMS[stack.itemId];
    if (!def) return { ok: false, error: `Unknown equipped item: ${stack.itemId}` };
    if (stack.instance && (stack.qty !== 1 || !isEquippable(def))) return { ok: false, error: "Invalid equipment instance." };
    if (!isEquippable(def)) return { ok: false, error: `${def.name} cannot be equipped.` };
    if (stack.qty !== 1) return { ok: false, error: "Equipped items must be single pieces." };
    if (!canClassUse(def, save.classId)) return { ok: false, error: `${def.name} cannot be used by this class.` };
    if (def.requiresLevel && save.level < def.requiresLevel) return { ok: false, error: `${def.name} requires level ${def.requiresLevel}.` };
    if (slot !== def.type) return { ok: false, error: `${def.name} does not belong in the ${slot} slot.` };
  }
  if (new Set(save.achievements).size !== save.achievements.length || save.achievements.some((id) => !getAchievement(id))) {
    return { ok: false, error: "Unknown achievement." };
  }
  if (new Set(save.waypoints).size !== save.waypoints.length || save.waypoints.some((zone) => !ZONE_IDS.includes(zone))) {
    return { ok: false, error: "Unknown fast-travel point." };
  }
  for (const loadout of save.loadouts) {
    for (const stack of Object.values(loadout.equipment) as (ItemStack | undefined)[]) {
      if (!stack) continue;
      const def = ITEMS[stack.itemId];
      if (!def || !isEquippable(def)) return { ok: false, error: `Unknown saved gear: ${stack.itemId}` };
      if (stack.qty !== 1) return { ok: false, error: "Saved gear must be single pieces." };
    }
    for (const itemId of loadout.quickSlots) {
      if (itemId && ITEMS[itemId]?.type !== "consumable") return { ok: false, error: "Saved quick slots must hold consumables." };
    }
  }
  if (save.rival && !save.rival.species) return { ok: false, error: "Invalid rival." };
  const classDef = getClass(save.classId);
  if (save.level < 1 || save.level > LEVEL_CAP) return { ok: false, error: "Invalid level." };
  if (save.level !== clampLevel(save.level)) return { ok: false, error: "Invalid level." };
  if (!classDef) return { ok: false, error: "Unknown class." };
  return { ok: true, save };
}

export function migrateSave(input: unknown): CharacterSave {
  if (!input || typeof input !== "object") throw new Error("Save data is not an object.");
  const record = input as Record<string, unknown>;
  if (typeof record.version !== "number") throw new Error("Save is missing a version.");
  if (record.version > SAVE_VERSION) throw new Error("This save was created by a newer version of the game.");
  if (record.version < 1) throw new Error("This save version is no longer supported.");
  const migrated = { ...record };
  if (migrated.version === 1) {
    migrated.quickSlots = ["health_potion", null];
    migrated.version = 2;
  }
  if (migrated.version === 2) {
    migrated.talents = [];
    migrated.version = 3;
  }
  if (migrated.version === 3) {
    migrated.difficulty = "normal";
    migrated.ngPlus = 0;
    migrated.defeatedBosses = [];
    migrated.version = 4;
  }
  if (migrated.version === 4) {
    migrated.storyChapter = 0;
    migrated.version = 5;
  }
  if (migrated.version === 5) {
    migrated.version = 6;
  }
  if (migrated.version === 6) {
    migrated.relationships = {};
    migrated.version = 7;
  }
  if (migrated.version === 7) {
    if (Array.isArray(migrated.quests)) {
      migrated.quests = migrated.quests.map((state) => {
        if (!state || typeof state !== "object") return state;
        const questState = state as Record<string, unknown>;
        if (questState.id !== "forest_watch" || questState.completed === true || !Array.isArray(questState.progress)) return state;
        return { ...questState, progress: [0, ...questState.progress.slice(1)] };
      });
    }
    migrated.version = 8;
  }
  if (migrated.version === 8) {
    if (Array.isArray(migrated.quests)) {
      migrated.quests = migrated.quests.map((state) => {
        if (!state || typeof state !== "object") return state;
        const questState = state as Record<string, unknown>;
        if (questState.id !== "wider_world" || questState.completed === true) return state;
        const progress = Array.isArray(questState.progress) ? [0, ...questState.progress.slice(1)] : questState.progress;
        return { ...questState, progress, exploredZones: [] };
      });
    }
    migrated.version = 9;
  }
  if (migrated.version === 9) {
    migrated.npcKindRewards = [];
    migrated.version = 10;
  }
  if (migrated.version === 10) {
    // Older saves know nothing about lifetime counters, so they start from a clean slate.
    migrated.waypoints = ["village"];
    migrated.version = 11;
  }
  if (migrated.version === 11) {
    // The bounty board and shrine blessings arrived later; older heroes simply have none yet.
    migrated.bounties = [];
    migrated.blessingDay = -1;
    migrated.bountyStreak = 0;
    migrated.version = 12;
  }
  if (migrated.version === 12) {
    // Mastery, elemental reactions, the pin, the bestiary and the diary all arrived together.
    migrated.abilityUses = {};
    migrated.reactionsSeen = [];
    migrated.pinnedQuest = null;
    migrated.metMonsters = [];
    migrated.monsterKills = {};
    migrated.diary = [];
    migrated.version = 13;
  }
  if (migrated.version === 13) {
    // The Journey track, the rival, the Hollow Ring and saved gear sets all arrived together.
    migrated.journeyPoints = 0;
    migrated.deeds = [];
    migrated.journeyClaimed = 0;
    migrated.deedProgress = {};
    migrated.rival = null;
    migrated.arenaBest = 0;
    migrated.loadouts = [];
    migrated.version = 14;
  }
  if (migrated.version === 14) {
    // Mira's vault arrived later; every existing hero starts with the first tier, empty.
    migrated.stash = Array.from({ length: STASH_SIZE }, () => null);
    migrated.stashTier = 0;
    migrated.version = 15;
  }
  if (migrated.version === 15) {
    // The Endless Descent, daily streak and weekly best arrived together.
    migrated.descentBest = 0;
    migrated.descentShards = 0;
    migrated.descentRuns = [];
    migrated.dailyClaimedOn = "";
    migrated.dailyStreak = 0;
    migrated.weeklyKey = "";
    migrated.weeklyBest = 0;
    migrated.version = 16;
  }
  if (migrated.version === 16) {
    // Relics, the risk dial and the Ring's gauntlet arrived together; nobody owns any yet.
    migrated.descentRelics = [];
    migrated.descentPact = 0;
    migrated.gauntletCleared = [];
    migrated.version = 17;
  }
  if (typeof migrated.gold === "number" && Number.isFinite(migrated.gold) && migrated.gold > MAX_GOLD) {
    migrated.gold = MAX_GOLD;
  }
  if (typeof migrated.ngPlus === "number" && Number.isFinite(migrated.ngPlus) && migrated.ngPlus > 99) {
    migrated.ngPlus = 99;
  }
  const result = validateSave(migrated);
  if (!result.ok) throw new Error(result.error);
  return result.save;
}

export function cloneSave(save: CharacterSave): CharacterSave {
  return JSON.parse(JSON.stringify(save)) as CharacterSave;
}

export function characterSummary(save: CharacterSave): { id: string; name: string; classId: ClassId; level: number; zone: string; playtime: number; updatedAt: number } {
  return {
    id: save.id,
    name: save.name,
    classId: save.classId,
    level: save.level,
    zone: ZONES[save.zone].name,
    playtime: save.playtime,
    updatedAt: save.updatedAt,
  };
}
