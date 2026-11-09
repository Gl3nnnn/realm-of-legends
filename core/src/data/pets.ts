/** The 20 pet species a hatched egg can become. */
export interface PetSpecies {
  id: string;
  name: string;
  /** Colour used for the hatchling sprite and its hit burst. */
  color: number;
}

export function petSpecies(id: string | undefined): PetSpecies | undefined {
  return PET_SPECIES.find((species) => species.id === id);
}

/**
 * A companion grows through four stages as its level climbs. Each stage raises
 * its damage and, from the second one up, adds a small bonus to the hero as well,
 * so keeping an egg and raising it is worth the bag space.
 */
export interface PetStage {
  /** The stage number, starting at 1. */
  stage: number;
  /** The companion level this stage begins at. */
  fromLevel: number;
  name: string;
  /** Colour the sprite shifts to as it grows. */
  tint: number;
  /** Extra damage multiplier on top of the level bonus. */
  power: number;
  /** What the grown companion gives its hero, in plain words. */
  gift: string;
  /** The same gift as numbers, folded into the hero's stats. */
  bonus: { attack: number; maxHp: number; moveSpeed: number };
}

export const PET_STAGES: PetStage[] = [
  { stage: 1, fromLevel: 1, name: "Hatchling", tint: 0xffffff, power: 1, gift: "A small friend that bites what bites you.", bonus: { attack: 0, maxHp: 0, moveSpeed: 0 } },
  { stage: 2, fromLevel: 6, name: "Youngling", tint: 0xdaffda, power: 1.15, gift: "+2 attack to its hero.", bonus: { attack: 2, maxHp: 0, moveSpeed: 0 } },
  { stage: 3, fromLevel: 12, name: "Companion", tint: 0xfff4c4, power: 1.35, gift: "+4 attack and +10 health to its hero.", bonus: { attack: 4, maxHp: 10, moveSpeed: 0 } },
  { stage: 4, fromLevel: 20, name: "Elder", tint: 0xffe1a8, power: 1.6, gift: "+6 attack, +20 health and +3 movement speed to its hero.", bonus: { attack: 6, maxHp: 20, moveSpeed: 3 } },
];

/** The stage a companion of this level has reached. */
export function petStageFor(level: number): PetStage {
  let stage = PET_STAGES[0]!;
  for (const entry of PET_STAGES) {
    if (level >= entry.fromLevel) stage = entry;
  }
  return stage;
}

/** The stage after this one, or undefined when the companion is already an Elder. */
export function nextPetStage(level: number): PetStage | undefined {
  return PET_STAGES.find((entry) => entry.fromLevel > level);
}

export const PET_SPECIES: PetSpecies[] = [
  { id: "sprout", name: "Sprout", color: 0x8ff58f },
  { id: "ember", name: "Ember", color: 0xff9a55 },
  { id: "tide", name: "Tide", color: 0x6ccaff },
  { id: "pebble", name: "Pebble", color: 0xc4a582 },
  { id: "gust", name: "Gust", color: 0xe2f8ff },
  { id: "glow", name: "Glow", color: 0xfff9a8 },
  { id: "shade", name: "Shade", color: 0x7d6aa6 },
  { id: "frost", name: "Frost", color: 0xc2f4ff },
  { id: "blossom", name: "Blossom", color: 0xffb8dc },
  { id: "spark", name: "Spark", color: 0xfff06a },
  { id: "moss", name: "Moss", color: 0x6fa650 },
  { id: "bolt", name: "Bolt", color: 0xfcfca8 },
  { id: "dusk", name: "Dusk", color: 0xa57aff },
  { id: "coral", name: "Coral", color: 0xff8f8f },
  { id: "sand", name: "Sand", color: 0xffdc96 },
  { id: "ash", name: "Ash", color: 0xb0b0b0 },
  { id: "mist", name: "Mist", color: 0xf0f8fc },
  { id: "ruby", name: "Ruby", color: 0xff5f5f },
  { id: "sapphire", name: "Sapphire", color: 0x5f8fff },
  { id: "amber", name: "Amber", color: 0xffc977 },
];
