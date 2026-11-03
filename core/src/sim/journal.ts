import { ACHIEVEMENTS, availableTitles, type AchievementDef } from "../data/achievements";
import { getMonster } from "../data/monsters";
import { xpToNext } from "../progression";
import { ZONES } from "../generated/world-data";
import type { CharacterSave, ZoneId } from "../types";

/**
 * What the hero's journey adds up to. Read by the journal, so every number a player
 * can see is counted in one place instead of being scattered through the UI.
 */

export interface JournalStat {
  label: string;
  /** The number as the player should read it, already rounded into words or digits. */
  value: string;
  /** A one-line note under the number, when it helps. */
  note?: string;
}

export interface AchievementRow extends AchievementDef {
  earned: boolean;
}

/** Every achievement in a fixed order, marked with whether this hero has it. */
export function achievementRows(save: CharacterSave): AchievementRow[] {
  const earned = new Set(save.achievements);
  return ACHIEVEMENTS.map((achievement) => ({ ...achievement, earned: earned.has(achievement.id) }));
}

/** "3 of 14 earned", so the journal can show progress at a glance. */
export function achievementProgress(save: CharacterSave): { earned: number; total: number } {
  const earned = new Set(save.achievements);
  return { earned: ACHIEVEMENTS.filter((achievement) => earned.has(achievement.id)).length, total: ACHIEVEMENTS.length };
}

/** Playtime as "2h 14m", the way a save file usually shows it. */
export function playtimeText(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours <= 0 && minutes <= 0) return `${total}s`;
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

/** How far along the hero is towards the next level, as a whole percent. */
export function levelProgress(save: CharacterSave): { have: number; need: number; percent: number } {
  const need = xpToNext(save.level);
  if (need <= 0) return { have: 0, need: 0, percent: 100 };
  return { have: save.xp, need, percent: Math.max(0, Math.min(100, Math.round((save.xp / need) * 100))) };
}

/** The lifetime counters, in the order a player wants to read them. */
export function journalStats(save: CharacterSave): JournalStat[] {
  const stats = save.stats;
  const titles = availableTitles(save);
  const bosses = new Set(save.defeatedBosses).size;
  const zones = new Set(save.waypoints).size;
  const level = levelProgress(save);
  return [
    { label: "Time played", value: playtimeText(save.playtime) },
    { label: "Level", value: `${save.level}`, note: level.need > 0 ? `${level.percent}% to the next level` : "Max level reached" },
    { label: "Monsters defeated", value: stats.monstersSlain.toLocaleString() },
    { label: "Bosses defeated", value: `${bosses} / 4` },
    { label: "Quests finished", value: stats.questsCompleted.toLocaleString() },
    { label: "Chests opened", value: stats.chestsOpened.toLocaleString() },
    { label: "Gold earned", value: stats.goldEarned.toLocaleString() },
    { label: "Items found", value: stats.itemsFound.toLocaleString() },
    { label: "Potions drunk", value: stats.potionsUsed.toLocaleString() },
    { label: "Perfect dodges", value: stats.perfectDodges.toLocaleString() },
    { label: "Best single hit", value: Math.round(stats.bestHit).toLocaleString() },
    { label: "Best kill streak", value: stats.bestStreak.toLocaleString() },
    { label: "Times fallen", value: stats.deaths.toLocaleString(), note: stats.deaths === 0 ? "Never yet — keep it that way" : undefined },
    { label: "Distance walked", value: `${Math.round(stats.distanceWalked).toLocaleString()} m` },
    { label: "Zones explored", value: `${zones} / ${Object.keys(ZONES).length}` },
    { label: "Titles earned", value: `${titles.length}` },
  ];
}

/** A small line of flavour about the hero's record, so the stats page is not just numbers. */
export function heroVerdict(save: CharacterSave): string {
  const stats = save.stats;
  if (stats.deaths === 0 && save.level >= 10) return "Not once have you fallen. Eldoria tells stories about you.";
  if (stats.bestStreak >= 15) return "Monsters in the forest go quiet when you walk past.";
  if (stats.bossesSlain >= 4) return "The Hollow King is done, and the realm breathes easier.";
  if (stats.questsCompleted >= 20) return "Half the village owes you a favour by now.";
  if (stats.goldEarned >= 10000) return "Your purse is heavier than most shopkeepers' stores.";
  if (stats.monstersSlain >= 50) return "The road out of the village is safer because of you.";
  if (save.level >= 5) return "A name the villagers are starting to learn.";
  return "A new legend, still writing its first page.";
}

/** Fast-travel destinations the hero has unlocked, named for the map. */
export function waypointRows(save: CharacterSave): { id: ZoneId; name: string; safe: boolean; here: boolean }[] {
  return save.waypoints.map((id) => ({
    id,
    name: ZONES[id]?.name ?? id,
    safe: Boolean(ZONES[id]?.safe),
    here: save.zone === id,
  }));
}

/** The boss the hero has beaten most recently, for the stats page. */
export function lastBossName(save: CharacterSave): string | null {
  const last = save.defeatedBosses[save.defeatedBosses.length - 1];
  return last ? (getMonster(last)?.name ?? last) : null;
}
