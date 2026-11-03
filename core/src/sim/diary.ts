import type { CharacterSave, DiaryEntry } from "../types";
import { playtimeText } from "./journal";

/**
 * The hero's diary: a short list of the things worth remembering, written as they happen.
 * It answers the question a returning player actually has - "what was I doing?" - without
 * making them read the whole quest log again.
 */

/** Kept short on purpose: a page you can read in a few seconds, not a log file. */
export const DIARY_LIMIT = 24;

export const DIARY_ICONS: Record<DiaryEntry["kind"], string> = {
  kill: "🗡",
  quest: "📜",
  boss: "☠",
  level: "⬆",
  loot: "💎",
  death: "💀",
  zone: "🧭",
  achievement: "🏅",
};

/**
 * Write one line into the diary, newest first. Duplicate lines inside a few seconds are
 * dropped, so a swarm of slimes does not fill the whole page with the same sentence.
 */
export function writeDiary(save: CharacterSave, kind: DiaryEntry["kind"], text: string): void {
  const clean = text.trim().slice(0, 160);
  if (!clean) return;
  const previous = save.diary[0];
  if (previous && previous.kind === kind && previous.text === clean && save.playtime - previous.t < 20) return;
  save.diary.unshift({ t: save.playtime, kind, text: clean });
  if (save.diary.length > DIARY_LIMIT) save.diary.length = DIARY_LIMIT;
}

/** The diary, newest first, with a readable clock stamp on every line. */
export function diaryRows(save: CharacterSave): { icon: string; text: string; when: string; kind: DiaryEntry["kind"] }[] {
  return save.diary.map((entry) => ({
    icon: DIARY_ICONS[entry.kind] ?? "•",
    text: entry.text,
    when: playtimeText(entry.t),
    kind: entry.kind,
  }));
}

/** A one-line summary of the most recent entry, for the HUD and the load screen. */
export function lastDiaryLine(save: CharacterSave): string | null {
  return save.diary[0]?.text ?? null;
}
