export type KeybindAction =
  | "up"
  | "down"
  | "left"
  | "right"
  | "attack"
  | "dodge"
  | "interact"
  | "quick1"
  | "quick2";

export type Keybinds = Record<KeybindAction, string>;

// Gamepad button numbers (standard layout: 0 = A, 1 = B, 2 = X, 3 = Y ...).
// Move and aim stay on the sticks; these buttons cover the actions.
export type PadBinds = Partial<Record<KeybindAction, number>>;

export interface GamePreferences {
  uiScale: 1 | 1.25 | 1.5;
  highContrast: boolean;
  reducedMotion: boolean;
  showDamage: boolean;
  screenShake: boolean;
  touchControls: boolean;
  cameraZoom: 1.5 | 2 | 2.5;
  effectIntensity: 0.5 | 1 | 1.5;
  brightness: 1 | 1.2 | 1.4;
  language: "en" | "tl";
  keybinds: Keybinds;
  padBinds: Record<KeybindAction, number>;
}

export const DEFAULT_PAD_BINDS: Record<KeybindAction, number> = {
  up: 12,
  down: 13,
  left: 14,
  right: 15,
  attack: 0,
  dodge: 1,
  interact: 2,
  quick1: 4,
  quick2: 5,
};

export const DEFAULT_KEYBINDS: Keybinds = {
  up: "W",
  down: "S",
  left: "A",
  right: "D",
  attack: "SPACE",
  dodge: "SHIFT",
  interact: "E",
  quick1: "Z",
  quick2: "X",
};

export const KEYBIND_LABELS: Record<KeybindAction, string> = {
  up: "Move up",
  down: "Move down",
  left: "Move left",
  right: "Move right",
  attack: "Basic attack",
  dodge: "Dodge",
  interact: "Interact",
  quick1: "Quick slot 1",
  quick2: "Quick slot 2",
};

export function isReservedKeybind(key: string): boolean {
  return key === "ESC" || key === "TAB" || ["I", "Q", "T", "M", "1", "2", "3", "4", "5"].includes(key);
}

const STORAGE_KEY = "realm.preferences.v1";
const VALID_KEY = /^(?:[A-Z0-9]|SPACE|SHIFT|ESC|TAB|ENTER|UP|DOWN|LEFT|RIGHT)$/;

const DEFAULTS: GamePreferences = {
  uiScale: 1,
  highContrast: false,
  reducedMotion: false,
  showDamage: true,
  screenShake: true,
  touchControls: false,
  cameraZoom: 2,
  effectIntensity: 1,
  brightness: 1,
  language: "en",
  keybinds: { ...DEFAULT_KEYBINDS },
  padBinds: { ...DEFAULT_PAD_BINDS },
};

function sanitizePadBinds(value: unknown): Record<KeybindAction, number> {
  const parsed = (value && typeof value === "object" ? value : {}) as Partial<Record<KeybindAction, unknown>>;
  const next = {} as Record<KeybindAction, number>;
  const used = new Set<number>();
  for (const action of Object.keys(DEFAULT_PAD_BINDS) as KeybindAction[]) {
    const button = parsed[action];
    const validButton = typeof button === "number" && Number.isInteger(button) && button >= 0 && button <= 16 && button !== 9
      ? button
      : undefined;
    let selected = validButton !== undefined && !used.has(validButton) ? validButton : DEFAULT_PAD_BINDS[action];
    if (selected === 9 || used.has(selected)) {
      selected = Array.from({ length: 17 }, (_, index) => index).find((index) => index !== 9 && !used.has(index)) ?? DEFAULT_PAD_BINDS[action];
    }
    next[action] = selected;
    used.add(selected);
  }
  return next;
}

function sanitizeKeybinds(value: unknown): Keybinds {
  const parsed = (value && typeof value === "object" ? value : {}) as Partial<Record<KeybindAction, unknown>>;
  const next = { ...DEFAULT_KEYBINDS };
  for (const action of Object.keys(DEFAULT_KEYBINDS) as KeybindAction[]) {
    const key = parsed[action];
    if (typeof key === "string" && VALID_KEY.test(key) && !isReservedKeybind(key)) next[action] = key;
  }
  return next;
}

export function keyNameFromEvent(event: KeyboardEvent): string {
  if (event.code === "Space") return "SPACE";
  if (event.code === "ShiftLeft" || event.code === "ShiftRight") return "SHIFT";
  if (event.code === "Escape") return "ESC";
  if (event.code === "Tab") return "TAB";
  if (event.code === "Enter") return "ENTER";
  if (event.code === "ArrowUp") return "UP";
  if (event.code === "ArrowDown") return "DOWN";
  if (event.code === "ArrowLeft") return "LEFT";
  if (event.code === "ArrowRight") return "RIGHT";
  const letter = event.key.length === 1 ? event.key.toUpperCase() : "";
  return VALID_KEY.test(letter) ? letter : "";
}

let cachedPreferences: GamePreferences | null = null;

export function loadPreferences(): GamePreferences {
  if (cachedPreferences) return cachedPreferences;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return (cachedPreferences = { ...DEFAULTS, keybinds: { ...DEFAULT_KEYBINDS }, padBinds: { ...DEFAULT_PAD_BINDS } });
    const parsed = JSON.parse(raw) as Partial<GamePreferences>;
    const scale = parsed.uiScale === 1.25 || parsed.uiScale === 1.5 ? parsed.uiScale : 1;
    return (cachedPreferences = {
      uiScale: scale,
      highContrast: Boolean(parsed.highContrast),
      reducedMotion: Boolean(parsed.reducedMotion),
      showDamage: parsed.showDamage !== false,
      screenShake: parsed.screenShake !== false,
      touchControls: Boolean(parsed.touchControls),
      cameraZoom: parsed.cameraZoom === 1.5 || parsed.cameraZoom === 2.5 ? parsed.cameraZoom : 2,
      effectIntensity: parsed.effectIntensity === 0.5 || parsed.effectIntensity === 1.5 ? parsed.effectIntensity : 1,
      brightness: parsed.brightness === 1.2 || parsed.brightness === 1.4 ? parsed.brightness : 1,
      language: parsed.language === "tl" ? "tl" : "en",
      keybinds: sanitizeKeybinds(parsed.keybinds),
      padBinds: sanitizePadBinds(parsed.padBinds),
    });
  } catch {
    return (cachedPreferences = { ...DEFAULTS, keybinds: { ...DEFAULT_KEYBINDS }, padBinds: { ...DEFAULT_PAD_BINDS } });
  }
}

export function savePreferences(preferences: GamePreferences): void {
  cachedPreferences = preferences;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    return;
  }
}

export function applyPreferences(preferences: GamePreferences): void {
  const root = document.documentElement;
  root.dataset.uiScale = String(preferences.uiScale);
  root.dataset.contrast = preferences.highContrast ? "high" : "normal";
  root.dataset.motion = preferences.reducedMotion ? "reduced" : "full";
  root.dataset.touch = preferences.touchControls ? "on" : "auto";
  root.style.setProperty("--ui-scale", String(preferences.uiScale));
  root.style.setProperty("--world-brightness", String(preferences.brightness));
}

export function updatePreferences(patch: Partial<GamePreferences>): GamePreferences {
  const current = loadPreferences();
  const next = { ...current, ...patch };
  if (patch.keybinds) next.keybinds = sanitizeKeybinds({ ...current.keybinds, ...patch.keybinds });
  if (patch.padBinds) next.padBinds = sanitizePadBinds({ ...current.padBinds, ...patch.padBinds });
  savePreferences(next);
  applyPreferences(next);
  return next;
}

export const TUTORIAL_STORAGE_KEY = "realm.tutorial.v1";
