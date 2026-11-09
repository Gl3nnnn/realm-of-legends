/**
 * The gambler's table.
 *
 * Gold had no home once the village was rebuilt and the best gear was worn: the
 * shops sell known goods, the vault charges once, and the forge takes ore. A hero
 * with ten thousand coins had nothing to buy.
 *
 * A gamble is a sink that never runs dry, because the thing being sold is a roll.
 * Pay a fixed price, get an item of a chosen kind at a rarity the dice decide. It is
 * Gheed's old table from Diablo 2, sized for a game whose shops already named every
 * item they sell.
 */
import type { Rarity } from "../types";

export const GAMBLE_PRICE = 260;

export type GambleKind = "weapon" | "armor" | "trinket";

export const GAMBLE_KINDS: { id: GambleKind; label: string; blurb: string }[] = [
  { id: "weapon", label: "A weapon", blurb: "Arm, and hope it fits your hands" },
  { id: "armor", label: "A piece of armour", blurb: "Plate, leather, or something stranger" },
  { id: "trinket", label: "A trinket", blurb: "Rings, amulets, and small charms" },
];

/**
 * The odds, from common up to legendary. They add to 1, and every kind uses the same
 * table, so the price is the only thing a player has to weigh.
 */
export const GAMBLE_ODDS: { rarity: Rarity; weight: number }[] = [
  { rarity: "common", weight: 0.1 },
  { rarity: "uncommon", weight: 0.3 },
  { rarity: "rare", weight: 0.34 },
  { rarity: "epic", weight: 0.18 },
  { rarity: "legendary", weight: 0.08 },
];

/** The odds written for the panel, like "8% legendary". */
export function gambleOddsLine(): string {
  return GAMBLE_ODDS.slice()
    .reverse()
    .map((entry) => `${Math.round(entry.weight * 100)}% ${entry.rarity}`)
    .join(" · ");
}

/** Today's one free-luck bonus: a hero on a long kill streak rolls a little luckier. */
export function gambleLuckBonus(killStreak: number): number {
  if (killStreak >= 60) return 0.18;
  if (killStreak >= 30) return 0.1;
  if (killStreak >= 15) return 0.04;
  return 0;
}

export const GAMBLE_BLURB = "Gideon does not sell goods. He sells the chance of them.";
export const GAMBLER_NAME = "Gideon the Gambler";
export const GAMBLER_ID = "gambler";
