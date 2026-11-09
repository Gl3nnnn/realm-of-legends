/**
 * The village rebuild.
 *
 * Gold had nowhere to go once a hero had bought every vault row: gear upgrades
 * cost ore, talents cost nothing, and the shops sell the same stock forever.
 * These buildings are the answer. Each one is rebuilt in five stages with gold
 * (and a few gathered materials), and each stage gives the whole account a
 * little more: the forge sharpens every weapon, the chapel makes potions
 * stronger, the marketplace keeps prices down.
 *
 * The levels live on the save (`village`), so the village a player rebuilds
 * stays rebuilt.
 */
export interface VillageTier {
  /** Gold the stage costs. */
  gold: number;
  /** The gathered materials the stage also asks for, if any. */
  materials?: { itemId: string; qty: number };
  /** What this stage gives, in words a player can read. */
  benefit: string;
}

export interface VillageBuilding {
  id: string;
  name: string;
  /** The villager who runs it, so the panel can say who to thank. */
  npcId: string;
  role: string;
  color: string;
  description: string;
  tiers: VillageTier[];
}

/** Every building can be raised five stages. */
export const VILLAGE_MAX_TIER = 5;

export const VILLAGE_BUILDINGS: VillageBuilding[] = [
  {
    id: "forge",
    name: "Borin's Great Forge",
    npcId: "blacksmith",
    role: "Sharpens every blow",
    color: "#8a4b2f",
    description: "A second furnace and a taller chimney. Every stage raises attack for every hero on this account.",
    tiers: [
      { gold: 500, materials: { itemId: "iron_ore", qty: 4 }, benefit: "+3% attack" },
      { gold: 1400, materials: { itemId: "iron_ore", qty: 8 }, benefit: "+6% attack" },
      { gold: 3200, materials: { itemId: "iron_ore", qty: 14 }, benefit: "+9% attack" },
      { gold: 7000, materials: { itemId: "iron_ore", qty: 22 }, benefit: "+12% attack" },
      { gold: 15000, materials: { itemId: "iron_ore", qty: 32 }, benefit: "+15% attack" },
    ],
  },
  {
    id: "chapel",
    name: "Elara's Chapel",
    npcId: "healer",
    role: "Stronger light, stronger potions",
    color: "#4f9e8a",
    description: "A quiet hall behind the shrine. Every stage raises health and makes every potion heal for more.",
    tiers: [
      { gold: 450, materials: { itemId: "herb", qty: 6 }, benefit: "+3% health, potions +10%" },
      { gold: 1200, materials: { itemId: "herb", qty: 12 }, benefit: "+6% health, potions +20%" },
      { gold: 2800, materials: { itemId: "herb", qty: 20 }, benefit: "+9% health, potions +30%" },
      { gold: 6200, materials: { itemId: "herb", qty: 30 }, benefit: "+12% health, potions +40%" },
      { gold: 13000, materials: { itemId: "herb", qty: 44 }, benefit: "+15% health, potions +50%" },
    ],
  },
  {
    id: "gatehouse",
    name: "Rowan's Gatehouse",
    npcId: "guard",
    role: "A wall worth standing on",
    color: "#5b7fa6",
    description: "Stone walls and a watch tower. Every stage adds defense and a little more health to every hero.",
    tiers: [
      { gold: 600, materials: { itemId: "bone_shard", qty: 4 }, benefit: "+2 defense, +2% health" },
      { gold: 1600, materials: { itemId: "bone_shard", qty: 9 }, benefit: "+4 defense, +4% health" },
      { gold: 3400, materials: { itemId: "bone_shard", qty: 15 }, benefit: "+6 defense, +6% health" },
      { gold: 7600, materials: { itemId: "bone_shard", qty: 24 }, benefit: "+8 defense, +8% health" },
      { gold: 15500, materials: { itemId: "bone_shard", qty: 36 }, benefit: "+10 defense, +10% health" },
    ],
  },
  {
    id: "market",
    name: "Mira's Marketplace",
    npcId: "merchant",
    role: "Better prices, every day",
    color: "#b07a3f",
    description: "More stalls, more sellers, and more reason for Mira to like you. Every stage lowers shop prices further.",
    tiers: [
      { gold: 400, materials: { itemId: "gemstone", qty: 2 }, benefit: "4% off all shop prices" },
      { gold: 1100, materials: { itemId: "gemstone", qty: 4 }, benefit: "8% off all shop prices" },
      { gold: 2700, materials: { itemId: "gemstone", qty: 7 }, benefit: "12% off all shop prices" },
      { gold: 6300, materials: { itemId: "gemstone", qty: 11 }, benefit: "16% off all shop prices" },
      { gold: 12500, materials: { itemId: "gemstone", qty: 17 }, benefit: "20% off all shop prices" },
    ],
  },
  {
    id: "stable",
    name: "The Stable",
    npcId: "trainer",
    role: "Where companions grow",
    color: "#7a6a9e",
    description: "Warm stalls and a training yard. Every stage makes your companion hit harder and speeds you both up.",
    tiers: [
      { gold: 550, materials: { itemId: "wolf_pelt", qty: 3 }, benefit: "companion +8% damage" },
      { gold: 1500, materials: { itemId: "wolf_pelt", qty: 7 }, benefit: "companion +16% damage, +1% move speed" },
      { gold: 3100, materials: { itemId: "wolf_pelt", qty: 12 }, benefit: "companion +24% damage, +2% move speed" },
      { gold: 6900, materials: { itemId: "wolf_pelt", qty: 18 }, benefit: "companion +32% damage, +4% move speed" },
      { gold: 14000, materials: { itemId: "wolf_pelt", qty: 26 }, benefit: "companion +40% damage, +5% move speed" },
    ],
  },
  {
    id: "archive",
    name: "The Archive",
    npcId: "trainer",
    role: "Lessons worth keeping",
    color: "#6b7fa6",
    description: "Shelves of old campaign notes. Every stage raises the experience every hero earns.",
    tiers: [
      { gold: 500, materials: { itemId: "slime_gel", qty: 8 }, benefit: "+4% experience" },
      { gold: 1300, materials: { itemId: "slime_gel", qty: 16 }, benefit: "+8% experience" },
      { gold: 2900, materials: { itemId: "slime_gel", qty: 26 }, benefit: "+12% experience" },
      { gold: 6500, materials: { itemId: "slime_gel", qty: 38 }, benefit: "+16% experience" },
      { gold: 13500, materials: { itemId: "slime_gel", qty: 52 }, benefit: "+20% experience" },
    ],
  },
  {
    id: "workshop",
    name: "The Workshop",
    npcId: "merchant",
    role: "Every coin goes further",
    color: "#9a7b4f",
    description: "A shed of benches and tools. Every stage raises the gold found in the world and paid for loot.",
    tiers: [
      { gold: 650, materials: { itemId: "iron_ore", qty: 3 }, benefit: "+6% gold"},
      { gold: 1700, materials: { itemId: "iron_ore", qty: 6 }, benefit: "+12% gold" },
      { gold: 3600, materials: { itemId: "iron_ore", qty: 10 }, benefit: "+18% gold" },
      { gold: 8000, materials: { itemId: "iron_ore", qty: 16 }, benefit: "+24% gold" },
      { gold: 16000, materials: { itemId: "iron_ore", qty: 24 }, benefit: "+30% gold" },
    ],
  },
];

const BUILDING_BY_ID = new Map(VILLAGE_BUILDINGS.map((building) => [building.id, building]));

export function getVillageBuilding(id: string): VillageBuilding | undefined {
  return BUILDING_BY_ID.get(id);
}

/** Village levels held by a save, as a plain id -> stage map. */
export type VillageLevels = Record<string, number>;

/** The stage this hero has built to, clamped so a broken save cannot overflow the list. */
export function villageLevel(levels: VillageLevels | undefined, buildingId: string): number {
  const raw = (levels ?? {})[buildingId] ?? 0;
  if (!Number.isFinite(raw)) return 0;
  return Math.max(0, Math.min(VILLAGE_MAX_TIER, Math.floor(raw)));
}

/**
 * Everything the rebuild gives, added up across all seven buildings.
 *
 * Percentages are kept as numbers a caller multiplies by, so 15 means "+15%".
 */
export interface VillageEffects {
  attackPct: number;
  defenseFlat: number;
  maxHpPct: number;
  moveSpeedPct: number;
  xpPct: number;
  goldPct: number;
  shopDiscountPct: number;
  potionPct: number;
  petPower: number;
}

export function villageEffects(levels: VillageLevels | undefined): VillageEffects {
  const forge = villageLevel(levels, "forge");
  const chapel = villageLevel(levels, "chapel");
  const gatehouse = villageLevel(levels, "gatehouse");
  const market = villageLevel(levels, "market");
  const stable = villageLevel(levels, "stable");
  const archive = villageLevel(levels, "archive");
  const workshop = villageLevel(levels, "workshop");
  return {
    attackPct: forge * 3,
    defenseFlat: gatehouse * 2,
    maxHpPct: chapel * 3 + gatehouse * 2,
    moveSpeedPct: stable * 1.2,
    xpPct: archive * 4,
    goldPct: workshop * 6,
    shopDiscountPct: market * 4,
    potionPct: chapel * 10,
    // The stable multiplies the companion's own power, so 1.4 means "+40%".
    petPower: 1 + stable * 0.08,
  };
}

/** A row the village panel draws for one building. */
export interface VillageRow {
  id: string;
  name: string;
  role: string;
  color: string;
  description: string;
  level: number;
  maxLevel: number;
  /** What the next stage costs, or null when the building is finished. */
  next: { gold: number; materials: { itemId: string; qty: number } | null; benefit: string } | null;
  /** True when the hero has the gold and the materials for the next stage. */
  affordable: boolean;
  /** Everything the building already gives. */
  current: string;
}

export function villageRows(levels: VillageLevels | undefined): VillageRow[] {
  return VILLAGE_BUILDINGS.map((building) => {
    const level = villageLevel(levels, building.id);
    const next = level >= VILLAGE_MAX_TIER ? null : building.tiers[level] ?? null;
    return {
      id: building.id,
      name: building.name,
      role: building.role,
      color: building.color,
      description: building.description,
      level,
      maxLevel: VILLAGE_MAX_TIER,
      next: next ? { gold: next.gold, materials: next.materials ?? null, benefit: next.benefit } : null,
      affordable: false,
      current: level > 0 ? building.tiers[level - 1]?.benefit ?? "" : "Not built yet",
    };
  });
}
