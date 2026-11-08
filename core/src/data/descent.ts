/**
 * The Endless Descent: a seeded roguelite run beneath the Hollow Ring.
 *
 * The Ring answers "how far can you get". The Descent answers "what would you
 * build if every run handed you a different choice". It borrows the same floor,
 * spawns waves forever, and every second wave offers three boons. A run is lost
 * when the hero falls, but the deepest wave and the shards stay earned.
 *
 * Two things make a run worth repeating:
 *  - **Boons** last only for the run and some of them change *how* the hero
 *    fights (heal on every hit, heal on every kill, damage back to attackers),
 *    not just the size of a number.
 *  - **Relics** are bought with shards and kept forever, so a run that ends badly
 *    still leaves the hero stronger than before it started.
 */

export type DescentStat = "attack" | "defense" | "maxHp" | "moveSpeed";

/** Per-run and permanent effects that change how a fight plays out, not just its numbers. */
export type DescentSpecial =
  /** Every landed hit heals the hero for this percent of the damage dealt. */
  | "lifesteal"
  /** Every kill heals the hero for this percent of their maximum health. */
  | "healOnKill"
  /** Attackers take this percent of the damage they deal straight back. */
  | "thorns"
  /** Hits land harder on foes below 30% health, by this percent. */
  | "execute"
  /** Extra shards paid each cleared wave, as a percent. */
  | "shardBonus";

export interface DescentBoon {
  id: string;
  name: string;
  icon: string;
  description: string;
  /** Percent bonuses applied for the rest of the run, stacking with each pick. */
  stats: Partial<Record<DescentStat, number>>;
  /** Effects that change how a fight plays, stacking with each pick. */
  special?: Partial<Record<DescentSpecial, number>>;
}

export const DESCENT_BOONS: DescentBoon[] = [
  {
    id: "fury",
    name: "Fury",
    icon: "⚔",
    description: "+12% attack for the rest of the run.",
    stats: { attack: 12 },
  },
  {
    id: "ironhide",
    name: "Ironhide",
    icon: "🛡",
    description: "+18% defense for the rest of the run.",
    stats: { defense: 18 },
  },
  {
    id: "titan_blood",
    name: "Titan Blood",
    icon: "❤",
    description: "+15% maximum health for the rest of the run.",
    stats: { maxHp: 15 },
  },
  {
    id: "swiftfoot",
    name: "Swiftfoot",
    icon: "🌬",
    description: "+12% movement speed for the rest of the run.",
    stats: { moveSpeed: 12 },
  },
  {
    id: "executioner",
    name: "Executioner",
    icon: "🪓",
    description: "+20% attack, but nothing else. A pure glass-cannon pick.",
    stats: { attack: 20 },
  },
  {
    id: "bulwark",
    name: "Bulwark",
    icon: "🏰",
    description: "+26% defense for the rest of the run.",
    stats: { defense: 26 },
  },
  {
    id: "colossus",
    name: "Colossus",
    icon: "🗿",
    description: "+24% maximum health for the rest of the run.",
    stats: { maxHp: 24 },
  },
  {
    id: "zephyr",
    name: "Zephyr",
    icon: "🍃",
    description: "+18% movement speed for the rest of the run.",
    stats: { moveSpeed: 18 },
  },
  {
    id: "warpath",
    name: "Warpath",
    icon: "🔥",
    description: "+8% attack and +8% defense. A balanced pick for a long run.",
    stats: { attack: 8, defense: 8 },
  },
  // The picks below change the fight itself rather than the size of a number.
  {
    id: "leech",
    name: "Leech",
    icon: "🩸",
    description: "Every hit you land heals you for 3% of the damage. No potions needed to stay up.",
    stats: {},
    special: { lifesteal: 3 },
  },
  {
    id: "glutton",
    name: "Glutton",
    icon: "🍖",
    description: "Every kill heals you for 5% of your maximum health. A crowd is a buffet.",
    stats: {},
    special: { healOnKill: 5 },
  },
  {
    id: "spiked",
    name: "Spiked Hide",
    icon: "🦔",
    description: "Whatever hits you takes 20% of that damage right back.",
    stats: {},
    special: { thorns: 20 },
  },
  {
    id: "bloodletter",
    name: "Bloodletter",
    icon: "💀",
    description: "Foes below 30% health take 30% more damage from you.",
    stats: {},
    special: { execute: 30 },
  },
  {
    id: "tithe",
    name: "Tithe",
    icon: "💎",
    description: "Every cleared wave pays 25% more shards.",
    stats: {},
    special: { shardBonus: 25 },
  },
];

export function descentBoon(id: string): DescentBoon | undefined {
  return DESCENT_BOONS.find((boon) => boon.id === id);
}

/**
 * A relic: permanent, bought with shards between runs, and never lost.
 * These are the reason a bad run is never a wasted run.
 */
export interface DescentRelic {
  id: string;
  name: string;
  icon: string;
  description: string;
  /** Shard price. */
  cost: number;
  stats?: Partial<Record<DescentStat, number>>;
  special?: Partial<Record<DescentSpecial, number>>;
}

export const DESCENT_RELICS: DescentRelic[] = [
  {
    id: "blood_pact",
    name: "Blood Pact",
    icon: "🩸",
    description: "Every hit you land heals you for 2% of the damage.",
    cost: 40,
    special: { lifesteal: 2 },
  },
  {
    id: "reapers_toll",
    name: "Reaper's Toll",
    icon: "🍖",
    description: "Every kill heals you for 3% of your maximum health.",
    cost: 55,
    special: { healOnKill: 3 },
  },
  {
    id: "thorn_mail",
    name: "Thorn Mail",
    icon: "🦔",
    description: "Attackers take 12% of their damage back.",
    cost: 65,
    special: { thorns: 12 },
  },
  {
    id: "hunters_seal",
    name: "Hunter's Seal",
    icon: "🎯",
    description: "Foes below 30% health take 18% more damage.",
    cost: 80,
    special: { execute: 18 },
  },
  {
    id: "stone_heart",
    name: "Stone Heart",
    icon: "🗿",
    description: "Permanent +6% maximum health, in and out of the Descent.",
    cost: 70,
    stats: { maxHp: 6 },
  },
  {
    id: "wanderers_sole",
    name: "Wanderer's Sole",
    icon: "👟",
    description: "Permanent +4% movement speed, everywhere.",
    cost: 75,
    stats: { moveSpeed: 4 },
  },
  {
    id: "deep_purse",
    name: "Deep Purse",
    icon: "💎",
    description: "Every Descent wave pays 15% more shards, forever.",
    cost: 95,
    special: { shardBonus: 15 },
  },
];

export function descentRelic(id: string): DescentRelic | undefined {
  return DESCENT_RELICS.find((relic) => relic.id === id);
}

/**
 * The risk dial: a handicap the hero takes on before a run in exchange for
 * shards. Level 0 is a plain run, level 3 is a run few heroes finish.
 */
export interface DescentPact {
  level: number;
  name: string;
  description: string;
  /** Extra health on every Descent monster. */
  hp: number;
  /** Extra damage from every Descent monster. */
  attack: number;
  /** Extra shards paid for each cleared wave, as a percent. */
  shards: number;
  /** Potions are refused for the whole run. */
  noPotions: boolean;
}

export const DESCENT_PACTS: DescentPact[] = [
  { level: 0, name: "Open Descent", description: "No handicap. As it was built.", hp: 0, attack: 0, shards: 0, noPotions: false },
  { level: 1, name: "Tight Halls", description: "Monsters have 20% more health. Waves pay 40% more shards.", hp: 20, attack: 0, shards: 40, noPotions: false },
  { level: 2, name: "Blood Vow", description: "Monsters hit 30% harder and have 35% more health. No potions. Waves pay double shards.", hp: 35, attack: 30, shards: 100, noPotions: true },
  { level: 3, name: "The Long Dark", description: "Monsters hit 60% harder and have 60% more health. No potions. Waves pay triple shards.", hp: 60, attack: 60, shards: 200, noPotions: true },
];

export function descentPact(level: number): DescentPact {
  return DESCENT_PACTS[Math.max(0, Math.min(DESCENT_PACTS.length - 1, Math.floor(level)))];
}

export interface DescentWave {
  wave: number;
  count: number;
  /** Species used for the wave, or the boss that walks in alone. */
  species: string[];
  boss?: string;
  gold: number;
  xp: number;
  shards: number;
  announcement: string;
}

/** Species the descent borrows, in rough order of danger. */
const DESCENT_POOL: { from: number; species: string[] }[] = [
  { from: 1, species: ["slime", "wolf", "skeleton"] },
  { from: 3, species: ["venom_spider", "bog_lurker", "spirit_wolf"] },
  { from: 6, species: ["frost_wraith", "hollow_acolyte", "mire_wisp"] },
  { from: 9, species: ["ice_revenant", "bog_lurker", "skeleton_minion"] },
  { from: 12, species: ["hollow_acolyte", "frost_wraith", "venom_spider"] },
];

/** Bosses that take a turn as the fifth-wave gatekeeper. */
const DESCENT_BOSSES = ["bone_warden", "miremother", "frost_revenant", "hollow_king"] as const;

const DESCENT_NAMES = [
  "the stair goes down",
  "the walls remember you",
  "something old shifts below",
  "the dark pays attention",
  "the way back is gone",
  "the deep has a heartbeat",
];

/** The wave at a given depth. A boss arrives every fifth wave. */
export function descentWave(wave: number): DescentWave {
  const depth = Math.max(1, Math.floor(wave));
  const isBoss = depth % 5 === 0;
  const pool = DESCENT_POOL.filter((entry) => entry.from <= depth).pop() ?? DESCENT_POOL[0]!;
  const boss = isBoss ? DESCENT_BOSSES[(depth / 5 - 1) % DESCENT_BOSSES.length]! : undefined;
  return {
    wave: depth,
    count: isBoss ? 1 : Math.min(8, 2 + Math.floor(depth / 2)),
    species: isBoss ? [boss!] : pool.species,
    boss,
    gold: Math.round(24 * Math.pow(1.3, depth - 1)),
    xp: Math.round(32 * Math.pow(1.26, depth - 1)),
    shards: 1 + Math.floor(depth / 3),
    announcement: isBoss
      ? `Wave ${depth}: the gate opens and ${boss === "hollow_king" ? "the Hollow King" : "a great enemy"} steps through.`
      : `Wave ${depth}: ${DESCENT_NAMES[(depth - 1) % DESCENT_NAMES.length]}.`,
  };
}

/** Three distinct boon choices, rolled with the run's own seeded randomness. */
export function boonChoiceIds(seed: number, pool: string[] = DESCENT_BOONS.map((boon) => boon.id)): string[] {
  const out: string[] = [];
  let state = seed >>> 0 || 1;
  const next = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0xffffffff;
  };
  const available = [...pool];
  while (out.length < 3 && available.length > 0) {
    const index = Math.floor(next() * available.length) % available.length;
    out.push(available.splice(index, 1)[0]!);
  }
  return out;
}
