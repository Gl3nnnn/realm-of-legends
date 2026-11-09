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

export function getGem(itemId: string): GemDef | undefined {
  return GEM_BY_ID.get(itemId);
}

/** True when the item id names a gem, so the UI knows it can be socketed. */
export function isGem(itemId: string): boolean {
  return GEM_BY_ID.has(itemId);
}

/** The stat bonus every socketed gem on a piece of gear adds up to. */
export function gemStats(gemIds: readonly string[] | undefined): StatBonus {
  const total: StatBonus = {};
  for (const id of gemIds ?? []) {
    const gem = GEM_BY_ID.get(id);
    if (!gem) continue;
    for (const [key, value] of Object.entries(gem.stats) as [keyof StatBonus, number][]) {
      total[key] = (total[key] ?? 0) + value;
    }
  }
  return total;
}
