import type { KeybindAction } from "../ui/preferences";
import { loadPreferences } from "../ui/preferences";

// Input helpers for the world scene. Each takes the scene as its first argument
// so the scene's keyboard, gamepad and keybind state stays in one place.

export type GamepadState = {
  moveX: number;
  moveY: number;
  aimX: number;
  aimY: number;
  attack: boolean;
  dodge: boolean;
  interact: boolean;
  quick1: boolean;
  quick2: boolean;
  menu: boolean;
};

// Re-binds the scene's keys when the player changes a keybind in Settings.
export function syncKeybinds(scene: InputScene, force = false): void {
  if (!force && scene.keybindVersion === scene.ui.keybindVersion) return;
  scene.keybindVersion = scene.ui.keybindVersion;
  const prefs = loadPreferences();
  const next: Partial<Record<KeybindAction, Phaser.Input.Keyboard.Key>> = {};
  for (const [action, key] of Object.entries(prefs.keybinds) as [KeybindAction, string][]) {
    next[action] = scene.input.keyboard!.addKey(key, true, false);
  }
  scene.boundKeys = next;
  scene.input.keyboard!.addCapture(Object.values(prefs.keybinds));
}

export function isDown(scene: InputScene, action: KeybindAction): boolean {
  return Boolean(scene.boundKeys[action]?.isDown);
}

export function justDown(scene: InputScene, action: KeybindAction): boolean {
  const key = scene.boundKeys[action];
  return Boolean(key && Phaser.Input.Keyboard.JustDown(key));
}

// Reads the first connected gamepad. Button presses are edge-detected with padPrev.
export function readGamepad(scene: InputScene): GamepadState {
  const state: GamepadState = {
    moveX: 0, moveY: 0, aimX: 0, aimY: 0,
    attack: false, dodge: false, interact: false, quick1: false, quick2: false, menu: false,
  };
  const pads = typeof navigator.getGamepads === "function" ? navigator.getGamepads() : [];
  const pad = pads ? Array.from(pads).find((entry) => entry && entry.connected) : null;
  if (!pad) {
    scene.padPrev = [];
    return state;
  }
  const dead = (value: number) => Math.abs(value) < 0.25 ? 0 : value;
  const bind = loadPreferences().padBinds;
  state.moveX = dead(pad.axes[0] ?? 0) + (pad.buttons[bind.right]?.pressed ? 1 : 0) - (pad.buttons[bind.left]?.pressed ? 1 : 0);
  state.moveY = dead(pad.axes[1] ?? 0) + (pad.buttons[bind.down]?.pressed ? 1 : 0) - (pad.buttons[bind.up]?.pressed ? 1 : 0);
  const aimX = dead(pad.axes[2] ?? 0);
  const aimY = dead(pad.axes[3] ?? 0);
  if (Math.hypot(aimX, aimY) > 0) {
    state.aimX = aimX;
    state.aimY = aimY;
  }
  const pressed = (index: number) => Boolean(pad.buttons[index]?.pressed);
  const edge = (index: number) => pressed(index) && !scene.padPrev[index];
  state.attack = pressed(bind.attack) || pressed(7);
  state.dodge = edge(bind.dodge);
  state.interact = edge(bind.interact);
  state.quick1 = edge(bind.quick1);
  state.quick2 = edge(bind.quick2);
  state.menu = edge(9);
  scene.padPrev = pad.buttons.map((button) => button.pressed);
  return state;
}

// The scene fields the input helpers read and write.
export type InputScene = {
  boundKeys: Partial<Record<KeybindAction, Phaser.Input.Keyboard.Key>>;
  keybindVersion: number;
  padPrev: boolean[];
  ui: { keybindVersion: number };
  input: Phaser.Input.InputPlugin;
};
