export interface GamePreferences {
  uiScale: 1 | 1.25 | 1.5;
  highContrast: boolean;
  reducedMotion: boolean;
  showDamage: boolean;
}

const STORAGE_KEY = "realm.preferences.v1";

const DEFAULTS: GamePreferences = {
  uiScale: 1,
  highContrast: false,
  reducedMotion: false,
  showDamage: true,
};

export function loadPreferences(): GamePreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<GamePreferences>;
    const scale = parsed.uiScale === 1.25 || parsed.uiScale === 1.5 ? parsed.uiScale : 1;
    return {
      uiScale: scale,
      highContrast: Boolean(parsed.highContrast),
      reducedMotion: Boolean(parsed.reducedMotion),
      showDamage: parsed.showDamage !== false,
    };
  } catch {
    return { ...DEFAULTS };
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
  root.style.setProperty("--ui-scale", String(preferences.uiScale));
}

export function updatePreferences(patch: Partial<GamePreferences>): GamePreferences {
  const next = { ...loadPreferences(), ...patch };
  savePreferences(next);
  applyPreferences(next);
  return next;
}

export const TUTORIAL_STORAGE_KEY = "realm.tutorial.v1";
