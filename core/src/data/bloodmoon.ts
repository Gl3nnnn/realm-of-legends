/**
 * The Blood Moon.
 *
 * Zones were predictable: the same spawns, the same walk, the same purse. Nothing
 * ever interrupted a route, so the map stopped being a place and became a corridor.
 *
 * The Blood Moon is the interruption. Every so often the sky turns, the hero is
 * warned, and for a few minutes the land is worth risking: packs arrive twice as
 * thick, doubles arrive twice as often, and everything pays half again as much gold.
 * It is Diablo IV's Helltide and Path of Exile's Vaal side areas, cut down to a
 * timer the game can run on its own clock.
 *
 * The timing lives here so the whole event can be retuned in one file.
 */
export interface BloodMoonWindow {
  /** Seconds from the end of one Blood Moon to the warning of the next. */
  calm: number;
  /** Seconds of warning before the sky turns. Time to walk to a pack. */
  warning: number;
  /** Seconds the Blood Moon itself lasts. */
  duration: number;
}

export const BLOOD_MOON: BloodMoonWindow = {
  calm: 420,
  warning: 20,
  duration: 150,
};

export type BloodMoonPhase = "calm" | "warning" | "rising";

export interface BloodMoonState {
  phase: BloodMoonPhase;
  /** Seconds left in the current phase. */
  remaining: number;
  /** Online for the HUD: true while the event is live. */
  active: boolean;
  /** Seconds until the next one starts, so the journal can show a countdown. */
  nextIn: number;
  label: string;
  blurb: string;
}

/** What the Blood Moon changes while it is up. */
export const BLOOD_MOON_EFFECTS = {
  /** Extra monsters when a zone spawns or a pack is pulled, as a fraction. */
  extraSpawn: 0.6,
  /** Extra gold on every kill, as a fraction. */
  goldBonus: 0.5,
  /** Extra experience on every kill, as a fraction. */
  xpBonus: 0.35,
  /** Extra drop chance on loot rolls, as a fraction. */
  dropBonus: 0.45,
  /** Extra monsters per descent wave. */
  descentExtra: 2,
  /** How much damage everything deals, as a fraction. */
  dangerBonus: 0.15,
};

/** A short line for the journal and the log when the sky turns. */
export const BLOOD_MOON_RISING = "The Blood Moon rises. Packs are thicker and purses are fatter for two and a half minutes.";
export const BLOOD_MOON_WARNING = "A red haze gathers on the horizon. The Blood Moon is coming.";
export const BLOOD_MOON_ENDED = "The Blood Moon sinks below the ridge. The land exhales.";

/** The state the HUD and journal read, worked out from the clock. */
export function bloodMoonState(clock: number): BloodMoonState {
  const calm = BLOOD_MOON.calm;
  const warning = BLOOD_MOON.warning;
  const duration = BLOOD_MOON.duration;
  const cycle = calm + warning + duration;
  const at = ((clock % cycle) + cycle) % cycle;
  if (at < calm) {
    return {
      phase: "calm",
      remaining: calm - at,
      active: false,
      nextIn: calm - at,
      label: "Blood Moon far off",
      blurb: "The land is quiet. Wicks and ore, until the sky changes.",
    };
  }
  if (at < calm + warning) {
    const left = calm + warning - at;
    return {
      phase: "warning",
      remaining: left,
      active: false,
      nextIn: left,
      label: "Red haze gathering",
      blurb: "The Blood Moon is coming. Find a pack to meet it.",
    };
  }
  const left = cycle - at;
  return {
    phase: "rising",
    remaining: left,
    active: true,
    nextIn: duration - left + calm + warning,
    label: "Blood Moon",
    blurb: "Thicker packs, fatter purses, half again the gold.",
  };
}

/** A clock the journal can print, like "3m 12s". */
export function bloodMoonClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/** How many Blood Moons the hero has seen, for the recap and the deed board. */
export const BLOOD_MOON_DEED = "bloodMoons";
