import { z } from "zod";
import { INVENTORY_SIZE, LEVEL_CAP, MAX_GOLD, PLAYER_RADIUS, SAVE_VERSION } from "../constants";
import { getClass, CLASSES } from "../data/classes";
import { AFFIX_IDS, ITEMS, MAX_UPGRADE, canClassUse, isEquippable } from "../data/items";
import { getTalentChoice, talentTierChosen } from "../data/talents";
import { NPCS } from "../data/npcs";
import { getZone, ZONES } from "../generated/world-data";
import type { CharacterSave, ClassId, ItemStack } from "../types";
import { clampLevel } from "../progression";

const CLASS_IDS = Object.keys(CLASSES) as [ClassId, ...ClassId[]];
const ZONE_IDS = ["village", "forest", "dungeon", "marsh", "frost", "throne"] as const;
const DIFFICULTIES = ["story", "normal", "nightmare"] as const;
const BOSS_IDS = ["bone_warden", "miremother", "frost_revenant", "hollow_king"] as const;

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
  relationships: z.record(z.string().min(1).max(40), z.number().int().min(-10).max(10)).default({}),
  npcKindRewards: z.array(z.string().min(1)).max(Object.keys(NPCS).length).default([]),
  playtime: z.number().finite().min(0),
  rngState: z.number().int().min(0).max(0xffffffff),
  createdAt: z.number().int().min(0),
  updatedAt: z.number().int().min(0),
  companion: z.object({ kind: z.literal("egg"), name: z.string().min(1).max(16), hatched: z.boolean().optional(), species: z.string().max(24).optional() }).optional(),
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
  const inventory: (ItemStack | null)[] = new Array(INVENTORY_SIZE).fill(null);
  inventory[0] = { itemId: "health_potion", qty: 3 };
  const zone = ZONES.village;
  return {
    version: SAVE_VERSION,
    id: options.id ?? newId(),
    name: clean,
    classId,
    level: 1,
    xp: 0,
    gold: 30,
    hp: classDef.base.maxHp,
    resource: classDef.base.maxResource,
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
