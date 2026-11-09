import type { StatBonus } from "../types";

/**
 * Runewords: three gems in one piece of gear, in the right combination, wake a
 * power no single gem gives.
 *
 * This is the Diablo 2 idea, scaled down to the eight stones the game already
 * has. Sockets come from rarity (a rare item holds three, an epic four, a
 * legendary five) plus one more from an upgrade of +3, so a runeword is reachable
 * from the middle of the game rather than only at its end.
 *
 * The order does not matter: any ruby, ruby, topaz spells the same thing.
 */
export interface Runeword {
  id: string;
  name: string;
  /** The exact three gems the word needs. */
  gems: [string, string, string];
  /** What the word adds, on top of what the gems already give. */
  stats: StatBonus;
  /** One line of flavour and one of numbers, in the panel. */
  text: string;
}

export const RUNEWORDS: Runeword[] = [
  {
    id: "emberheart",
    name: "Emberheart",
    gems: ["gem_ruby", "gem_ruby", "gem_topaz"],
    stats: { attack: 8, defense: 3, crit: 0.03 },
    text: "Two rubies and a topaz. It wakes a warm, steady pulse in the weapon: +8 attack, +3 defense, +3% crit.",
  },
  {
    id: "verdant_pact",
    name: "Verdant Pact",
    gems: ["gem_emerald", "gem_emerald", "gem_amber"],
    stats: { maxHp: 55, attack: 4 },
    text: "Two emeralds and an amber. Living armour that seals itself after every blow: +55 health, +4 attack.",
  },
  {
    id: "tidewalker",
    name: "Tidewalker",
    gems: ["gem_sapphire", "gem_sapphire", "gem_opal"],
    stats: { maxResource: 45, moveSpeed: 6, crit: 0.01 },
    text: "Two sapphires and an opal. Water that will not stand still: +45 resource, +6 move speed, +1% crit.",
  },
  {
    id: "starforge",
    name: "Starforge",
    gems: ["gem_diamond", "gem_diamond", "gem_diamond"],
    stats: { crit: 0.08, attack: 5 },
    text: "Three diamonds. The first strike lands like a falling star: +8% crit, +5 attack.",
  },
  {
    id: "bulwark",
    name: "Bulwark",
    gems: ["gem_onyx", "gem_topaz", "gem_onyx"],
    stats: { defense: 12, maxHp: 30 },
    text: "Two onyx and a topaz. A wall that walks with you: +12 defense, +30 health.",
  },
  {
    id: "prism",
    name: "Prism",
    gems: ["gem_ruby", "gem_sapphire", "gem_emerald"],
    stats: { attack: 5, maxHp: 20, maxResource: 15, defense: 4, crit: 0.02 },
    text: "A ruby, a sapphire and an emerald. A little of everything, as the old texts promise: +5 attack, +20 health, +15 resource, +4 defense, +2% crit.",
  },
  {
    id: "sunset",
    name: "Sunset",
    gems: ["gem_opal", "gem_amber", "gem_diamond"],
    stats: { moveSpeed: 8, crit: 0.04, attack: 3 },
    text: "An opal, an amber and a diamond. Light that runs ahead of you: +8 move speed, +4% crit, +3 attack.",
  },
];

const RUNEWORD_BY_KEY = new Map(RUNEWORDS.map((word) => [wordKey(word.gems), word]));

/** A combination of gems that ignores order, so the same three stones always match. */
function wordKey(gems: readonly string[]): string {
  return [...gems].sort().join("|");
}

/**
 * The runeword a set of socketed gems spells, if any.
 *
 * Only exactly three gems can spell a word, which means an item with four or
 * five sockets has to be filled deliberately to get one.
 */
export function runewordFor(gemIds: readonly string[] | undefined): Runeword | undefined {
  if (!gemIds || gemIds.length !== 3) return undefined;
  return RUNEWORD_BY_KEY.get(wordKey(gemIds));
}

/** Every runeword, with whether the game can be spelled from the gems on hand. */
export interface RunewordRow {
  id: string;
  name: string;
  text: string;
  gems: { gemId: string; name: string; have: number; need: number }[];
  /** True when the bag holds every gem the word needs. */
  ready: boolean;
  /** True when a worn or carried item already spells it. */
  forged: boolean;
}

/** Ids of the runewords already spelled by the given gem lists. */
export function forgedRunewords(gemLists: readonly (readonly string[])[]): Set<string> {
  const found = new Set<string>();
  for (const gems of gemLists) {
    const word = runewordFor(gems);
    if (word) found.add(word.id);
  }
  return found;
}

const GEM_NAMES: Record<string, string> = {
  gem_ruby: "Ruby",
  gem_sapphire: "Sapphire",
  gem_emerald: "Emerald",
  gem_topaz: "Topaz",
  gem_diamond: "Diamond",
  gem_opal: "Opal",
  gem_onyx: "Onyx",
  gem_amber: "Amber",
};

/** Build the rows the vault or journal panel draws, given what the bag holds. */
export function runewordRows(counts: Record<string, number>, forged: Set<string>): RunewordRow[] {
  return RUNEWORDS.map((word) => {
    const needed: Record<string, number> = {};
    for (const gemId of word.gems) needed[gemId] = (needed[gemId] ?? 0) + 1;
    const gems = Object.entries(needed).map(([gemId, qty]) => ({
      gemId,
      name: GEM_NAMES[gemId] ?? gemId,
      have: Math.min(counts[gemId] ?? 0, qty),
      need: qty,
    }));
    const ready = gems.every((gem) => gem.have >= (needed[gem.gemId] ?? 0));
    return {
      id: word.id,
      name: word.name,
      text: word.text,
      gems: gems.map((gem) => ({ gemId: gem.gemId, name: gem.name, have: gem.have, need: gem.need })),
      ready,
      forged: forged.has(word.id),
    };
  });
}
