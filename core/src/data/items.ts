import type { AffixId, ClassId, Equipment, GearSetId, ItemDef, ItemInstance, ItemStack, StatBonus } from "../types";
import type { Rng } from "../rng";

type ItemInput = Omit<ItemDef, "sell"> & { sell?: number };

function item(def: ItemInput): ItemDef {
  return { sell: def.buy ? Math.max(1, Math.round(def.buy * 0.4)) : 1, ...def };
}

const MELEE_BLADE: ClassId[] = ["warrior", "spellblade", "dragonknight"];
const HOLY_BLADE: ClassId[] = ["paladin"];
const STAFF_USERS: ClassId[] = ["mage", "priest", "necromancer", "druid", "summoner"];
const BOW_USERS: ClassId[] = ["archer", "ranger"];

const defs: ItemDef[] = [
  item({
    id: "iron_sword",
    name: "Iron Sword",
    type: "weapon",
    rarity: "common",
    icon: "sword",
    description: "A dependable soldier's blade. +4 attack.",
    stack: 1,
    buy: 45,
    classes: MELEE_BLADE,
    stats: { attack: 4 },
  }),
  item({
    id: "steel_sword",
    name: "Steel Sword",
    type: "weapon",
    rarity: "uncommon",
    icon: "sword",
    description: "Forged with care in Eldoria. +9 attack.",
    stack: 1,
    buy: 320,
    classes: MELEE_BLADE,
    stats: { attack: 9 },
  }),
  item({
    id: "oak_staff",
    name: "Oak Staff",
    type: "weapon",
    rarity: "common",
    icon: "staff",
    description: "Channels raw arcane focus. +3 attack, +10 resource.",
    stack: 1,
    buy: 45,
    classes: STAFF_USERS,
    stats: { attack: 3, maxResource: 10 },
  }),
  item({
    id: "ember_staff",
    name: "Ember Staff",
    type: "weapon",
    rarity: "uncommon",
    icon: "staff",
    description: "Warm to the touch. +8 attack, +20 resource.",
    stack: 1,
    buy: 300,
    classes: STAFF_USERS,
    stats: { attack: 8, maxResource: 20 },
    set: "ember",
  }),
  item({
    id: "shortbow",
    name: "Shortbow",
    type: "weapon",
    rarity: "common",
    icon: "bow",
    description: "Light and quick. +4 attack.",
    stack: 1,
    buy: 45,
    classes: BOW_USERS,
    stats: { attack: 4 },
  }),
  item({
    id: "yew_bow",
    name: "Yew Longbow",
    type: "weapon",
    rarity: "uncommon",
    icon: "bow",
    description: "A hunter's pride. +9 attack.",
    stack: 1,
    buy: 310,
    classes: BOW_USERS,
    stats: { attack: 9 },
  }),
  item({
    id: "iron_daggers",
    name: "Iron Daggers",
    type: "weapon",
    rarity: "common",
    icon: "dagger",
    description: "Quick, quiet, cruel. +4 attack, +2% crit.",
    stack: 1,
    buy: 48,
    classes: ["assassin"],
    stats: { attack: 4, crit: 0.02 },
  }),
  item({
    id: "shadow_fangs",
    name: "Shadow Fangs",
    type: "weapon",
    rarity: "uncommon",
    icon: "dagger",
    description: "They drink the light. +9 attack, +4% crit.",
    stack: 1,
    buy: 330,
    classes: ["assassin"],
    stats: { attack: 9, crit: 0.04 },
  }),
  item({
    id: "oathblade",
    name: "Oathblade",
    type: "weapon",
    rarity: "common",
    icon: "mace",
    description: "A sworn blade of the dawn. +4 attack, +2 defense.",
    stack: 1,
    buy: 50,
    classes: HOLY_BLADE,
    stats: { attack: 4, defense: 2 },
  }),
  item({
    id: "dawnblade",
    name: "Dawnblade",
    type: "weapon",
    rarity: "uncommon",
    icon: "mace",
    description: "Radiant and resolute. +8 attack, +5 defense.",
    stack: 1,
    buy: 320,
    classes: HOLY_BLADE,
    stats: { attack: 8, defense: 5 },
  }),
  item({
    id: "novice_staff",
    name: "Novice Staff",
    type: "weapon",
    rarity: "common",
    icon: "staff",
    description: "A simple staff for a devoted healer. +2 attack, +15 resource.",
    stack: 1,
    buy: 44,
    classes: STAFF_USERS,
    stats: { attack: 2, maxResource: 15 },
  }),
  item({
    id: "seraph_staff",
    name: "Seraph Staff",
    type: "weapon",
    rarity: "uncommon",
    icon: "staff",
    description: "Hums with gentle hymns. +6 attack, +30 resource.",
    stack: 1,
    buy: 300,
    classes: STAFF_USERS,
    stats: { attack: 6, maxResource: 30 },
  }),
  item({
    id: "bone_staff",
    name: "Bone Staff",
    type: "weapon",
    rarity: "common",
    icon: "staff",
    description: "Carved from the forgotten. +3 attack, +12 resource.",
    stack: 1,
    buy: 48,
    classes: STAFF_USERS,
    stats: { attack: 3, maxResource: 12 },
  }),
  item({
    id: "soul_staff",
    name: "Soul Staff",
    type: "weapon",
    rarity: "uncommon",
    icon: "staff",
    description: "Whispers when no one speaks. +8 attack, +24 resource.",
    stack: 1,
    buy: 320,
    classes: STAFF_USERS,
    stats: { attack: 8, maxResource: 24 },
  }),
  item({
    id: "training_wraps",
    name: "Training Wraps",
    type: "weapon",
    rarity: "common",
    icon: "fist",
    description: "Worn cloth with old lessons. +4 attack, +4 speed.",
    stack: 1,
    buy: 44,
    classes: ["monk"],
    stats: { attack: 4, moveSpeed: 4 },
  }),
  item({
    id: "dragon_knuckles",
    name: "Dragon Knuckles",
    type: "weapon",
    rarity: "uncommon",
    icon: "fist",
    description: "Strike like falling mountains. +10 attack, +6 speed.",
    stack: 1,
    buy: 340,
    classes: ["monk"],
    stats: { attack: 10, moveSpeed: 6 },
  }),
  item({
    id: "flintlock",
    name: "Flintlock",
    type: "weapon",
    rarity: "common",
    icon: "gun",
    description: "Loud, but effective. +4 attack.",
    stack: 1,
    buy: 50,
    classes: ["gunslinger"],
    stats: { attack: 4 },
  }),
  item({
    id: "stormlock",
    name: "Stormlock",
    type: "weapon",
    rarity: "uncommon",
    icon: "gun",
    description: "Crackling with bottled lightning. +9 attack, +3% crit.",
    stack: 1,
    buy: 330,
    classes: ["gunslinger"],
    stats: { attack: 9, crit: 0.03 },
  }),
  item({
    id: "hand_axe",
    name: "Hand Axe",
    type: "weapon",
    rarity: "common",
    icon: "axe",
    description: "Heavy enough to make a point. +5 attack.",
    stack: 1,
    buy: 46,
    classes: ["berserker"],
    stats: { attack: 5 },
  }),
  item({
    id: "blood_axe",
    name: "Blood Axe",
    type: "weapon",
    rarity: "uncommon",
    icon: "axe",
    description: "It remembers every blow. +11 attack, -2 defense.",
    stack: 1,
    buy: 320,
    classes: ["berserker"],
    stats: { attack: 11, defense: -2 },
  }),
  item({
    id: "apprentice_tome",
    name: "Apprentice Tome",
    type: "weapon",
    rarity: "common",
    icon: "book",
    description: "A primer on calling companions. +3 attack, +10 resource.",
    stack: 1,
    buy: 46,
    classes: ["summoner"],
    stats: { attack: 3, maxResource: 10 },
  }),
  item({
    id: "grimoire",
    name: "Primal Grimoire",
    type: "weapon",
    rarity: "uncommon",
    icon: "book",
    description: "Bound in bark and silver. +7 attack, +25 resource.",
    stack: 1,
    buy: 310,
    classes: ["summoner"],
    stats: { attack: 7, maxResource: 25 },
  }),
  item({
    id: "runeblade",
    name: "Runeblade",
    type: "weapon",
    rarity: "common",
    icon: "sword",
    description: "Etched with a single bright rune. +4 attack, +8 resource.",
    stack: 1,
    buy: 50,
    classes: ["spellblade"],
    stats: { attack: 4, maxResource: 8 },
  }),
  item({
    id: "spellblade",
    name: "Spellblade of Eldoria",
    type: "weapon",
    rarity: "uncommon",
    icon: "sword",
    description: "Where steel ends, magic begins. +9 attack, +18 resource.",
    stack: 1,
    buy: 330,
    classes: ["spellblade"],
    stats: { attack: 9, maxResource: 18 },
  }),
  item({
    id: "dragon_lance",
    name: "Dragon Lance",
    type: "weapon",
    rarity: "common",
    icon: "lance",
    description: "Long, balanced, and draconic. +5 attack, +2 defense.",
    stack: 1,
    buy: 52,
    classes: ["dragonknight"],
    stats: { attack: 5, defense: 2 },
  }),
  item({
    id: "wyrmblade",
    name: "Wyrmblade",
    type: "weapon",
    rarity: "uncommon",
    icon: "lance",
    description: "Its edge glows like a furnace. +11 attack, +4 defense.",
    stack: 1,
    buy: 340,
    classes: ["dragonknight"],
    stats: { attack: 11, defense: 4 },
  }),
  item({
    id: "cloth_robe",
    name: "Cloth Robe",
    type: "armor",
    rarity: "common",
    icon: "armor",
    description: "Simple woven protection. +1 defense, +15 resource.",
    stack: 1,
    buy: 40,
    stats: { defense: 1, maxResource: 15 },
    set: "ember",
  }),
  item({
    id: "leather_armor",
    name: "Leather Armor",
    type: "armor",
    rarity: "common",
    icon: "armor",
    description: "Supple and sturdy. +2 defense, +10 health.",
    stack: 1,
    buy: 65,
    stats: { defense: 2, maxHp: 10 },
    set: "wanderer",
  }),
  item({
    id: "chainmail",
    name: "Chainmail",
    type: "armor",
    rarity: "uncommon",
    icon: "armor",
    description: "Interlocking rings of good iron. +5 defense, +25 health.",
    stack: 1,
    buy: 230,
    stats: { defense: 5, maxHp: 25 },
  }),
  item({
    id: "plate_armor",
    name: "Plate Armor",
    type: "armor",
    rarity: "rare",
    icon: "armor",
    description: "A walking fortress. +9 defense, +45 health.",
    stack: 1,
    buy: 540,
    stats: { defense: 9, maxHp: 45 },
    set: "ironclad",
    requiresLevel: 10,
  }),
  item({
    id: "leather_cap",
    name: "Leather Cap",
    type: "helm",
    rarity: "common",
    icon: "helm",
    description: "Keeps the rain out. +1 defense, +5 health.",
    stack: 1,
    buy: 35,
    stats: { defense: 1, maxHp: 5 },
    set: "wanderer",
  }),
  item({
    id: "iron_helm",
    name: "Iron Helm",
    type: "helm",
    rarity: "uncommon",
    icon: "helm",
    description: "Dented, but honest. +3 defense, +15 health.",
    stack: 1,
    buy: 170,
    stats: { defense: 3, maxHp: 15 },
    set: "ironclad",
  }),
  item({
    id: "traveler_boots",
    name: "Traveler's Boots",
    type: "boots",
    rarity: "common",
    icon: "boots",
    description: "Made for long roads. +1 defense, +5 speed.",
    stack: 1,
    buy: 45,
    stats: { defense: 1, moveSpeed: 5 },
    set: "wanderer",
  }),
  item({
    id: "swift_boots",
    name: "Swift Boots",
    type: "boots",
    rarity: "uncommon",
    icon: "boots",
    description: "Barely seem to touch the ground. +2 defense, +10 speed.",
    stack: 1,
    buy: 240,
    stats: { defense: 2, moveSpeed: 10 },
    set: "ironclad",
  }),
  item({
    id: "copper_ring",
    name: "Copper Ring",
    type: "trinket",
    rarity: "common",
    icon: "ring",
    description: "A lucky find. +2% crit.",
    stack: 1,
    buy: 85,
    stats: { crit: 0.02 },
    set: "wanderer",
  }),
  item({
    id: "sage_amulet",
    name: "Sage Amulet",
    type: "trinket",
    rarity: "uncommon",
    icon: "ring",
    description: "Clears the mind. +20 resource.",
    stack: 1,
    buy: 200,
    stats: { maxResource: 20 },
    set: "ember",
  }),
  item({
    id: "health_potion",
    name: "Health Potion",
    type: "consumable",
    rarity: "common",
    icon: "potion_red",
    description: "Restores 60 health.",
    stack: 20,
    buy: 25,
    heal: 60,
  }),
  item({
    id: "greater_health_potion",
    name: "Greater Health Potion",
    type: "consumable",
    rarity: "uncommon",
    icon: "potion_red",
    description: "Restores 180 health.",
    stack: 20,
    buy: 70,
    heal: 180,
  }),
  item({
    id: "mana_potion",
    name: "Mana Potion",
    type: "consumable",
    rarity: "common",
    icon: "potion_blue",
    description: "Restores 60 resource.",
    stack: 20,
    buy: 25,
    restore: 60,
  }),
  item({
    id: "greater_mana_potion",
    name: "Greater Mana Potion",
    type: "consumable",
    rarity: "uncommon",
    icon: "potion_blue",
    description: "Restores 180 resource.",
    stack: 20,
    buy: 70,
    restore: 180,
  }),
  item({
    id: "herb",
    name: "Silverleaf Herb",
    type: "material",
    rarity: "common",
    icon: "herb",
    description: "A fragrant herb used in healing salves.",
    stack: 50,
    buy: 18,
  }),
  item({
    id: "slime_gel",
    name: "Slime Gel",
    type: "material",
    rarity: "common",
    icon: "gel",
    description: "Wobbly green residue. Alchemists pay for it.",
    stack: 50,
  }),
  item({
    id: "wolf_pelt",
    name: "Wolf Pelt",
    type: "material",
    rarity: "common",
    icon: "pelt",
    description: "Warm, thick, and slightly chewed.",
    stack: 50,
  }),
  item({
    id: "bone_shard",
    name: "Bone Shard",
    type: "material",
    rarity: "uncommon",
    icon: "bone",
    description: "A shard of restless bone from the dungeon.",
    stack: 50,
  }),
  item({
    id: "iron_ore",
    name: "Iron Ore",
    type: "material",
    rarity: "common",
    icon: "ore",
    description: "Raw metal for the forge.",
    stack: 50,
  }),
  item({
    id: "gemstone",
    name: "Eldoria Gemstone",
    type: "material",
    rarity: "rare",
    icon: "gem",
    description: "A shard of concentrated starlight. Valuable.",
    stack: 20,
  }),
  item({
    id: "gold_coin",
    name: "Gold Coin",
    type: "material",
    rarity: "common",
    icon: "coin",
    description: "Currency of the realm.",
    stack: 9999,
  }),
];

export const ITEMS: Record<string, ItemDef> = Object.fromEntries(defs.map((d) => [d.id, d]));
export const ITEM_LIST = defs;

export function getItem(id: string): ItemDef {
  const itemDef = ITEMS[id];
  if (!itemDef) throw new Error(`Unknown item: ${id}`);
  return itemDef;
}

export function isEquippable(item: ItemDef): boolean {
  return item.type === "weapon" || item.type === "armor" || item.type === "helm" || item.type === "boots" || item.type === "trinket";
}

export function canClassUse(item: ItemDef, classId: ClassId): boolean {
  return !item.classes || item.classes.includes(classId);
}

export const MAX_UPGRADE = 5;

export interface AffixDef {
  id: AffixId;
  name: string;
  suffix: string;
  stats: StatBonus;
}

export const AFFIXES: Record<AffixId, AffixDef> = {
  fierce: { id: "fierce", name: "Fierce", suffix: "of Fury", stats: { attack: 2 } },
  keen: { id: "keen", name: "Keen", suffix: "of Precision", stats: { crit: 0.015 } },
  sturdy: { id: "sturdy", name: "Sturdy", suffix: "of the Bear", stats: { defense: 2 } },
  vital: { id: "vital", name: "Vital", suffix: "of Vitality", stats: { maxHp: 12 } },
  swift: { id: "swift", name: "Swift", suffix: "of the Wind", stats: { moveSpeed: 3 } },
  arcane: { id: "arcane", name: "Arcane", suffix: "of the Arcane", stats: { maxResource: 10 } },
  warded: { id: "warded", name: "Warded", suffix: "of Warding", stats: { defense: 1, maxHp: 6 } },
  brutal: { id: "brutal", name: "Brutal", suffix: "of Ruin", stats: { attack: 1, crit: 0.01 } },
};

export const AFFIX_LIST = Object.values(AFFIXES);
export const AFFIX_IDS = Object.keys(AFFIXES) as AffixId[];

const AFFIX_COUNT: Record<string, number> = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };

export function createItemInstance(itemId: string, rng: Rng, bonusAffixes = 0): ItemInstance | undefined {
  const def = ITEMS[itemId];
  if (!def || !isEquippable(def)) return undefined;
  const count = Math.min(AFFIX_IDS.length, (AFFIX_COUNT[def.rarity] ?? 0) + bonusAffixes);
  const pool = [...AFFIX_IDS];
  const affixes: AffixId[] = [];
  for (let i = 0; i < count; i += 1) {
    const index = Math.floor(rng.next() * pool.length);
    const [picked] = pool.splice(index, 1);
    if (picked) affixes.push(picked);
  }
  return { uid: `i_${Math.floor(rng.next() * 0xffffffff).toString(36)}`, affixes, upgrade: 0 };
}

export function itemStats(stack: ItemStack): StatBonus {
  const def = getItem(stack.itemId);
  const total: StatBonus = { ...(def.stats ?? {}) };
  for (const affixId of stack.instance?.affixes ?? []) {
    const affix = AFFIXES[affixId];
    if (!affix) continue;
    for (const [key, value] of Object.entries(affix.stats) as [keyof StatBonus, number][]) {
      total[key] = (total[key] ?? 0) + value;
    }
  }
  const multiplier = 1 + (stack.instance?.upgrade ?? 0) * 0.08;
  for (const key of Object.keys(total) as (keyof StatBonus)[]) {
    total[key] = Math.round((total[key] ?? 0) * multiplier * 100) / 100;
  }
  return total;
}

export function itemDisplayName(stack: ItemStack): string {
  const def = getItem(stack.itemId);
  const upgrade = stack.instance?.upgrade ?? 0;
  const prefix = upgrade >= 5 ? "Masterwork " : upgrade >= 3 ? "Superior " : upgrade >= 1 ? "Fine " : "";
  const suffixes = (stack.instance?.affixes ?? []).map((id) => AFFIXES[id]?.suffix).filter(Boolean);
  return `${prefix}${def.name}${suffixes.length ? ` ${suffixes.join(" & ")}` : ""}`;
}

export function itemSellValue(stack: ItemStack): number {
  const def = getItem(stack.itemId);
  return def.sell + (stack.instance?.affixes.length ?? 0) * 12 + (stack.instance?.upgrade ?? 0) * 18;
}

export interface GearSetDef {
  id: GearSetId;
  name: string;
  bonuses: { pieces: number; stats: StatBonus; text: string }[];
}

export const GEAR_SETS: Record<GearSetId, GearSetDef> = {
  wanderer: {
    id: "wanderer",
    name: "Wanderer's Path",
    bonuses: [
      { pieces: 2, stats: { defense: 2, moveSpeed: 3 }, text: "Light Step: +2 Defense, +3 Move Speed" },
      { pieces: 4, stats: { maxHp: 20, crit: 0.02 }, text: "Trailblazer: +20 Health, +2% Crit" },
    ],
  },
  ironclad: {
    id: "ironclad",
    name: "Ironclad Bulwark",
    bonuses: [
      { pieces: 2, stats: { defense: 4 }, text: "Bulwark: +4 Defense" },
      { pieces: 3, stats: { maxHp: 40, defense: 4 }, text: "Unbreakable: +40 Health, +4 Defense" },
    ],
  },
  ember: {
    id: "ember",
    name: "Emberweave",
    bonuses: [
      { pieces: 2, stats: { maxResource: 15 }, text: "Kindled: +15 Resource" },
      { pieces: 3, stats: { attack: 5, crit: 0.02 }, text: "Inferno: +5 Attack, +2% Crit" },
    ],
  },
};

export function equipmentSetBonuses(equipment: Equipment): StatBonus {
  const counts: Partial<Record<GearSetId, number>> = {};
  for (const stack of Object.values(equipment)) {
    if (!stack) continue;
    const set = ITEMS[stack.itemId]?.set;
    if (set) counts[set] = (counts[set] ?? 0) + 1;
  }
  const total: StatBonus = {};
  for (const [setId, count] of Object.entries(counts) as [GearSetId, number][]) {
    for (const bonus of GEAR_SETS[setId].bonuses) {
      if (count < bonus.pieces) continue;
      for (const [key, value] of Object.entries(bonus.stats) as [keyof StatBonus, number][]) {
        total[key] = (total[key] ?? 0) + value;
      }
    }
  }
  return total;
}

export interface CraftRecipe {
  id: string;
  name: string;
  resultItemId: string;
  materials: { itemId: string; qty: number }[];
  gold: number;
  // The zone where the key material is found. Shown on the craft window so
  // players know where to gather before they come back to the forge.
  zone: string;
}

export const RECIPES: CraftRecipe[] = [
  { id: "craft_iron_sword", name: "Iron Sword", resultItemId: "iron_sword", materials: [{ itemId: "iron_ore", qty: 3 }], gold: 20, zone: "Whispering Forest" },
  { id: "craft_steel_sword", name: "Steel Sword", resultItemId: "steel_sword", materials: [{ itemId: "iron_ore", qty: 6 }, { itemId: "gemstone", qty: 1 }], gold: 120, zone: "Sunken Barrow" },
  { id: "craft_chainmail", name: "Chainmail", resultItemId: "chainmail", materials: [{ itemId: "iron_ore", qty: 5 }, { itemId: "wolf_pelt", qty: 2 }], gold: 100, zone: "Whispering Forest" },
  { id: "craft_plate_armor", name: "Plate Armor", resultItemId: "plate_armor", materials: [{ itemId: "iron_ore", qty: 10 }, { itemId: "gemstone", qty: 2 }], gold: 300, zone: "Frostfell Ruins" },
  { id: "craft_ember_staff", name: "Ember Staff", resultItemId: "ember_staff", materials: [{ itemId: "iron_ore", qty: 4 }, { itemId: "gemstone", qty: 2 }], gold: 150, zone: "Ashen Marsh" },
  { id: "craft_greater_health_potion", name: "Greater Health Potion", resultItemId: "greater_health_potion", materials: [{ itemId: "herb", qty: 3 }, { itemId: "slime_gel", qty: 1 }], gold: 15, zone: "Eldoria Village" },
];

export function getRecipe(id: string): CraftRecipe | undefined {
  return RECIPES.find((recipe) => recipe.id === id);
}
