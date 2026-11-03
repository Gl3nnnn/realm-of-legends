import type { BuffInstance } from "../types";

/**
 * Shrine blessings: a small, cheap buff the hero can buy once per in-game day from
 * Elara's shrine. They are the answer to "I am short of gold and out of my depth",
 * and they make the healer worth visiting even at full health.
 */

export interface BlessingDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  cost: number;
  /** How long the blessing lasts, in seconds of play. */
  duration: number;
  buff: Omit<BuffInstance, "remaining">;
}

export const BLESSINGS: BlessingDef[] = [
  {
    id: "hearth",
    name: "Blessing of the Hearth",
    icon: "🔥",
    description: "Warmer blood, a bigger health pool while it lasts.",
    cost: 35,
    duration: 600,
    buff: { name: "Hearth", stat: "maxHp", percent: 15 },
  },
  {
    id: "hunt",
    name: "Blessing of the Hunt",
    icon: "🏹",
    description: "A keener edge on every blow you land.",
    cost: 50,
    duration: 600,
    buff: { name: "Hunt", stat: "attack", percent: 12 },
  },
  {
    id: "wind",
    name: "Blessing of the Road",
    icon: "🌬",
    description: "Lighter feet, so you can kite what you cannot out-hit.",
    cost: 25,
    duration: 600,
    buff: { name: "Road", stat: "moveSpeed", percent: 10 },
  },
  {
    id: "bulwark",
    name: "Blessing of the Bulwark",
    icon: "🛡",
    description: "Stone skin, for the fights that punish a mistake.",
    cost: 45,
    duration: 600,
    buff: { name: "Bulwark", stat: "defense", percent: 18 },
  },
];

export function getBlessing(id: string): BlessingDef | undefined {
  return BLESSINGS.find((blessing) => blessing.id === id);
}

/** One in-game day, in seconds of play, used to limit blessings to one each per day. */
export const BLESSING_DAY_SECONDS = 1200;

export function blessingDay(playtime: number): number {
  return Math.floor(playtime / BLESSING_DAY_SECONDS);
}
