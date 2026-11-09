/**
 * Companion gear and companion skills.
 *
 * A companion already grows through four stages (see data/pets.ts), but it carried
 * nothing of its own. Now a hero can give it a collar and a charm, and pick one
 * passive skill that turns every bite it lands into something useful.
 *
 * Both are plain materials in the bag: the collar and the charm are worn by the
 * companion, and the save remembers which two were chosen. Food for thought:
 * a worn pet item is kept through the save, not through the inventory.
 */

export type PetGearSlot = "collar" | "charm";
import type { PetGearState } from "../types";

export interface PetGearDef {
  /** Item id, sold by the merchant and found in the world like any other material. */
  id: string;
  name: string;
  slot: PetGearSlot;
  /** The level a companion needs before it will wear it. */
  requiresPetLevel: number;
  /** How much harder the companion hits while this is worn, as a multiplier step. */
  power: number;
  /** Extra speed its bites come at, as a multiplier on the cooldown. */
  tempo: number;
  /** What the hero gets while the companion wears it. */
  bonus: { attack: number; defense: number; maxHp: number; moveSpeed: number };
  description: string;
  buy: number;
}

export const PET_GEAR: PetGearDef[] = [
  {
    id: "pet_collar_leather",
    name: "Leather Collar",
    slot: "collar",
    requiresPetLevel: 1,
    power: 0.08,
    tempo: 0,
    bonus: { attack: 1, defense: 0, maxHp: 0, moveSpeed: 0 },
    description: "A soft strap with a brass tag. The companion bites a little harder.",
    buy: 120,
  },
  {
    id: "pet_collar_iron",
    name: "Iron Collar",
    slot: "collar",
    requiresPetLevel: 6,
    power: 0.16,
    tempo: 0.1,
    bonus: { attack: 2, defense: 1, maxHp: 0, moveSpeed: 0 },
    description: "Heavy plates that turn a bite into a real threat.",
    buy: 380,
  },
  {
    id: "pet_collar_warden",
    name: "Warden's Collar",
    slot: "collar",
    requiresPetLevel: 14,
    power: 0.26,
    tempo: 0.18,
    bonus: { attack: 4, defense: 3, maxHp: 10, moveSpeed: 0 },
    description: "Baroque steel from the king's old guard. The companion carries itself like a soldier.",
    buy: 950,
  },
  {
    id: "pet_charm_twig",
    name: "Twig Charm",
    slot: "charm",
    requiresPetLevel: 1,
    power: 0,
    tempo: 0,
    bonus: { attack: 0, defense: 1, maxHp: 8, moveSpeed: 0 },
    description: "A knotted twig on a cord. A small comfort for a small companion.",
    buy: 100,
  },
  {
    id: "pet_charm_moon",
    name: "Moon Charm",
    slot: "charm",
    requiresPetLevel: 6,
    power: 0.06,
    tempo: 0,
    bonus: { attack: 1, defense: 2, maxHp: 18, moveSpeed: 0 },
    description: "Silver leaf pressed into a pendant. The light makes the partnership steadier.",
    buy: 340,
  },
  {
    id: "pet_charm_ember",
    name: "Ember Charm",
    slot: "charm",
    requiresPetLevel: 14,
    power: 0.12,
    tempo: 0.12,
    bonus: { attack: 3, defense: 2, maxHp: 26, moveSpeed: 2 },
    description: "A coal that never cools. Both hero and companion move with a little more spring.",
    buy: 890,
  },
];

const PET_GEAR_BY_ID = new Map(PET_GEAR.map((gear) => [gear.id, gear]));

export function getPetGear(itemId: string | null | undefined): PetGearDef | undefined {
  if (!itemId) return undefined;
  return PET_GEAR_BY_ID.get(itemId);
}

export function petGearBySlot(slot: PetGearSlot): PetGearDef[] {
  return PET_GEAR.filter((gear) => gear.slot === slot);
}

/** The two worn pet items, as stored on the save. */
export type { PetGearState };

/**
 * Companion skills: one passive, picked at the stable and swapped whenever.
 *
 * Each one changes what the companion's hit does beyond damage, which is what
 * makes a pet feel like a second character rather than a moving stat.
 */
export interface PetSkillDef {
  id: string;
  name: string;
  /** The companion level needed before this skill can be taught. */
  requiresPetLevel: number;
  /** What it does, in plain words. */
  description: string;
  /** The status the bite leaves on the monster, if any. */
  status?: { kind: "poison" | "burn" | "slow" | "mark"; value: number; seconds: number };
  /** Extra hero stats while the skill is taught. */
  bonus?: { attack: number; defense: number; maxHp: number };
  /** Damage multiplier on the companion's own bites. */
  power?: number;
}

export const PET_SKILLS: PetSkillDef[] = [
  {
    id: "bite",
    name: "Bite",
    requiresPetLevel: 1,
    description: "The plain bite it was born with. Nothing added, nothing taken away.",
  },
  {
    id: "guard",
    name: "Guard",
    requiresPetLevel: 6,
    description: "It stands between you and the enemy: +3 defense and +12 health for its hero.",
    bonus: { attack: 0, defense: 3, maxHp: 12 },
  },
  {
    id: "venom",
    name: "Venom Fang",
    requiresPetLevel: 8,
    description: "Every bite poisons the monster for 4 seconds.",
    status: { kind: "poison", value: 3, seconds: 4 },
  },
  {
    id: "chill",
    name: "Chilling Bite",
    requiresPetLevel: 11,
    description: "Every bite slows the monster for 3 seconds, so it cannot run you down.",
    status: { kind: "slow", value: 0.35, seconds: 3 },
  },
  {
    id: "ember",
    name: "Ember Fang",
    requiresPetLevel: 14,
    description: "Every bite sets the monster burning for 3 seconds.",
    status: { kind: "burn", value: 4, seconds: 3 },
  },
  {
    id: "hunters_mark",
    name: "Hunter's Mark",
    requiresPetLevel: 17,
    description: "Every bite marks the monster: it takes more damage from everything you hit it with.",
    status: { kind: "mark", value: 0.2, seconds: 5 },
  },
  {
    id: "frenzy",
    name: "Frenzy",
    requiresPetLevel: 20,
    description: "It bites almost twice as often.",
    power: 1.1,
  },
];

const PET_SKILL_BY_ID = new Map(PET_SKILLS.map((skill) => [skill.id, skill]));

export function getPetSkill(id: string | null | undefined): PetSkillDef | undefined {
  if (!id) return undefined;
  return PET_SKILL_BY_ID.get(id);
}

/** The skills this companion level may be taught, in list order. */
export function petSkillsAvailable(level: number): PetSkillDef[] {
  return PET_SKILLS.filter((skill) => skill.requiresPetLevel <= level);
}

/** Everything the worn gear and the taught skill give, added up. */
export function petLoadoutBonus(gear: PetGearState, skillId: string | null | undefined): {
  attack: number;
  defense: number;
  maxHp: number;
  moveSpeed: number;
  power: number;
  tempo: number;
} {
  const total = { attack: 0, defense: 0, maxHp: 0, moveSpeed: 0, power: 1, tempo: 0 };
  for (const itemId of [gear.collar, gear.charm]) {
    const def = getPetGear(itemId);
    if (!def) continue;
    total.attack += def.bonus.attack;
    total.defense += def.bonus.defense;
    total.maxHp += def.bonus.maxHp;
    total.moveSpeed += def.bonus.moveSpeed;
    total.power += def.power;
    total.tempo += def.tempo;
  }
  const skill = getPetSkill(skillId);
  if (skill) {
    total.attack += skill.bonus?.attack ?? 0;
    total.defense += skill.bonus?.defense ?? 0;
    total.maxHp += skill.bonus?.maxHp ?? 0;
    total.power += skill.power ?? 0;
  }
  return total;
}
