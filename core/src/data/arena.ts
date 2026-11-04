/**
 * The Hollow Ring: an endless wave arena that lives behind the village gate.
 *
 * Modern action games keep players coming back with a "how far can you get"
 * mode that costs nothing to enter and pays better the deeper it goes. The
 * ring is that mode: one wave at a time, no story, a score to beat.
 */

export interface ArenaWave {
  /** Wave number, starting at 1. */
  wave: number;
  /** How many monsters arrive. */
  count: number;
  /** Species used for this wave, cycled in order. */
  species: string[];
  /** Gold paid for clearing it. */
  gold: number;
  /** Experience paid for clearing it. */
  xp: number;
  /** One line shown when the wave starts. */
  announcement: string;
}

/** Species the ring borrows, in rough order of danger. */
const RING_POOL: { from: number; species: string[] }[] = [
  { from: 1, species: ["slime", "wolf"] },
  { from: 4, species: ["skeleton", "venom_spider"] },
  { from: 8, species: ["bog_lurker", "spirit_wolf"] },
  { from: 12, species: ["frost_wraith", "hollow_acolyte"] },
  { from: 16, species: ["ice_revenant", "mire_wisp"] },
];

const RING_NAMES = [
  "the ring fills",
  "they come quicker now",
  "the gate slams behind you",
  "something with a name steps in",
  "the sand is already wet",
  "the crowd stops counting",
];

/** The wave at a given depth. Waves scale forever so the run always ends in a loss, not a wall. */
export function arenaWave(wave: number): ArenaWave {
  const depth = Math.max(1, Math.floor(wave));
  const pool = RING_POOL.filter((entry) => entry.from <= depth).pop() ?? RING_POOL[0];
  return {
    wave: depth,
    count: Math.min(9, 2 + Math.floor((depth - 1) / 2)),
    species: pool.species,
    gold: Math.round(18 * Math.pow(1.32, depth - 1)),
    xp: Math.round(26 * Math.pow(1.28, depth - 1)),
    announcement: `Wave ${depth}: ${RING_NAMES[(depth - 1) % RING_NAMES.length]}.`,
  };
}

/** How many waves the hero can claim a reward for, used for the journal's "next reward" line. */
export function arenaMilestone(wave: number): number {
  return Math.max(1, Math.floor(wave / 5) * 5);
}
