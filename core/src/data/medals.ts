/**
 * Timed medals.
 *
 * The Ring, the Descent and the gauntlet recorded how deep a hero got, but never
 * how fast. Without a clock a run has no "beat my best": the same wave is cleared
 * the same way every time, and the only number that moves is the depth.
 *
 * A medal fixes that with a plain rule: reach wave N in under a certain number of
 * seconds and the run earns bronze, silver or gold for that depth. The thresholds
 * scale with the depth, because wave 20 is not wave 2, and the save keeps only the
 * fastest time per depth, so a slower repeat never wipes a good run off the board.
 *
 * This is the Hades heat-timer and Hollow Knight speedrun idea, sized for a game
 * that already had every boss it needed.
 */
export type MedalMode = "ring" | "descent" | "gauntlet";

export type MedalTier = "gold" | "silver" | "bronze";

export interface MedalTargets {
  gold: number;
  silver: number;
  bronze: number;
}

export const MEDAL_MODES: { id: MedalMode; label: string; where: string }[] = [
  { id: "ring", label: "Hollow Ring", where: "waves cleared back to back" },
  { id: "descent", label: "Endless Descent", where: "waves of the descent" },
  { id: "gauntlet", label: "The Gauntlet", where: "story bosses, no rest" },
];

/** Gold first, then the two slower tiers. Seconds, scaled by depth. */
export function medalTargets(mode: MedalMode, depth: number): MedalTargets {
  const d = Math.max(1, Math.floor(depth));
  if (mode === "gauntlet") {
    const gold = 60 + d * 45;
    return { gold, silver: Math.round(gold * 1.5), bronze: Math.round(gold * 2.25) };
  }
  const gold = mode === "ring" ? 10 + d * 6 : 12 + d * 8;
  return { gold, silver: Math.round(gold * 1.5), bronze: Math.round(gold * 2.25) };
}

/** The best tier a run earned, or null when it was too slow to medal. */
export function medalFor(mode: MedalMode, depth: number, seconds: number): MedalTier | null {
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  const targets = medalTargets(mode, depth);
  if (seconds <= targets.gold) return "gold";
  if (seconds <= targets.silver) return "silver";
  if (seconds <= targets.bronze) return "bronze";
  return null;
}

/** The key a fastest time is stored under: "ring:12", "descent:4", "gauntlet:3". */
export function medalKey(mode: MedalMode, depth: number): string {
  return `${mode}:${Math.max(1, Math.floor(depth))}`;
}

/** 3 for gold, 2 for silver, 1 for bronze. Used to compare two medals. */
export function medalRank(tier: MedalTier | null): number {
  if (tier === "gold") return 3;
  if (tier === "silver") return 2;
  if (tier === "bronze") return 1;
  return 0;
}

export const MEDAL_LABELS: Record<MedalTier, string> = {
  gold: "Gold",
  silver: "Silver",
  bronze: "Bronze",
};

/** A readable clock for a stored time, like "1m 12s". */
export function medalClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/**
 * Every stored best, as a row the panel can draw: the mode, the depth, the fastest
 * time and the medal it earns. Sorted by mode, then deepest first.
 */
export interface MedalRow {
  mode: MedalMode;
  modeLabel: string;
  depth: number;
  key: string;
  seconds: number;
  clock: string;
  tier: MedalTier | null;
  /** True when the time is within a second of the gold mark, so the panel can tease it. */
  nearGold: boolean;
}

export function medalRows(medals: Record<string, number> | undefined): MedalRow[] {
  const modeLabel = (mode: string) => MEDAL_MODES.find((entry) => entry.id === mode)?.label ?? mode;
  const rows: MedalRow[] = [];
  for (const [key, seconds] of Object.entries(medals ?? {})) {
    const separator = key.indexOf(":");
    if (separator <= 0) continue;
    const mode = key.slice(0, separator) as MedalMode;
    const depth = Number(key.slice(separator + 1));
    if (!MEDAL_MODES.some((entry) => entry.id === mode) || !Number.isFinite(depth) || depth < 1) continue;
    const tier = medalFor(mode, depth, seconds);
    rows.push({
      key,
      mode,
      modeLabel: modeLabel(mode),
      depth,
      seconds,
      clock: medalClock(seconds),
      tier,
      nearGold: seconds > medalTargets(mode, depth).gold && seconds <= medalTargets(mode, depth).gold * 1.15,
    });
  }
  return rows.sort((a, b) => (a.mode === b.mode ? b.depth - a.depth : a.mode.localeCompare(b.mode)));
}

/** How many of each tier the hero has earned, for the journal summary line. */
export function medalCounts(medals: Record<string, number> | undefined): Record<MedalTier, number> {
  const counts: Record<MedalTier, number> = { gold: 0, silver: 0, bronze: 0 };
  for (const row of medalRows(medals)) {
    if (row.tier) counts[row.tier] += 1;
  }
  return counts;
}
