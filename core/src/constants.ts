import type { ResourceKind } from "./types";

export const TICK_RATE = 60;
export const FIXED_DT = 1 / TICK_RATE;
export const LEVEL_CAP = 50;
export const INVENTORY_SIZE = 24;
export const MAX_CHARACTERS = 5;
export const SAVE_VERSION = 5;
export const PLAYER_RADIUS = 9;
export const PLAYER_SPEED = 96;
export const INTERACT_RANGE = 58;
export const DODGE_DISTANCE = 120;
export const DODGE_DURATION = 0.18;
export const DODGE_COOLDOWN = 1.2;
export const DODGE_INVULN = 0.24;
export const DODGE_SPEED = DODGE_DISTANCE / DODGE_DURATION;
export const POTION_COOLDOWN = 1;
export const PICKUP_RANGE = 20;
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
