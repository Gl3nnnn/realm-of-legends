import type { DamageType } from "../types";

/**
 * Every species is soft against exactly one element. Modern action games make
 * a fight readable by giving each enemy one clear answer, so this table is the
 * "hit it with this" cheat sheet: the bestiary shows it, and the boss card
 * prints it the moment a boss notices the hero.
 *
 * `bonus` is a share of the damage dealt, added on top: 0.2 means +20%.
 * Bosses resist a little more than their minions, which keeps them from
 * melting the moment the hero switches weapons.
 */
export interface WeaknessDef {
  type: DamageType;
  bonus: number;
  /** Why it works, in one plain line, for the bestiary. */
  note: string;
}

export const MONSTER_WEAKNESS: Record<string, WeaknessDef> = {
  slime: { type: "fire", bonus: 0.22, note: "Gel does not hold together when it boils." },
  wolf: { type: "fire", bonus: 0.18, note: "A burning pelt is a panicking wolf." },
  skeleton: { type: "holy", bonus: 0.22, note: "Old bone remembers the light that buried it." },
  bone_warden: { type: "holy", bonus: 0.14, note: "The keeper's oath still answers to holy words." },
  skeleton_minion: { type: "holy", bonus: 0.22, note: "A borrowed body breaks at the first blessing." },
  spirit_wolf: { type: "arcane", bonus: 0.2, note: "A spirit is a shape held together by will, and arcane unmakes shapes." },
  familiar: { type: "arcane", bonus: 0.2, note: "Cut the runes and the little thing has nothing left to hold." },
  bog_lurker: { type: "fire", bonus: 0.18, note: "Wet hide and swamp gas make a poor shield." },
  mire_wisp: { type: "arcane", bonus: 0.2, note: "A wisp is a rumour with a lantern. Arcane argues with it." },
  venom_spider: { type: "fire", bonus: 0.2, note: "The sacs pop before the fangs arrive." },
  miremother: { type: "nature", bonus: 0.13, note: "The marsh grew her, so the marsh can unmake her." },
  frost_wraith: { type: "fire", bonus: 0.2, note: "Ice that thinks it is a person still melts." },
  ice_revenant: { type: "fire", bonus: 0.18, note: "Heat cracks the shell it died in." },
  frost_revenant: { type: "fire", bonus: 0.13, note: "Between the rings, warmth gets through the old armour." },
  hollow_acolyte: { type: "holy", bonus: 0.2, note: "They gave up their names, and holy light remembers them anyway." },
  hollow_king: { type: "holy", bonus: 0.12, note: "The crown was never blessed, and it knows the difference." },
};

/** Fallback for anything added later: no weakness, no penalty, no surprises. */
const NO_WEAKNESS: WeaknessDef = { type: "physical", bonus: 0, note: "Nothing in the records says this one has a soft spot." };

/** The weakness of a species, or a harmless default. */
export function monsterWeakness(monsterId: string): WeaknessDef {
  return MONSTER_WEAKNESS[monsterId] ?? NO_WEAKNESS;
}

/** What a hit is worth: 1 for a plain hit, 1 + bonus when the element matches. */
export function weaknessMultiplier(monsterId: string, damageType: DamageType): number {
  const weak = monsterWeakness(monsterId);
  if (weak.bonus <= 0 || weak.type !== damageType) return 1;
  return 1 + weak.bonus;
}

/** True when this hit is the answer the creature cannot help but lose to. */
export function isWeaknessHit(monsterId: string, damageType: DamageType): boolean {
  const weak = monsterWeakness(monsterId);
  return weak.bonus > 0 && weak.type === damageType;
}
