/**
 * The daily and weekly rhythms of Eldoria.
 *
 * Mobile RPGs keep players coming back with a small, honest reason to open the game
 * every day and a bigger reason to come back every week. Nothing here is bought, and
 * nothing is time-limited in a punishing way: a missed day only resets a streak, and a
 * missed week only means a new seed to chase.
 *
 * Everything is derived from the calendar rather than stored, except for the day the
 * hero last collected and the best score they posted this week.
 */

/** One local calendar day, as "YYYY-MM-DD". */
export function dayKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** The day before a "YYYY-MM-DD" key, so a streak can tell "yesterday" from "last month". */
export function previousDayKey(key: string): string {
  const [year, month, day] = key.split("-").map((part) => Number(part));
  if (!year || !month || !day) return "";
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() - 1);
  return dayKey(date);
}

/** One UTC ISO week, as "YYYY-Www". */
export function weekKey(date: Date = new Date()): string {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** A stable 32-bit hash, used to roll seeds from the calendar and the hero id. */
export function hashText(text: string): number {
  let value = 0x9e3779b9;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 0x85ebca6b) >>> 0;
  }
  return value >>> 0;
}

/** The seed the weekly run and weekly shop use. It changes when the week does. */
export function weeklySeed(key: string, heroId = "realm"): number {
  return hashText(`${key}:${heroId}`);
}

export function dailySeed(key: string, heroId = "realm"): number {
  return hashText(`${key}:${heroId}`);
}

export interface DailyReward {
  gold: number;
  xp: number;
  itemId?: string;
  /** One short line for the claim button. */
  label: string;
}

const DAILY_GOLD = [40, 65, 95, 130, 170, 215, 270];
const DAILY_XP = [0, 0, 40, 0, 80, 0, 150];

/**
 * What today's visit is worth. The streak caps at seven days, so a long absence
 * never makes the reward impossible to understand.
 */
export function dailyReward(streak: number): DailyReward {
  const day = Math.max(1, Math.min(7, Math.floor(streak)));
  const itemId = day === 3 ? "health_potion" : day === 5 ? "greater_health_potion" : day === 7 ? "greater_health_potion" : undefined;
  return {
    gold: DAILY_GOLD[day - 1]!,
    xp: DAILY_XP[day - 1]!,
    itemId,
    label: day >= 7 ? "Seven-day streak" : `Day ${day} reward`,
  };
}

export interface WeeklyModifier {
  /** The calendar week this modifier belongs to. */
  key: string;
  name: string;
  icon: string;
  description: string;
  /** Multipliers applied to the ordinary difficulty scaling. */
  hp: number;
  attack: number;
  xp: number;
  gold: number;
}

interface WeeklyTemplate {
  name: string;
  icon: string;
  description: string;
  hp: number;
  attack: number;
  xp: number;
  gold: number;
}

/**
 * Seven weekly moods. They are light enough that a hero can always play, but
 * different enough that the week feels new: two are generous, two are dangerous,
 * and the rest sit in between.
 */
const WEEKLY_TEMPLATES: WeeklyTemplate[] = [
  {
    name: "Hunt Surge",
    icon: "🏹",
    description: "The wilds are restless: more gold and experience, and slightly tougher beasts.",
    hp: 1.1,
    attack: 1.05,
    xp: 1.2,
    gold: 1.25,
  },
  {
    name: "Blood Moon",
    icon: "🌕",
    description: "Everything bites harder, and everything pays better for the risk.",
    hp: 1.15,
    attack: 1.2,
    xp: 1.25,
    gold: 1.3,
  },
  {
    name: "Gathering Winds",
    icon: "🌬",
    description: "A kinder week: weaker monsters and a little extra coin on the road.",
    hp: 0.9,
    attack: 0.95,
    xp: 1.05,
    gold: 1.1,
  },
  {
    name: "Iron Week",
    icon: "🛡",
    description: "Armoured beasts roam. Slower kills, heavier purses.",
    hp: 1.3,
    attack: 1.05,
    xp: 1.35,
    gold: 1.4,
  },
  {
    name: "Fallen Stars",
    icon: "✨",
    description: "The sky is bright and the roads are rich. A good week to explore.",
    hp: 1,
    attack: 1,
    xp: 1.15,
    gold: 1.2,
  },
  {
    name: "Long Night",
    icon: "🌙",
    description: "The dark presses in. Hit harder, earn a little more, and keep moving.",
    hp: 1.1,
    attack: 1.15,
    xp: 1.15,
    gold: 1.15,
  },
  {
    name: "Clear Roads",
    icon: "☀",
    description: "A fair week for a fair fight. Normal danger, slightly better pay.",
    hp: 1,
    attack: 1,
    xp: 1.1,
    gold: 1.1,
  },
];

/** The modifier for a calendar week. Wednesdays rotate to the next mood. */
export function weeklyModifierFor(key: string): WeeklyModifier {
  const template = WEEKLY_TEMPLATES[weeklySeed(key) % WEEKLY_TEMPLATES.length]!;
  return { key, ...template };
}

/** How many shards a descent wave pays, before the weekly bonus. */
export function shardReward(wave: number): number {
  return 1 + Math.floor(Math.max(1, wave) / 3);
}
