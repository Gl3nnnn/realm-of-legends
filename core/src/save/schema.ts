import { z } from "zod";
import { INVENTORY_SIZE, LEVEL_CAP, SAVE_VERSION } from "../constants";
import { getClass, CLASSES } from "../data/classes";
import { ITEMS, canClassUse, isEquippable } from "../data/items";
import { getZone, ZONES } from "../generated/world-data";
import type { CharacterSave, ClassId, ItemStack } from "../types";
import { clampLevel } from "../progression";

const CLASS_IDS = Object.keys(CLASSES) as [ClassId, ...ClassId[]];
const ZONE_IDS = ["village", "forest", "dungeon"] as const;

const itemStackSchema = z.object({
  itemId: z.string().min(1),
  qty: z.number().int().min(1).max(9999),
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
});

export const saveSchema = z.object({
  version: z.literal(SAVE_VERSION),
  id: z.string().min(1).max(80),
  name: z.string().min(1).max(16),
  classId: z.enum(CLASS_IDS),
  level: z.number().int().min(1).max(LEVEL_CAP),
  xp: z.number().int().min(0),
  gold: z.number().int().min(0).max(9_999_999),
  hp: z.number().finite().min(0),
  resource: z.number().finite().min(0),
  zone: z.enum(ZONE_IDS),
  x: z.number().finite(),
  y: z.number().finite(),
  inventory: z.array(itemStackSchema.nullable()).length(INVENTORY_SIZE),
  equipment: equipmentSchema,
  quests: z.array(questSchema),
  openedChests: z.array(z.string()),
  playtime: z.number().finite().min(0),
  rngState: z.number().int().min(0).max(0xffffffff),
  createdAt: z.number().int().min(0),
  updatedAt: z.number().int().min(0),
});

export const MAX_NAME_LENGTH = 16;

export function sanitizeName(raw: string): string {
  return raw.replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, MAX_NAME_LENGTH);
}

export function isValidName(raw: string): boolean {
  const name = sanitizeName(raw);
  return name.length >= 2 && /^[\p{L}\p{N}][\p{L}\p{N} _'’.-]*$/u.test(name);
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
    equipment,
    quests: [],
    openedChests: [],
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
  for (const stack of save.inventory) {
    if (!stack) continue;
    if (!ITEMS[stack.itemId]) return { ok: false, error: `Unknown inventory item: ${stack.itemId}` };
  }
  for (const [slot, stack] of Object.entries(save.equipment)) {
    if (!stack) continue;
    const def = ITEMS[stack.itemId];
    if (!def) return { ok: false, error: `Unknown equipped item: ${stack.itemId}` };
    if (!isEquippable(def)) return { ok: false, error: `${def.name} cannot be equipped.` };
    if (!canClassUse(def, save.classId)) return { ok: false, error: `${def.name} cannot be used by this class.` };
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
  if (record.version < SAVE_VERSION) {
    throw new Error("This save version is no longer supported.");
  }
  const result = validateSave(record);
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
