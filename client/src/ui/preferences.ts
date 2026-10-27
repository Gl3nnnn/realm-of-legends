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

export interface GamePreferences {
  uiScale: 1 | 1.25 | 1.5;
  highContrast: boolean;
  reducedMotion: boolean;
  showDamage: boolean;
  screenShake: boolean;
  touchControls: boolean;
  cameraZoom: 1.5 | 2 | 2.5;
  effectIntensity: 0.5 | 1 | 1.5;
  keybinds: Keybinds;
}

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
  keybinds: { ...DEFAULT_KEYBINDS },
};

function sanitizeKeybinds(value: unknown): Keybinds {
  const parsed = (value && typeof value === "object" ? value : {}) as Partial<Record<KeybindAction, unknown>>;
  const next = { ...DEFAULT_KEYBINDS };
  for (const action of Object.keys(DEFAULT_KEYBINDS) as KeybindAction[]) {
    const key = parsed[action];
    if (typeof key === "string" && VALID_KEY.test(key)) next[action] = key;
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

export function loadPreferences(): GamePreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS, keybinds: { ...DEFAULT_KEYBINDS } };
    const parsed = JSON.parse(raw) as Partial<GamePreferences>;
    const scale = parsed.uiScale === 1.25 || parsed.uiScale === 1.5 ? parsed.uiScale : 1;
    return {
      uiScale: scale,
      highContrast: Boolean(parsed.highContrast),
      reducedMotion: Boolean(parsed.reducedMotion),
      showDamage: parsed.showDamage !== false,
      screenShake: parsed.screenShake !== false,
      touchControls: Boolean(parsed.touchControls),
      cameraZoom: parsed.cameraZoom === 1.5 || parsed.cameraZoom === 2.5 ? parsed.cameraZoom : 2,
      effectIntensity: parsed.effectIntensity === 0.5 || parsed.effectIntensity === 1.5 ? parsed.effectIntensity : 1,
      keybinds: sanitizeKeybinds(parsed.keybinds),
    };
  } catch {
    return { ...DEFAULTS, keybinds: { ...DEFAULT_KEYBINDS } };
  }
}

export function savePreferences(preferences: GamePreferences): void {
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
}

export function updatePreferences(patch: Partial<GamePreferences>): GamePreferences {
  const current = loadPreferences();
  const next = { ...current, ...patch };
  if (patch.keybinds) next.keybinds = sanitizeKeybinds({ ...current.keybinds, ...patch.keybinds });
  savePreferences(next);
  applyPreferences(next);
  return next;
}

export const TUTORIAL_STORAGE_KEY = "realm.tutorial.v1";
