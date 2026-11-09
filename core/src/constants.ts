import type { ResourceKind, StatusInstance } from "./types";

export const TICK_RATE = 60;
export const FIXED_DT = 1 / TICK_RATE;
export const LEVEL_CAP = 50;
export const INVENTORY_SIZE = 24;
/**
 * Seconds of freeze at the moment of a heavy blow. A tiny stop makes a hit feel
 * like it landed; without it, damage is just a number going down.
 */
export const HIT_FREEZE_SECONDS = 0.06;
export const HIT_FREEZE_CRIT_SECONDS = 0.1;
/** How long the world crawls after a boss falls. */
export const BOSS_KILL_SLOWMO_SECONDS = 0.7;
export const BOSS_KILL_SLOWMO_SCALE = 0.25;
/** Gamepad rumble per hit kind, in milliseconds and strength (0-1). */
export const RUMBLE_HIT = { duration: 120, strong: 0.35, weak: 0.15 } as const;
export const RUMBLE_BOSS = { duration: 420, strong: 0.9, weak: 0.6 } as const;
/** The training dummy's own definition id and the meter's window. */
export const DUMMY_MONSTER_ID = "training_dummy";
export const DUMMY_RESET_SECONDS = 8;
/** The vault's final size. Only the first `STASH_CAPACITIES[tier]` squares are usable. */
export const STASH_SIZE = 60;
export const STASH_CAPACITIES = [24, 36, 48, 60] as const;
/** Gold price for opening the next vault tier. Index 0 buys tier 1. */
export const STASH_UPGRADE_COSTS = [500, 1500, 4000] as const;
export const MAX_CHARACTERS = 5;
export const MAX_GOLD = 9_999_999;
export const SAVE_VERSION = 19;
/** How many gems each rarity of gear can hold, in the order of the rarity ladder. */
export const GEM_SOCKETS: Record<"common" | "uncommon" | "rare" | "epic" | "legendary", number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5,
};
/** The highest Torment tier a hero can set. */
export const TORMENT_MAX = 10;
export const PLAYER_RADIUS = 9;
export const PLAYER_SPEED = 96;
export const INTERACT_RANGE = 58;
export const DODGE_DISTANCE = 120;
export const DODGE_DURATION = 0.18;
export const DODGE_COOLDOWN = 1.2;
export const DODGE_INVULN = 0.24;
export const PERFECT_DODGE_WINDOW = 0.18;
export const DODGE_SPEED = DODGE_DISTANCE / DODGE_DURATION;
export const POTION_COOLDOWN = 1;
export const PICKUP_RANGE = 20;
/** Drops are pulled in from a little further away, so a fight does not end in a victory lap. */
export const AUTOLOOT_RADIUS = 34;
export const RESPAWN_SECONDS = 4;
export const AUTOSAVE_INTERVAL_MS = 30_000;
export const COMBAT_TIMEOUT = 6;
export const MAX_CHAT_LOG = 60;

export const RESOURCE_COLORS: Record<ResourceKind, string> = {
  mana: "#4a86ff",
  energy: "#e8c64a",
  rage: "#e04848",
};

export const RESOURCE_LABELS: Record<ResourceKind, string> = {
  mana: "Mana",
  energy: "Energy",
  rage: "Rage",
};

export const RARITY_COLORS = {
  common: "#c9c9d1",
  uncommon: "#56c46b",
  rare: "#4d9fe8",
  epic: "#b05ce8",
  legendary: "#ef9c3a",
} as const;

/** Plain-words names and colours for the effects that can sit on the hero. */
export const STATUS_DISPLAY: Record<StatusInstance["kind"], { label: string; icon: string; color: string; hint: string }> = {
  poison: { label: "Poisoned", icon: "☠", color: "#b8f04a", hint: "Losing health over time" },
  burn: { label: "Burning", icon: "🔥", color: "#ff7a2e", hint: "Fire damage over time" },
  slow: { label: "Slowed", icon: "🐌", color: "#7fb3d5", hint: "Moving slower" },
  stun: { label: "Stunned", icon: "💫", color: "#ffe27a", hint: "Cannot move or act" },
  mark: { label: "Marked", icon: "🎯", color: "#c98bff", hint: "Taking extra damage" },
};
