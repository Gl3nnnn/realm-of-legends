import type { CharacterSave } from "../types";

/**
 * Kept achievements. Each one is a small promise the player can read in the journal,
 * written as a plain goal so it is obvious what still needs doing.
 * `title` is the name plate the hero may wear once the achievement is earned.
 */
export interface AchievementDef {
  id: string;
  name: string;
  hint: string;
  icon: string;
  /** The wearable title this unlocks, shown next to the hero's name. */
  title?: string;
  check: (save: CharacterSave) => boolean;
}

const ALL_ZONES = ["village", "forest", "dungeon", "marsh", "frost", "throne"];

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "first_blood",
    name: "First Blood",
    hint: "Defeat your first monster.",
    icon: "🗡",
    check: (save) => save.stats.monstersSlain >= 1,
  },
  {
    id: "hunter_25",
    name: "Village Hunter",
    hint: "Defeat 25 monsters.",
    icon: "🏹",
    title: "the Hunter",
    check: (save) => save.stats.monstersSlain >= 25,
  },
  {
    id: "hunter_150",
    name: "Realm Menace",
    hint: "Defeat 150 monsters.",
    icon: "⚔",
    title: "the Relentless",
    check: (save) => save.stats.monstersSlain >= 150,
  },
  {
    id: "boss_breaker",
    name: "Warden Breaker",
    hint: "Defeat any story boss.",
    icon: "☠",
    title: "Boss Breaker",
    check: (save) => save.stats.bossesSlain >= 1,
  },
  {
    id: "realm_saviour",
    name: "Saviour of Eldoria",
    hint: "Defeat every story boss.",
    icon: "👑",
    title: "Saviour of Eldoria",
    check: (save) => new Set(save.defeatedBosses).size >= 4,
  },
  {
    id: "helper_10",
    name: "Friend of the Village",
    hint: "Finish 10 quests.",
    icon: "📜",
    title: "the Kind",
    check: (save) => save.stats.questsCompleted >= 10,
  },
  {
    id: "helper_30",
    name: "Eldoria's Errand Runner",
    hint: "Finish 30 quests.",
    icon: "🏅",
    title: "the Trusted",
    check: (save) => save.stats.questsCompleted >= 30,
  },
  {
    id: "coin_purse",
    name: "Deep Pockets",
    hint: "Earn 2,000 gold in total.",
    icon: "💰",
    check: (save) => save.stats.goldEarned >= 2000,
  },
  {
    id: "coin_fortune",
    name: "Fortune Found",
    hint: "Earn 15,000 gold in total.",
    icon: "💎",
    title: "the Wealthy",
    check: (save) => save.stats.goldEarned >= 15000,
  },
  {
    id: "untouched",
    name: "Untouched",
    hint: "Reach level 10 without ever falling.",
    icon: "🛡",
    title: "the Unbroken",
    check: (save) => save.level >= 10 && save.stats.deaths === 0,
  },
  {
    id: "streak_10",
    name: "Clean Sweep",
    hint: "Defeat 10 monsters in a row without taking a hit.",
    icon: "🔥",
    title: "the Flawless",
    check: (save) => save.stats.bestStreak >= 10,
  },
  {
    id: "perfect_5",
    name: "Perfect Timing",
    hint: "Dodge 5 attacks on the very last moment.",
    icon: "💨",
    check: (save) => save.stats.perfectDodges >= 5,
  },
  {
    id: "explorer",
    name: "Far Traveller",
    hint: "Set foot in all six zones.",
    icon: "🧭",
    title: "the Wanderer",
    check: (save) => new Set(save.waypoints).size >= ALL_ZONES.length,
  },
  {
    id: "beast_friend",
    name: "Beast Friend",
    hint: "Hatch the egg a monster dropped.",
    icon: "🐣",
    title: "Beast Friend",
    check: (save) => Boolean(save.companion?.hatched),
  },
];

const BY_ID = new Map(ACHIEVEMENTS.map((achievement) => [achievement.id, achievement]));

export const ACHIEVEMENT_IDS = ACHIEVEMENTS.map((achievement) => achievement.id);

export function getAchievement(id: string): AchievementDef | undefined {
  return BY_ID.get(id);
}

/** Every achievement the save has earned but not been told about yet. */
export function pendingAchievements(save: CharacterSave): AchievementDef[] {
  const earned = new Set(save.achievements);
  return ACHIEVEMENTS.filter((achievement) => !earned.has(achievement.id) && achievement.check(save));
}

/** The title a hero starts with, before any achievement is earned. */
export const DEFAULT_TITLE = "the Wanderer";

/** Titles the hero may wear: the default one plus every earned achievement that grants one. */
export function availableTitles(save: CharacterSave): string[] {
  const titles = new Set<string>([DEFAULT_TITLE]);
  for (const id of save.achievements) {
    const achievement = BY_ID.get(id);
    if (achievement?.title) titles.add(achievement.title);
  }
  return [...titles];
}
