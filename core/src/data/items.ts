import type { AffixId, ClassId, Equipment, GearSetId, ItemDef, ItemInstance, ItemStack, Rarity, StatBonus } from "../types";
import type { Rng } from "../rng";

type ItemInput = Omit<ItemDef, "sell"> & { sell?: number };

function item(def: ItemInput): ItemDef {
  return { sell: def.buy ? Math.max(1, Math.round(def.buy * 0.4)) : 1, ...def };
}

const MELEE_BLADE: ClassId[] = ["warrior", "spellblade", "dragonknight"];
const HOLY_BLADE: ClassId[] = ["paladin"];
const STAFF_USERS: ClassId[] = ["mage", "priest", "necromancer", "druid", "summoner"];
const BOW_USERS: ClassId[] = ["archer", "ranger"];

type ExpandedWeapon = readonly [
  id: string,
  name: string,
  classId: ClassId,
  icon: string,
  rarity: Rarity,
  attack: number,
  flavor: string,
  secondary?: StatBonus,
];

const expandedWeaponCatalog: ExpandedWeapon[] = [
  ["relic_weapon_bastard_sword", "Bastard Sword", "warrior", "sword", "uncommon", 8, "A balanced blade made for the press of the front line", { defense: 1 }],
  ["relic_weapon_lions_guard", "Lion's Guard Greatsword", "warrior", "sword", "rare", 15, "A broad greatsword bearing the old royal crest", { maxHp: 14 }],
  ["relic_weapon_kingslayer", "Kingslayer", "warrior", "sword", "epic", 23, "A black-edged sword forged to end a tyrant's reign", { crit: 0.03 }],
  ["relic_weapon_ashwood_wand", "Ashwood Wand", "mage", "staff", "uncommon", 6, "A quick-casting wand cut from a lightning-struck tree", { maxResource: 16 }],
  ["relic_weapon_starfall_staff", "Starfall Staff", "mage", "staff", "rare", 13, "A meteor shard set into a measured arcane focus", { maxResource: 30 }],
  ["relic_weapon_astral_scepter", "Astral Scepter", "mage", "staff", "epic", 20, "A silver scepter that hums beneath the night sky", { maxResource: 48, crit: 0.02 }],
  ["relic_weapon_longleaf_bow", "Longleaf Bow", "archer", "bow", "uncommon", 8, "A quiet bow shaped for clear shots through the canopy", { crit: 0.02 }],
  ["relic_weapon_falcon_bow", "Falconstrung Longbow", "archer", "bow", "rare", 15, "A taut longbow favored by the royal outriders", { moveSpeed: 3 }],
  ["relic_weapon_starshot_bow", "Starshot Bow", "archer", "bow", "epic", 22, "A pale bow whose arrows leave a streak of light", { crit: 0.04 }],
  ["relic_weapon_hooked_knife", "Hooked Knife", "assassin", "dagger", "uncommon", 7, "A hooked edge designed for swift, precise strikes", { crit: 0.03 }],
  ["relic_weapon_duskfangs", "Duskfangs", "assassin", "dagger", "rare", 14, "Twin dark-steel blades that vanish in low light", { crit: 0.05 }],
  ["relic_weapon_night_reaper", "Night Reaper", "assassin", "dagger", "epic", 21, "A curved dagger that seems to swallow its own shadow", { moveSpeed: 5, crit: 0.03 }],
  ["relic_weapon_sunhammer", "Sunhammer", "paladin", "mace", "uncommon", 8, "A bright-headed hammer blessed at the eastern shrine", { defense: 2 }],
  ["relic_weapon_vowkeepers_mace", "Vowkeeper's Mace", "paladin", "mace", "rare", 15, "A steadfast mace carried by the keepers of the oath", { maxHp: 18 }],
  ["relic_weapon_radiant_verdict", "Radiant Verdict", "paladin", "mace", "epic", 22, "A golden war-mace that answers an unbroken vow", { defense: 5 }],
  ["relic_weapon_blessing_wand", "Blessing Wand", "priest", "staff", "uncommon", 6, "A willow wand marked with a simple healing prayer", { maxResource: 18 }],
  ["relic_weapon_cantor_staff", "Cantor's Staff", "priest", "staff", "rare", 13, "A hymn-carved staff that steadies its bearer's spirit", { maxHp: 20, maxResource: 20 }],
  ["relic_weapon_dawn_chorus", "Dawn Chorus", "priest", "staff", "epic", 20, "A sunlit staff that rings with a choir's first note", { maxResource: 50 }],
  ["relic_weapon_marrow_staff", "Marrow Staff", "necromancer", "staff", "uncommon", 7, "A bone-inlaid focus recovered from an old barrow", { maxResource: 16 }],
  ["relic_weapon_gravecaller", "Gravecaller's Rod", "necromancer", "staff", "rare", 14, "A somber rod that draws power from forgotten names", { crit: 0.03, maxResource: 24 }],
  ["relic_weapon_lich_scepter", "Lich's Scepter", "necromancer", "staff", "epic", 21, "A cold scepter bound with a fragment of lost will", { maxResource: 48 }],
  ["relic_weapon_briar_staff", "Briar Staff", "druid", "staff", "uncommon", 7, "A living branch shaped without harming its tree", { maxHp: 14, maxResource: 10 }],
  ["relic_weapon_rootwarden", "Rootwarden", "druid", "staff", "rare", 14, "A deep-rooted staff that carries the forest's patience", { defense: 2, maxResource: 24 }],
  ["relic_weapon_wildheart", "Wildheart", "druid", "staff", "epic", 21, "A greenwood staff alive with untamed growth", { maxHp: 30, maxResource: 28 }],
  ["relic_weapon_iron_palm_wraps", "Iron Palm Wraps", "monk", "fist", "uncommon", 8, "Reinforced wraps for disciplined close-quarters forms", { moveSpeed: 3 }],
  ["relic_weapon_cloudstep_gauntlets", "Cloudstep Gauntlets", "monk", "fist", "rare", 15, "Light gauntlets that follow the rhythm of the wind", { moveSpeed: 6 }],
  ["relic_weapon_mountain_breakers", "Mountain Breakers", "monk", "fist", "epic", 23, "Heavy striking guards made for a master's final lesson", { maxHp: 18, moveSpeed: 4 }],
  ["relic_weapon_brass_repeater", "Brass Repeater", "gunslinger", "gun", "uncommon", 8, "A compact repeater with a reliable spring action", { crit: 0.02 }],
  ["relic_weapon_thunderhand", "Thunderhand", "gunslinger", "gun", "rare", 15, "A balanced hand-cannon with a crackling firing pin", { attack: 2, crit: 0.02 }],
  ["relic_weapon_deadeye", "Deadeye", "gunslinger", "gun", "epic", 22, "A long-barreled pistol tuned for a single sure shot", { crit: 0.05 }],
  ["relic_weapon_cleaver", "Warpath Cleaver", "berserker", "axe", "uncommon", 9, "A heavy cleaver that rewards a fearless charge", { maxHp: 12 }],
  ["relic_weapon_warhowl_axe", "Warhowl Axe", "berserker", "axe", "rare", 17, "A broad axe that rings like a battle cry", { attack: 2, defense: -1 }],
  ["relic_weapon_titan_splitter", "Titan Splitter", "berserker", "axe", "epic", 25, "An enormous axe forged for the strongest hands", { maxHp: 22, defense: -2 }],
  ["relic_weapon_spirit_tome", "Spirit Tome", "summoner", "book", "uncommon", 6, "A field guide to the names of willing spirits", { maxResource: 18 }],
  ["relic_weapon_pactbinder", "Pactbinder's Tome", "summoner", "book", "rare", 13, "A careful record of old pacts and their costs", { maxResource: 32 }],
  ["relic_weapon_worldcaller", "Worldcaller", "summoner", "book", "epic", 20, "A living grimoire that answers to a patient voice", { maxHp: 18, maxResource: 42 }],
  ["relic_weapon_recurve_bow", "Recurve Bow", "ranger", "bow", "uncommon", 8, "A flexible bow suited to long trails and quick turns", { moveSpeed: 3 }],
  ["relic_weapon_thornflight", "Thornflight", "ranger", "bow", "rare", 15, "A thornwood bow made for hunters of the deep marsh", { crit: 0.03, moveSpeed: 3 }],
  ["relic_weapon_stormpath", "Stormpath Bow", "ranger", "bow", "epic", 22, "A storm-grey bow built for the farthest shot", { crit: 0.04, moveSpeed: 4 }],
  ["relic_weapon_runic_sabre", "Runic Sabre", "spellblade", "sword", "uncommon", 8, "A quick sabre inscribed with a single binding rune", { maxResource: 14 }],
  ["relic_weapon_spellfire_edge", "Spellfire Edge", "spellblade", "sword", "rare", 15, "A bright-edged blade that holds a steady flame", { maxResource: 24, crit: 0.02 }],
  ["relic_weapon_astral_duelist", "Astral Duelist", "spellblade", "sword", "epic", 23, "A finely balanced sword etched with star charts", { maxResource: 34, crit: 0.03 }],
  ["relic_weapon_drake_spear", "Drake Spear", "dragonknight", "lance", "uncommon", 9, "A dragon-scaled spear with a guarded haft", { defense: 2 }],
  ["relic_weapon_wyrmguard_lance", "Wyrmguard Lance", "dragonknight", "lance", "rare", 17, "A long lance built to hold the line against a wyrm", { defense: 4 }],
  ["relic_weapon_dragonheart", "Dragonheart Pike", "dragonknight", "lance", "epic", 25, "A crimson pike warmed by the heart of a drake", { maxHp: 20, defense: 3 }],
  ["relic_weapon_warden_greatblade", "Warden's Greatblade", "warrior", "sword", "legendary", 30, "A gate-guard's blade reforged after the barrow fell", { defense: 4, maxHp: 25 }],
  ["relic_weapon_moonwood_longbow", "Moonwood Longbow", "ranger", "bow", "legendary", 29, "A moonlit bow carried by the marshland wardens", { crit: 0.05, moveSpeed: 5 }],
  ["relic_weapon_dawnward_mace", "Dawnward Mace", "paladin", "mace", "legendary", 30, "A relic mace entrusted only to a steadfast protector", { defense: 7 }],
  ["relic_weapon_voidthorn_stiletto", "Voidthorn Stiletto", "assassin", "dagger", "legendary", 28, "A silent blade recovered from beyond the frozen throne", { crit: 0.06, moveSpeed: 5 }],
  ["relic_weapon_eldritch_tome", "Eldritch Tome", "mage", "book", "legendary", 27, "A star-bound tome whose pages turn without a hand", { maxResource: 60, crit: 0.03 }],
];

function describeStats(stats: StatBonus): string {
  const labels: Record<keyof StatBonus, string> = {
    attack: "attack",
    defense: "defense",
    maxHp: "health",
    maxResource: "resource",
    crit: "crit",
    moveSpeed: "speed",
  };
  return Object.entries(stats).map(([key, value]) => {
    const label = labels[key as keyof StatBonus];
    const amount = key === "crit" ? `${Math.round(value * 100)}%` : `${value}`;
    return `${value > 0 ? "+" : ""}${amount} ${label}`;
  }).join(", ");
}

const weaponUnlocks: Record<Exclude<Rarity, "common">, { level: number; buy: number }> = {
  uncommon: { level: 3, buy: 220 },
  rare: { level: 9, buy: 900 },
  epic: { level: 17, buy: 2800 },
  legendary: { level: 22, buy: 5600 },
};

const EXPANSION_CLASS_COMPATIBILITY: Partial<Record<ClassId, ClassId[]>> = {
  warrior: ["warden", "duelist"],
  priest: ["oracle"],
  spellblade: ["battlemage"],
  assassin: ["shadowdancer"],
  gunslinger: ["artificer"],
  ranger: ["beastmaster"],
  mage: ["elementalist", "stormcaller"],
  paladin: ["sentinel"],
};

const expandedWeapons = expandedWeaponCatalog.map(([id, name, classId, icon, rarity, attack, flavor, secondary = {}]) => {
  const { level, buy } = weaponUnlocks[rarity as Exclude<Rarity, "common">];
  const stats = { ...secondary, attack: attack + (secondary.attack ?? 0) };
  return item({
    id,
    name,
    type: "weapon",
    rarity,
    icon,
    description: `${flavor}. ${describeStats(stats)}.`,
    stack: 1,
    buy,
    classes: [classId, ...(EXPANSION_CLASS_COMPATIBILITY[classId] ?? [])],
    stats,
    requiresLevel: level,
  });
});

const expandedGear = [
  item({ id: "relic_armor_swampguard", name: "Swampguard Vest", type: "armor", rarity: "uncommon", icon: "armor", description: "Waxed marsh-hide stitched over a flexible iron lining. +4 defense, +18 health.", stack: 1, buy: 260, requiresLevel: 4, stats: { defense: 4, maxHp: 18 } }),
  item({ id: "relic_armor_frostforged", name: "Frostforged Cuirass", type: "armor", rarity: "epic", icon: "armor", description: "Cold-forged plates that turn aside the Frostfell wind. +10 defense, +45 health.", stack: 1, buy: 1800, requiresLevel: 15, stats: { defense: 10, maxHp: 45 } }),
  item({ id: "relic_armor_duskweave", name: "Duskweave Coat", type: "armor", rarity: "rare", icon: "armor", description: "Shadow-thread cloth reinforced at every seam. +4 defense, +28 health, +4 speed.", stack: 1, buy: 780, requiresLevel: 10, stats: { defense: 4, maxHp: 28, moveSpeed: 4 } }),
  item({ id: "relic_armor_sunforged", name: "Sunforged Mail", type: "armor", rarity: "epic", icon: "armor", description: "Bright mail tempered in a furnace that never cools. +9 defense, +35 health, +18 resource.", stack: 1, buy: 2100, requiresLevel: 18, stats: { defense: 9, maxHp: 35, maxResource: 18 } }),
  item({ id: "relic_armor_warden_plate", name: "Warden's Plate", type: "armor", rarity: "legendary", icon: "armor", description: "A barrow sentinel's armor, restored for a living hero. +13 defense, +60 health.", stack: 1, buy: 4300, requiresLevel: 22, stats: { defense: 13, maxHp: 60 } }),
  item({ id: "relic_helm_briar_hood", name: "Briar Hood", type: "helm", rarity: "uncommon", icon: "helm", description: "Leaf-lined leather that keeps brambles from the brow. +3 defense, +12 resource.", stack: 1, buy: 240, requiresLevel: 4, stats: { defense: 3, maxResource: 12 } }),
  item({ id: "relic_helm_frost_warden", name: "Frost Warden Helm", type: "helm", rarity: "rare", icon: "helm", description: "A fur-lined helm sealed against the northern cold. +5 defense, +22 health.", stack: 1, buy: 850, requiresLevel: 12, stats: { defense: 5, maxHp: 22 } }),
  item({ id: "relic_helm_last_light", name: "Crown of Last Light", type: "helm", rarity: "epic", icon: "helm", description: "A circlet that holds one warm spark against the dark. +7 defense, +35 health, +15 resource.", stack: 1, buy: 1900, requiresLevel: 18, stats: { defense: 7, maxHp: 35, maxResource: 15 } }),
  item({ id: "relic_boots_mirewalkers", name: "Mirewalkers", type: "boots", rarity: "uncommon", icon: "boots", description: "Raised soles keep the bog from claiming each step. +2 defense, +9 speed.", stack: 1, buy: 280, requiresLevel: 5, stats: { defense: 2, moveSpeed: 9 } }),
  item({ id: "relic_boots_frostbound", name: "Frostbound Boots", type: "boots", rarity: "rare", icon: "boots", description: "Felt-lined greaves made for traversing frozen stone. +4 defense, +11 speed.", stack: 1, buy: 920, requiresLevel: 12, stats: { defense: 4, moveSpeed: 11 } }),
  item({ id: "relic_boots_stormtread", name: "Stormtread Boots", type: "boots", rarity: "epic", icon: "boots", description: "A spring-steel heel turns every stride into a sure step. +4 defense, +15 speed.", stack: 1, buy: 1700, requiresLevel: 17, stats: { defense: 4, moveSpeed: 15 } }),
  item({ id: "relic_trinket_moonstone", name: "Moonstone Pendant", type: "trinket", rarity: "uncommon", icon: "ring", description: "A cool blue stone that steadies the bearer's focus. +24 resource.", stack: 1, buy: 320, requiresLevel: 5, stats: { maxResource: 24 } }),
  item({ id: "relic_trinket_basilisk_eye", name: "Basilisk Eye", type: "trinket", rarity: "rare", icon: "ring", description: "A polished scale set to catch a foe's smallest opening. +3% crit.", stack: 1, buy: 760, requiresLevel: 10, stats: { crit: 0.03 } }),
  item({ id: "relic_trinket_warden_seal", name: "Warden's Seal", type: "trinket", rarity: "rare", icon: "ring", description: "An iron seal bearing the mark of the old gate watch. +3 defense, +22 health.", stack: 1, buy: 880, requiresLevel: 12, stats: { defense: 3, maxHp: 22 } }),
  item({ id: "relic_trinket_starfire", name: "Starfire Charm", type: "trinket", rarity: "epic", icon: "ring", description: "A tiny star-glass charm still warm with arcane light. +3 attack, +28 resource.", stack: 1, buy: 1600, requiresLevel: 17, stats: { attack: 3, maxResource: 28 } }),
  item({ id: "relic_trinket_crown_jewel", name: "Crown Jewel", type: "trinket", rarity: "legendary", icon: "ring", description: "The last bright jewel from the Hollow King's crown. +5 attack, +3% crit, +24 resource.", stack: 1, buy: 3900, requiresLevel: 22, stats: { attack: 5, crit: 0.03, maxResource: 24 } }),
];

const expandedConsumables = [
  item({ id: "relic_potion_health_1", name: "Forest Vitality Draught", type: "consumable", rarity: "uncommon", icon: "potion_red", description: "Restores 100 health.", stack: 20, buy: 42, heal: 100 }),
  item({ id: "relic_potion_health_2", name: "Marshheart Tonic", type: "consumable", rarity: "rare", icon: "potion_red", description: "Restores 260 health.", stack: 20, buy: 95, heal: 260 }),
  item({ id: "relic_potion_health_3", name: "Frostguard Elixir", type: "consumable", rarity: "rare", icon: "potion_red", description: "Restores 420 health.", stack: 20, buy: 150, heal: 420 }),
  item({ id: "relic_potion_health_4", name: "Sunwell Restorative", type: "consumable", rarity: "epic", icon: "potion_red", description: "Restores 620 health.", stack: 20, buy: 230, heal: 620 }),
  item({ id: "relic_potion_health_5", name: "Royal Lifebloom", type: "consumable", rarity: "epic", icon: "potion_red", description: "Restores 850 health.", stack: 20, buy: 320, heal: 850 }),
  item({ id: "relic_potion_health_6", name: "Warden's Heart", type: "consumable", rarity: "legendary", icon: "potion_red", description: "Restores 1100 health.", stack: 20, buy: 430, heal: 1100 }),
  item({ id: "relic_potion_health_7", name: "Phoenix Renewal", type: "consumable", rarity: "legendary", icon: "potion_red", description: "Restores 1500 health.", stack: 20, buy: 560, heal: 1500 }),
  item({ id: "relic_potion_resource_1", name: "Clearwater Focus", type: "consumable", rarity: "uncommon", icon: "potion_blue", description: "Restores 100 resource.", stack: 20, buy: 42, restore: 100 }),
  item({ id: "relic_potion_resource_2", name: "Mirelight Tonic", type: "consumable", rarity: "rare", icon: "potion_blue", description: "Restores 260 resource.", stack: 20, buy: 95, restore: 260 }),
  item({ id: "relic_potion_resource_3", name: "Frostglass Elixir", type: "consumable", rarity: "rare", icon: "potion_blue", description: "Restores 420 resource.", stack: 20, buy: 150, restore: 420 }),
  item({ id: "relic_potion_resource_4", name: "Sunwell Clarity", type: "consumable", rarity: "epic", icon: "potion_blue", description: "Restores 620 resource.", stack: 20, buy: 230, restore: 620 }),
  item({ id: "relic_potion_resource_5", name: "Royal Mana Bloom", type: "consumable", rarity: "epic", icon: "potion_blue", description: "Restores 850 resource.", stack: 20, buy: 320, restore: 850 }),
  item({ id: "relic_potion_resource_6", name: "Warden's Clarity", type: "consumable", rarity: "legendary", icon: "potion_blue", description: "Restores 1100 resource.", stack: 20, buy: 430, restore: 1100 }),
  item({ id: "relic_potion_resource_7", name: "Astral Refill", type: "consumable", rarity: "legendary", icon: "potion_blue", description: "Restores 1500 resource.", stack: 20, buy: 560, restore: 1500 }),
];

const expandedMaterials = [
  item({ id: "relic_material_bog_iron", name: "Bog Iron", type: "material", rarity: "uncommon", icon: "ore", description: "Dense iron gathered from the deepest marsh pools; used at the forge.", stack: 50, buy: 28 }),
  item({ id: "relic_material_mire_silk", name: "Mire Silk", type: "material", rarity: "uncommon", icon: "pelt", description: "Waterproof strands spun by marsh spiders; used in light armor.", stack: 50, buy: 34 }),
  item({ id: "relic_material_froststeel", name: "Froststeel Ingot", type: "material", rarity: "rare", icon: "ore", description: "Cold-worked steel that keeps its edge in freezing air.", stack: 50, buy: 72 }),
  item({ id: "relic_material_frosthide", name: "Frosthide", type: "material", rarity: "uncommon", icon: "pelt", description: "Thick hide from beasts that survive the northern snow.", stack: 50, buy: 42 }),
  item({ id: "relic_material_duskcloth", name: "Duskcloth", type: "material", rarity: "rare", icon: "pelt", description: "Dark woven cloth prized by armorers for its light weight.", stack: 50, buy: 62 }),
  item({ id: "relic_material_wraithdust", name: "Wraith Dust", type: "material", rarity: "rare", icon: "bone", description: "Pale residue left where a restless spirit fades.", stack: 50, buy: 68 }),
  item({ id: "relic_material_sunmetal", name: "Sunmetal", type: "material", rarity: "rare", icon: "ore", description: "A bright alloy that holds heat long after the forge cools.", stack: 50, buy: 86 }),
  item({ id: "relic_material_ember_scale", name: "Ember Scale", type: "material", rarity: "rare", icon: "gem", description: "A fire-warmed scale that resists both flame and time.", stack: 50, buy: 92 }),
  item({ id: "relic_material_wyrmheart", name: "Wyrmheart Shard", type: "material", rarity: "epic", icon: "gem", description: "A glowing shard prized for binding resilient armor.", stack: 50, buy: 140 }),
  item({ id: "relic_material_ancient_rivet", name: "Ancient Rivet", type: "material", rarity: "uncommon", icon: "ore", description: "A sturdy fitting salvaged from the old barrow gate.", stack: 50, buy: 38 }),
  item({ id: "relic_material_kingsbone", name: "King's Bone", type: "material", rarity: "epic", icon: "bone", description: "A relic fragment recovered from the Hollow King's court.", stack: 50, buy: 150 }),
  item({ id: "relic_material_briar_fiber", name: "Briar Fiber", type: "material", rarity: "common", icon: "herb", description: "Flexible forest fiber used to line hoods and gloves.", stack: 50, buy: 20 }),
  item({ id: "relic_material_moonleaf", name: "Moonleaf", type: "material", rarity: "uncommon", icon: "herb", description: "A silver-veined leaf gathered only after dusk.", stack: 50, buy: 32 }),
  item({ id: "relic_material_frostglass", name: "Frostglass", type: "material", rarity: "rare", icon: "gem", description: "A clear crystal formed in the deepest ice caves.", stack: 50, buy: 74 }),
  item({ id: "relic_material_stormroot", name: "Stormroot", type: "material", rarity: "uncommon", icon: "herb", description: "A tough root that grows where lightning strikes the marsh.", stack: 50, buy: 39 }),
  item({ id: "relic_material_swampglass", name: "Swampglass", type: "material", rarity: "uncommon", icon: "gem", description: "Green glassy nodules formed beneath the bog water.", stack: 50, buy: 44 }),
  item({ id: "relic_material_starshard", name: "Starshard", type: "material", rarity: "epic", icon: "gem", description: "A sliver of fallen starlight used to set fine charms.", stack: 50, buy: 125 }),
  item({ id: "relic_material_venom_gland", name: "Venom Gland", type: "material", rarity: "uncommon", icon: "gel", description: "A sealed gland harvested from a venom spider.", stack: 50, buy: 36 }),
  item({ id: "relic_material_basilisk_scale", name: "Basilisk Scale", type: "material", rarity: "rare", icon: "pelt", description: "A glassy scale that catches light like a watchful eye.", stack: 50, buy: 88 }),
  item({ id: "relic_material_void_essence", name: "Void Essence", type: "material", rarity: "epic", icon: "gem", description: "A dark mote drawn from the frozen throne's shadow.", stack: 50, buy: 145 }),
];

export const EXPANSION_WEAPON_IDS = expandedWeapons.map(({ id }) => id);
export const EXPANSION_GEAR_IDS = expandedGear.map(({ id }) => id);
export const EXPANSION_SUPPLY_IDS = [...expandedConsumables, ...expandedMaterials].map(({ id }) => id);

const classStarterWeapons = [
  item({ id: "starter_warden_hammer", name: "Warden's Hammer", type: "weapon", rarity: "common", icon: "mace", description: "A sturdy hammer built for guarding the village road. +5 attack, +2 defense.", stack: 1, buy: 55, classes: ["warden"], stats: { attack: 5, defense: 2 } }),
  item({ id: "starter_oracle_focus", name: "Sunstone Focus", type: "weapon", rarity: "common", icon: "staff", description: "A clear crystal focus for a new seer. +3 attack, +12 resource.", stack: 1, buy: 52, classes: ["oracle"], stats: { attack: 3, maxResource: 12 } }),
  item({ id: "starter_battlemage_blade", name: "Novice Runeblade", type: "weapon", rarity: "common", icon: "sword", description: "A balanced blade with a simple arcane rune. +5 attack, +8 resource.", stack: 1, buy: 55, classes: ["battlemage"], stats: { attack: 5, maxResource: 8 } }),
  item({ id: "starter_shadowdancer_blades", name: "Dancer's Blades", type: "weapon", rarity: "common", icon: "dagger", description: "Light twin blades made for quick footwork. +4 attack, +2% crit.", stack: 1, buy: 55, classes: ["shadowdancer"], stats: { attack: 4, crit: 0.02 } }),
  item({ id: "starter_artificer_repeater", name: "Field Repeater", type: "weapon", rarity: "common", icon: "gun", description: "A dependable hand-built repeater. +5 attack.", stack: 1, buy: 58, classes: ["artificer"], stats: { attack: 5 } }),
  item({ id: "starter_beastmaster_bow", name: "Companion Bow", type: "weapon", rarity: "common", icon: "bow", description: "A hunting bow strung for long days in the wild. +4 attack, +3 speed.", stack: 1, buy: 54, classes: ["beastmaster"], stats: { attack: 4, moveSpeed: 3 } }),
  item({ id: "starter_duelist_rapier", name: "Practice Rapier", type: "weapon", rarity: "common", icon: "sword", description: "A light, well-balanced blade for a measured first duel. +4 attack, +1% crit.", stack: 1, buy: 55, classes: ["duelist"], stats: { attack: 4, crit: 0.01 } }),
  item({ id: "starter_elementalist_focus", name: "Primal Focus", type: "weapon", rarity: "common", icon: "staff", description: "A plain focus that steadies a young elemental scholar. +3 attack, +14 resource.", stack: 1, buy: 54, classes: ["elementalist"], stats: { attack: 3, maxResource: 14 } }),
  item({ id: "starter_sentinel_halberd", name: "Guard Halberd", type: "weapon", rarity: "common", icon: "lance", description: "A reliable polearm carried by the village watch. +5 attack, +1 defense.", stack: 1, buy: 56, classes: ["sentinel"], stats: { attack: 5, defense: 1 } }),
  item({ id: "starter_stormcaller_rod", name: "Stormcall Rod", type: "weapon", rarity: "common", icon: "staff", description: "A copper-wound rod for channeling a first spark. +3 attack, +12 resource.", stack: 1, buy: 54, classes: ["stormcaller"], stats: { attack: 3, maxResource: 12 } }),
];

export const CLASS_STARTER_WEAPON_IDS = classStarterWeapons.map(({ id }) => id);

const defs: ItemDef[] = [
  ...classStarterWeapons,
  ...expandedWeapons,
  ...expandedGear,
  ...expandedConsumables,
  ...expandedMaterials,
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
  { id: "craft_greater_health_potion", name: "Greater Health Potion", resultItemId: "greater_health_potion", materials: [{ itemId: "herb", qty: 3 }, { itemId: "slime_gel", qty: 1 }], gold: 15, zone: "Whispering Forest" },
  { id: "craft_swampguard_vest", name: "Swampguard Vest", resultItemId: "relic_armor_swampguard", materials: [{ itemId: "relic_material_bog_iron", qty: 3 }, { itemId: "relic_material_mire_silk", qty: 2 }], gold: 70, zone: "Ashen Marsh" },
  { id: "craft_frostforged_cuirass", name: "Frostforged Cuirass", resultItemId: "relic_armor_frostforged", materials: [{ itemId: "relic_material_froststeel", qty: 4 }, { itemId: "relic_material_frosthide", qty: 2 }], gold: 260, zone: "Frostfell Ruins" },
  { id: "craft_duskweave_coat", name: "Duskweave Coat", resultItemId: "relic_armor_duskweave", materials: [{ itemId: "relic_material_duskcloth", qty: 3 }, { itemId: "relic_material_wraithdust", qty: 2 }], gold: 180, zone: "Sunken Barrow" },
  { id: "craft_sunforged_mail", name: "Sunforged Mail", resultItemId: "relic_armor_sunforged", materials: [{ itemId: "relic_material_sunmetal", qty: 3 }, { itemId: "relic_material_ember_scale", qty: 2 }, { itemId: "relic_material_wyrmheart", qty: 1 }], gold: 420, zone: "Ashen Marsh" },
  { id: "craft_warden_plate", name: "Warden's Plate", resultItemId: "relic_armor_warden_plate", materials: [{ itemId: "relic_material_ancient_rivet", qty: 4 }, { itemId: "relic_material_kingsbone", qty: 2 }, { itemId: "relic_material_void_essence", qty: 1 }], gold: 850, zone: "Frozen Throne" },
  { id: "craft_briar_hood", name: "Briar Hood", resultItemId: "relic_helm_briar_hood", materials: [{ itemId: "relic_material_briar_fiber", qty: 3 }, { itemId: "relic_material_moonleaf", qty: 2 }], gold: 60, zone: "Whispering Forest" },
  { id: "craft_frost_warden_helm", name: "Frost Warden Helm", resultItemId: "relic_helm_frost_warden", materials: [{ itemId: "relic_material_frostglass", qty: 2 }, { itemId: "relic_material_froststeel", qty: 2 }], gold: 190, zone: "Frostfell Ruins" },
  { id: "craft_mirewalkers", name: "Mirewalkers", resultItemId: "relic_boots_mirewalkers", materials: [{ itemId: "relic_material_swampglass", qty: 2 }, { itemId: "relic_material_mire_silk", qty: 2 }, { itemId: "relic_material_stormroot", qty: 1 }], gold: 80, zone: "Ashen Marsh" },
  { id: "craft_stormtread_boots", name: "Stormtread Boots", resultItemId: "relic_boots_stormtread", materials: [{ itemId: "relic_material_stormroot", qty: 2 }, { itemId: "relic_material_sunmetal", qty: 2 }], gold: 270, zone: "Ashen Marsh" },
  { id: "craft_moonstone_pendant", name: "Moonstone Pendant", resultItemId: "relic_trinket_moonstone", materials: [{ itemId: "relic_material_starshard", qty: 2 }, { itemId: "relic_material_void_essence", qty: 1 }], gold: 150, zone: "Frostfell Ruins" },
  { id: "craft_basilisk_eye", name: "Basilisk Eye", resultItemId: "relic_trinket_basilisk_eye", materials: [{ itemId: "relic_material_venom_gland", qty: 2 }, { itemId: "relic_material_basilisk_scale", qty: 2 }], gold: 160, zone: "Ashen Marsh" },
];

export function getRecipe(id: string): CraftRecipe | undefined {
  return RECIPES.find((recipe) => recipe.id === id);
}
