import type { CharacterSave, RivalState } from "../types";

/**
 * The rival: one monster that grows with the hero and turns up again.
 *
 * Games people keep playing have a foil - something that beat them once and
 * remembers it. The rival is picked the first time the hero dies, wears that
 * monster's face, gains a level every time the hero levels, and gets a little
 * stronger each time it wins. It is not a new monster: it is one of the species
 * already in the zone, wearing a name and a grudge.
 */

const RIVAL_NAMES = [
  "The One That Got Away",
  "Ash-Eye",
  "Nine-Scars",
  "The Leering Thing",
  "Bitter-Hand",
  "The Patient One",
  "Hollow-Tooth",
  "Slow Grin",
];

const RIVAL_LINES = [
  "It did not follow you here. It was already here.",
  "It remembers your face, which is a strange thing for it to do.",
  "Whatever it is, it is stronger than the first time.",
  "The scar you gave it is still open. It seems proud of that.",
  "It stops when you stop. That is not hunting. That is waiting.",
];

export interface RivalDef {
  name: string;
  species: string;
  faces: string;
  level: number;
  /** Wins the rival has over the hero. */
  wins: number;
  /** Times the hero has finally put it down. */
  losses: number;
  line: string;
}

export type { RivalState };

/** Deterministic flavour so the same rival keeps the same face and lines. */
export function rivalFlavour(state: RivalState, level: number): RivalDef {
  const seed = state.name.length + state.wins * 3 + state.losses * 7 + level;
  return {
    name: state.name,
    species: state.species,
    faces: state.faces,
    level,
    wins: state.wins,
    losses: state.losses,
    line: RIVAL_LINES[seed % RIVAL_LINES.length],
  };
}

/**
 * Pick the face of a new rival. The strongest species the hero has already met
 * is the one that gets the grudge, so the rival is always a monster the player
 * has actually lost to.
 */
export function pickRival(metMonsters: string[], fallback: string): { name: string; species: string; faces: string } {
  const species = metMonsters[metMonsters.length - 1] ?? fallback;
  const name = RIVAL_NAMES[(species.length + metMonsters.length) % RIVAL_NAMES.length];
  return { name, species, faces: species };
}

/** A fresh rival, or null when a save has no rival yet. */
export function rivalOf(save: CharacterSave): RivalDef | null {
  const state = save.rival;
  if (!state) return null;
  return rivalFlavour(state, 1 + Math.floor(state.wins * 1.5));
}
