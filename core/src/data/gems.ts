import type { StatBonus } from "../types";

/**
 * Gems: the small stones that go into a socket on a piece of gear.
 *
 * A gem is a plain material item (its id starts with `gem_`), so it can be
 * picked up, sold, stored and traded like anything else. What makes it special
 * is that a socketed gem keeps working while the item is worn: the bonus is
 * folded into the item's own stats, so a hero does not have to do anything to
 * benefit from it.
 */
export interface GemDef {
  id: string;
  name: string;
  /** Colour of the stone, used by the UI chip. */
  color: string;
  stats: StatBonus;
  /** One line a player can read in the shop or the inventory. */
  description: string;
}

export const GEMS: GemDef[] = [
  {
    id: "gem_ruby",
    name: "Ruby",
    color: "#e65151",
    stats: { attack: 3 },
    description: "Increases attack by 3 while worn.",
  },
  {
    id: "gem_sapphire",
    name: "Sapphire",
    color: "#4d84e8",
    stats: { maxResource: 12 },
    description: "Increases maximum resource by 12 while worn.",
  },
  {
    id: "gem_emerald",
    name: "Emerald",
    color: "#4ac26a",
    stats: { maxHp: 18 },
    description: "Increases maximum health by 18 while worn.",
  },
  {
    id: "gem_topaz",
    name: "Topaz",
    color: "#e8b64d",
    stats: { defense: 3 },
    description: "Increases defense by 3 while worn.",
  },
  {
    id: "gem_diamond",
    name: "Diamond",
    color: "#dff3ff",
    stats: { crit: 0.02 },
    description: "Increases critical chance by 2% while worn.",
  },
  {
    id: "gem_opal",
    name: "Opal",
    color: "#c49bff",
    stats: { moveSpeed: 4 },
    description: "Increases movement speed by 4 while worn.",
  },
  {
    id: "gem_onyx",
    name: "Onyx",
    color: "#8a8fa6",
    stats: { attack: 2, defense: 2 },
    description: "A balanced stone: +2 attack and +2 defense.",
  },
  {
    id: "gem_amber",
    name: "Amber",
    color: "#ffb15f",
    stats: { maxHp: 10, attack: 1 },
    description: "A sturdy stone: +10 health and +1 attack.",
  },
];

const GEM_BY_ID = new Map(GEMS.map((gem) => [gem.id, gem]));

/**
 * The three steps a stone climbs.
 *
 * Gems used to be the one thing with no way up: a ruby found at level 3 was the
 * same ruby at level 30, and a bag full of them was just a bag full of shop stock.
 * Now three of a kind make one better one, the way the old games did it: three
 * rough rubies become a cut ruby, three cut rubies a flawless one. The tiers are
 * ids rather than a field, so three of them cost no new save data.
 */
export type GemTier = "rough" | "cut" | "flawless";

export const GEM_TIERS: Record<GemTier, { label: string; scale: number; next: GemTier | null }> = {
  rough: { label: "Rough", scale: 1, next: "cut" },
  cut: { label: "Cut", scale: 2, next: "flawless" },
  flawless: { label: "Flawless", scale: 3, next: null },
};

/** The base id of a gem, with any tier suffix stripped: "gem_ruby_flawless" -> "gem_ruby". */
export function baseGemId(itemId: string): string {
  for (const tier of Object.keys(GEM_TIERS) as GemTier[]) {
    if (tier === "rough") continue;
    const suffix = `_${tier}`;
    if (itemId.endsWith(suffix)) return itemId.slice(0, -suffix.length);
  }
  return itemId;
}

/** The tier a gem id names, or "rough" for a plain stone. */
export function gemTierOf(itemId: string): GemTier {
  for (const tier of ["flawless", "cut"] as GemTier[]) {
    if (itemId.endsWith(`_${tier}`)) return tier;
  }
  return "rough";
}

export function getGem(itemId: string): GemDef | undefined {
  const base = GEM_BY_ID.get(baseGemId(itemId));
  if (!base) return undefined;
  const tier = gemTierOf(itemId);
  if (tier === "rough") return base;
  return { ...base, name: `${GEM_TIERS[tier].label} ${base.name}` };
}

/** True when the item id names a gem, so the UI knows it can be socketed. */
export function isGem(itemId: string): boolean {
  return GEM_BY_ID.has(baseGemId(itemId));
}

/** Every gem id in the game, rough through flawless, in tier order. */
export const ALL_GEM_ITEM_IDS: string[] = GEMS.flatMap((gem) => [
  gem.id,
  `${gem.id}_cut`,
  `${gem.id}_flawless`,
]);

/** The stone three of this one make, or null when it is already flawless. */
export function gemFuseTarget(gemId: string): string | null {
  const base = baseGemId(gemId);
  if (!GEM_BY_ID.has(base)) return null;
  const tier = gemTierOf(gemId);
  const next = GEM_TIERS[tier].next;
  if (!next) return null;
  return next === "cut" ? `${base}_cut` : `${base}_flawless`;
}

/** The stat bonus every socketed gem on a piece of gear adds up to. */
export function gemStats(gemIds: readonly string[] | undefined): StatBonus {
  const total: StatBonus = {};
  for (const id of gemIds ?? []) {
    const gem = GEM_BY_ID.get(baseGemId(id));
    if (!gem) continue;
    const scale = GEM_TIERS[gemTierOf(id)].scale;
    for (const [key, value] of Object.entries(gem.stats) as [keyof StatBonus, number][]) {
      total[key] = (total[key] ?? 0) + value * scale;
    }
  }
  return total;
}
