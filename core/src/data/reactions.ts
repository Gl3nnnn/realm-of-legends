import type { DamageType } from "../types";

/**
 * Elemental reactions. The hero's own skills already carry a damage type, and monsters
 * already carry statuses (burning, poison, chilled). This joins the two: hitting a monster
 * that is already carrying one element with a different one wakes a reaction, which pays
 * a little extra damage and says its name on screen.
 *
 * It costs nothing to run and nothing to store but a list of ids the hero has seen, so it
 * turns the existing kit into a small puzzle without touching balance much.
 */

/** What a reaction does, in the plainest words. */
export interface ReactionDef {
  id: string;
  name: string;
  /** The two elements that make it, in either order. */
  pair: [DamageType, DamageType];
  /** One line the player reads when it fires. */
  text: string;
  /** Extra damage, as a fraction of the hit that woke it. */
  bonus: number;
  /** The icon shown in the float text. */
  icon: string;
}

export const REACTIONS: ReactionDef[] = [
  {
    id: "steam",
    name: "Steam Burst",
    pair: ["fire", "ice"],
    text: "Fire meets frost and bursts into scalding steam.",
    bonus: 0.45,
    icon: "♨",
  },
  {
    id: "shatter",
    name: "Shatter",
    pair: ["ice", "physical"],
    text: "The frozen shell cracks and the blow goes straight through.",
    bonus: 0.35,
    icon: "❄",
  },
  {
    id: "wildfire",
    name: "Wildfire",
    pair: ["fire", "nature"],
    text: "Dry vines catch and the flame runs along them.",
    bonus: 0.4,
    icon: "🔥",
  },
  {
    id: "ashfall",
    name: "Ashfall",
    pair: ["fire", "shadow"],
    text: "Shadow feeds the flame until it burns black.",
    bonus: 0.4,
    icon: "🜂",
  },
  {
    id: "holyfire",
    name: "Holy Fire",
    pair: ["holy", "fire"],
    text: "Blessed flame finds every crack in the creature's shell.",
    bonus: 0.5,
    icon: "✧",
  },
  {
    id: "frostbind",
    name: "Frostbind",
    pair: ["ice", "nature"],
    text: "Sap freezes solid and the creature slows to a crawl.",
    bonus: 0.3,
    icon: "❅",
  },
  {
    id: "overload",
    name: "Overload",
    pair: ["arcane", "fire"],
    text: "Raw magic slams into open flame. Something detonates.",
    bonus: 0.55,
    icon: "✸",
  },
  {
    id: "corrode",
    name: "Corrode",
    pair: ["poison", "physical"],
    text: "Venom and steel eat through the armour together.",
    bonus: 0.3,
    icon: "☠",
  },
];

const BY_ID = new Map(REACTIONS.map((reaction) => [reaction.id, reaction]));

export function getReaction(id: string): ReactionDef | undefined {
  return BY_ID.get(id);
}

/** The status a monster is carrying, mapped onto the element it behaves like. */
export function statusElement(kind: string): DamageType | null {
  if (kind === "burn") return "fire";
  if (kind === "poison") return "poison";
  if (kind === "slow") return "ice";
  return null;
}

/**
 * The reaction, if any, between what the monster is already carrying and the blow that
 * just landed. Statuses win over the plain damage type, because a burning enemy is a
 * fire target whatever the current hit happens to be.
 */
export function findReaction(carried: DamageType[], incoming: DamageType): ReactionDef | null {
  for (const element of carried) {
    for (const reaction of REACTIONS) {
      const [a, b] = reaction.pair;
      if ((element === a && incoming === b) || (element === b && incoming === a)) return reaction;
    }
  }
  return null;
}
