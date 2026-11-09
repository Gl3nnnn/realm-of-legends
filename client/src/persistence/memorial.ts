import type { MemorialEntry } from "@realm/core";

/**
 * The memorial wall.
 *
 * A hardcore hero dies for good: the save is deleted, exactly as it would be if
 * the player pressed delete. What survives is this one short line, kept in the
 * browser so the wall can still name them next time the game opens.
 *
 * The wall is capped, oldest cut first, so it can never grow without limit.
 */
const STORAGE_KEY = "realm.memorial";
const MAX_ENTRIES = 40;

export function readMemorial(): MemorialEntry[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is MemorialEntry =>
      Boolean(entry)
      && typeof entry === "object"
      && typeof (entry as MemorialEntry).name === "string"
      && typeof (entry as MemorialEntry).level === "number",
    );
  } catch {
    return [];
  }
}

/** Add one fallen hero to the wall, newest first. */
export function addMemorialEntry(entry: MemorialEntry): MemorialEntry[] {
  const entries = [entry, ...readMemorial()].slice(0, MAX_ENTRIES);
  writeMemorial(entries);
  return entries;
}

/** Clear the wall, for a player who wants a clean slate. */
export function clearMemorial(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // A browser that refuses storage simply keeps no wall, which is not fatal.
  }
}

function writeMemorial(entries: MemorialEntry[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Out of quota: the wall just keeps whatever was already there.
  }
}
