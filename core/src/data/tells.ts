/**
 * Attack tells.
 *
 * Until now every monster hit the hero the same way: a short, silent swing with a
 * flat cooldown. A player could not read a fight, only take damage and heal it back,
 * so dodging was luck with a cooldown on it.
 *
 * A tell fixes that with one promise: a heavy attack is always announced first. The
 * creature winds up, a shape appears on the ground for a moment, and only then does
 * the blow land. A hero who moves out of the shape takes nothing. That turns a
 * dangerous pack into something the player chose to risk, which is what a dodge
 * button is for.
 *
 * The warm-up is never shorter than a dodge, so the answer to a tell is always
 * available. Bosses keep their own phase tells and are left alone here.
 */
export interface MonsterTell {
  /** What the wind-up is called in the log, so the player learns the name. */
  name: string;
  shape: "ring" | "line" | "cone" | "spot";
  /** Reach of the shape, in world units. */
  radius: number;
  /** Damage as a multiple of the creature's normal hit. */
  damageMult: number;
  /** Seconds the shape sits on the ground before it lands. */
  delay: number;
  /** How often the creature reaches for a heavy attack instead of a normal one. */
  chance: number;
}

/**
 * One tell per fighting family, keyed by the monster's own id. A creature not listed
 * here simply never winds up, so adding a heavy attack to a new beast is one entry.
 */
export const MONSTER_TELLS: Record<string, MonsterTell> = {
  slime: {
    name: "Slime Slam",
    shape: "spot",
    radius: 34,
    damageMult: 1.7,
    delay: 0.9,
    chance: 0.22,
  },
  wolf: {
    name: "Pouncing Bite",
    shape: "cone",
    radius: 66,
    damageMult: 1.8,
    delay: 0.75,
    chance: 0.3,
  },
  skeleton: {
    name: "Bone Cleave",
    shape: "cone",
    radius: 78,
    damageMult: 2,
    delay: 0.95,
    chance: 0.28,
  },
  cultist: {
    name: "Hex Bolt",
    shape: "line",
    radius: 130,
    damageMult: 1.7,
    delay: 1,
    chance: 0.32,
  },
  goblin: {
    name: "Cheap Shot",
    shape: "spot",
    radius: 30,
    damageMult: 1.6,
    delay: 0.7,
    chance: 0.3,
  },
  bat: {
    name: "Dive",
    shape: "line",
    radius: 96,
    damageMult: 1.5,
    delay: 0.65,
    chance: 0.28,
  },
  wraith: {
    name: "Soul Rend",
    shape: "ring",
    radius: 62,
    damageMult: 2.1,
    delay: 1,
    chance: 0.3,
  },
  mire_hound: {
    name: "Mire Lunge",
    shape: "cone",
    radius: 72,
    damageMult: 1.9,
    delay: 0.85,
    chance: 0.3,
  },
  frost_giant: {
    name: "Glacier Smash",
    shape: "ring",
    radius: 92,
    damageMult: 2.4,
    delay: 1.15,
    chance: 0.3,
  },
  mimic: {
    name: "Chest Bite",
    shape: "spot",
    radius: 40,
    damageMult: 2.2,
    delay: 0.8,
    chance: 0.34,
  },
};

/** The tell for a creature, or undefined when it only ever swings normally. */
export function monsterTell(monsterId: string): MonsterTell | undefined {
  return MONSTER_TELLS[monsterId];
}

/** A line the log can print the first time a creature winds up, so the name sticks. */
export function tellWarning(name: string): string {
  return `${name}! Move out of the shape.`;
}

/** How many tells the hero has dodged, for the recap. Kept here so the tuning stays together. */
export const TELL_TUNING = {
  /** A wind-up is skipped while the hero is already inside the previous shape. */
  minGapSeconds: 1.2,
  /** Damage scale a dodged tell saves, used to word the recap line. */
  dodgeSaves: 0.85,
};
