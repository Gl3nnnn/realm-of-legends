/**
 * Torment: the tier dial that makes the whole realm harsher on purpose.
 *
 * Story and Nightmare are the difficulty of the *story*. Torment is the
 * difficulty of the *farmer*: a hero who has finished everything sets a tier,
 * every monster in every zone comes back bigger, and every drop pays more.
 * Tier 0 is the ordinary game, so nothing changes for a new player.
 */

export interface TormentTier {
  tier: number;
  /** A short name for the tier, shown in the hero screen and the journal. */
  name: string;
  /** One line describing what the tier does. */
  description: string;
  /** Monster health multiplier on top of the normal difficulty. */
  hp: number;
  /** Monster damage multiplier. */
  attack: number;
  /** Experience and gold multiplier. */
  reward: number;
  /** Extra chance for a monster to drop gear, from 0 to 1. */
  loot: number;
  /** The hero level needed before the tier can be set. */
  level: number;
  /** The tier only opens after the Hollow King has fallen. */
  needsFinalBoss: boolean;
}

export const TORMENT_TIERS: TormentTier[] = [
  { tier: 0, name: "Torment 0", description: "The realm as it was built. No extra danger, no extra pay.", hp: 1, attack: 1, reward: 1, loot: 0, level: 1, needsFinalBoss: false },
  { tier: 1, name: "Torment 1", description: "Monsters are 25% tougher and pay 20% more.", hp: 1.25, attack: 1.1, reward: 1.2, loot: 0.04, level: 10, needsFinalBoss: false },
  { tier: 2, name: "Torment 2", description: "Monsters are 55% tougher and pay 40% more.", hp: 1.55, attack: 1.2, reward: 1.4, loot: 0.08, level: 15, needsFinalBoss: false },
  { tier: 3, name: "Torment 3", description: "Monsters are 90% tougher and pay 60% more.", hp: 1.9, attack: 1.32, reward: 1.6, loot: 0.12, level: 20, needsFinalBoss: false },
  { tier: 4, name: "Torment 4", description: "Monsters are 2.3x tougher and pay 85% more.", hp: 2.3, attack: 1.45, reward: 1.85, loot: 0.16, level: 25, needsFinalBoss: true },
  { tier: 5, name: "Torment 5", description: "Monsters are 2.8x tougher and pay 2.1x rewards.", hp: 2.8, attack: 1.6, reward: 2.1, loot: 0.2, level: 30, needsFinalBoss: true },
  { tier: 6, name: "Torment 6", description: "Monsters are 3.4x tougher and pay 2.4x rewards.", hp: 3.4, attack: 1.75, reward: 2.4, loot: 0.25, level: 34, needsFinalBoss: true },
  { tier: 7, name: "Torment 7", description: "Monsters are 4.1x tougher and pay 2.7x rewards.", hp: 4.1, attack: 1.9, reward: 2.7, loot: 0.3, level: 38, needsFinalBoss: true },
  { tier: 8, name: "Torment 8", description: "Monsters are 5x tougher and pay 3x rewards.", hp: 5, attack: 2.1, reward: 3, loot: 0.35, level: 42, needsFinalBoss: true },
  { tier: 9, name: "Torment 9", description: "Monsters are 6x tougher and pay 3.5x rewards.", hp: 6, attack: 2.3, reward: 3.5, loot: 0.4, level: 45, needsFinalBoss: true },
  { tier: 10, name: "Torment 10: Mythic", description: "Monsters are 7.2x tougher and pay 4.2x rewards. For heroes with nothing left to prove.", hp: 7.2, attack: 2.5, reward: 4.2, loot: 0.5, level: 48, needsFinalBoss: true },
];

export function tormentTier(tier: number): TormentTier {
  const index = Math.max(0, Math.min(TORMENT_TIERS.length - 1, Math.floor(tier)));
  return TORMENT_TIERS[index]!;
}

/** The highest tier this hero has opened. The save is clamped to it when the tier is set. */
export function unlockedTorment(level: number, defeatedBosses: readonly string[]): number {
  let best = 0;
  for (const entry of TORMENT_TIERS) {
    if (level < entry.level) continue;
    if (entry.needsFinalBoss && !defeatedBosses.includes("hollow_king")) continue;
    best = entry.tier;
  }
  return best;
}
