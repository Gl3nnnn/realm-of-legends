import type { AbilityDef, ClassDef } from "../types";

/**
 * Ability mastery. Every time a skill is actually used it earns a little experience of its
 * own, and at each rank it becomes slightly cheaper and slightly faster. It rewards playing
 * the kit you have instead of only chasing new levels, and it gives the journal something
 * to show for hours of play.
 */

/** How many casts each rank costs, in order: rank 1 needs 15 casts, rank 5 needs 500. */
export const MASTERY_THRESHOLDS = [0, 15, 40, 90, 180, 500] as const;

export const MAX_MASTERY = MASTERY_THRESHOLDS.length - 1;

export interface MasteryState {
  abilityId: string;
  name: string;
  icon: string;
  uses: number;
  rank: number;
  /** Progress towards the next rank, as a whole percent. */
  percent: number;
  /** Casts still needed for the next rank, or 0 at the top rank. */
  toNext: number;
  /** Resource cost saved at this rank, as a percentage. */
  costCut: number;
  /** Cooldown saved at this rank, as a percentage. */
  cooldownCut: number;
}

/** The rank a cast count has earned. */
export function rankFor(uses: number): number {
  let rank = 0;
  for (let i = 1; i < MASTERY_THRESHOLDS.length; i += 1) {
    if (uses >= MASTERY_THRESHOLDS[i]!) rank = i;
  }
  return rank;
}

/** Each rank shaves a little off the resource cost, and a little more off the cooldown. */
export function masteryCostCut(rank: number): number {
  return rank * 4;
}

export function masteryCooldownCut(rank: number): number {
  return rank * 3;
}

/** Every ability of one class, with the mastery the hero has earned on it. */
export function masteryRows(classDef: ClassDef, uses: Record<string, number>): MasteryState[] {
  const abilities: AbilityDef[] = [classDef.basic, ...classDef.abilities];
  return abilities.map((ability) => {
    const count = Math.max(0, uses[ability.id] ?? 0);
    const rank = rankFor(count);
    const next = rank < MAX_MASTERY ? MASTERY_THRESHOLDS[rank + 1]! : 0;
    const floor = MASTERY_THRESHOLDS[rank]!;
    const percent = rank >= MAX_MASTERY || next <= floor
      ? 100
      : Math.max(0, Math.min(100, Math.round(((count - floor) / (next - floor)) * 100)));
    return {
      abilityId: ability.id,
      name: ability.name,
      icon: ability.icon,
      uses: count,
      rank,
      percent,
      toNext: rank < MAX_MASTERY ? Math.max(0, next - count) : 0,
      costCut: masteryCostCut(rank),
      cooldownCut: masteryCooldownCut(rank),
    };
  });
}

/** How many abilities the hero has taken to rank 3 or better, for the journal summary. */
export function masteredCount(rows: MasteryState[]): number {
  return rows.filter((row) => row.rank >= 3).length;
}

/** The mastery of one ability, or null when that id is not part of this class. */
export function masteryFor(classDef: ClassDef, uses: Record<string, number>, abilityId: string): MasteryState | null {
  return masteryRows(classDef, uses).find((row) => row.abilityId === abilityId) ?? null;
}
