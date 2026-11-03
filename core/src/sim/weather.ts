import type { ZoneId } from "../types";

/**
 * The weather of Eldoria. It changes on its own every few minutes of play, it is
 * decided from the clock rather than stored in the save (so nothing new to migrate),
 * and it does more than look pretty: rain slows the hero a little and makes monsters
 * drop more, fog hides the far side of the map but sharpens the hero's critical aim,
 * and a storm makes everything faster and angrier.
 */

export type WeatherKind = "clear" | "rain" | "storm" | "fog" | "snow" | "ash" | "wind";

export interface WeatherState {
  kind: WeatherKind;
  label: string;
  icon: string;
  /** One plain sentence telling the player what it does to them. */
  detail: string;
  effects: {
    /** Percent added to the hero's movement speed. Negative is slower. */
    moveSpeed: number;
    /** Percent added to monster movement speed. */
    monsterSpeed: number;
    /** Percentage points added to critical chance. */
    crit: number;
    /** Percent added to the chance of a drop. */
    dropBonus: number;
    /** How far the player can see, as a fraction of normal. */
    visibility: number;
  };
}

const BASE: WeatherState["effects"] = { moveSpeed: 0, monsterSpeed: 0, crit: 0, dropBonus: 0, visibility: 1 };

const WEATHER: Record<WeatherKind, Omit<WeatherState, "effects"> & { effect: Partial<WeatherState["effects"]> }> = {
  clear: { kind: "clear", label: "Clear skies", icon: "☀", detail: "Nothing in the air but dust and birdsong.", effect: {} },
  rain: {
    kind: "rain",
    label: "Rain",
    icon: "🌧",
    detail: "Wet ground, but the beasts leave more behind in it.",
    effect: { moveSpeed: -5, dropBonus: 12 },
  },
  storm: {
    kind: "storm",
    label: "Storm",
    icon: "⛈",
    detail: "The sky is furious and so is everything under it.",
    effect: { monsterSpeed: 8, crit: 5, visibility: 0.82 },
  },
  fog: {
    kind: "fog",
    label: "Fog",
    icon: "🌫",
    detail: "You see less, but you strike truer through the grey.",
    effect: { crit: 10, visibility: 0.62, monsterSpeed: -4 },
  },
  snow: {
    kind: "snow",
    label: "Snowfall",
    icon: "❄",
    detail: "Every step drags, and the cold bites at both sides.",
    effect: { moveSpeed: -10, monsterSpeed: -6 },
  },
  ash: {
    kind: "ash",
    label: "Falling ash",
    icon: "🌋",
    detail: "The throne above still burns. Ash sharpens your aim.",
    effect: { crit: 6, visibility: 0.78, dropBonus: 8 },
  },
  wind: {
    kind: "wind",
    label: "High wind",
    icon: "🌬",
    detail: "The road is quick today, and so are you.",
    effect: { moveSpeed: 6, monsterSpeed: -5 },
  },
};

/** Which weather each place can have, so a cave never snows. */
const ZONE_WEATHER: Record<ZoneId, WeatherKind[]> = {
  village: ["clear", "clear", "wind", "rain"],
  forest: ["clear", "rain", "fog", "wind", "storm"],
  dungeon: ["fog", "clear", "ash"],
  marsh: ["fog", "rain", "storm", "clear"],
  frost: ["snow", "storm", "clear", "fog"],
  throne: ["ash", "storm", "fog", "clear"],
};

/** How long one stretch of weather lasts, in seconds of play. */
export const WEATHER_BLOCK_SECONDS = 180;

function seedFor(zone: ZoneId, block: number): number {
  let hash = 0x811c9dc5;
  const text = `${zone}:${block}`;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

/** The weather right now, given the place and how long the hero has been playing. */
export function weatherFor(zone: ZoneId, playtime: number): WeatherState {
  const block = Math.max(0, Math.floor(playtime / WEATHER_BLOCK_SECONDS));
  const options = ZONE_WEATHER[zone] ?? ["clear"];
  const pick = options[seedFor(zone, block) % options.length] ?? "clear";
  const entry = WEATHER[pick];
  return {
    kind: entry.kind,
    label: entry.label,
    icon: entry.icon,
    detail: entry.detail,
    effects: { ...BASE, ...entry.effect },
  };
}
