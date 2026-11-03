/** One line of flavour for each boss, shown when it first notices the hero. */
export const BOSS_LORE: Record<string, { text: string; warning: string }> = {
  bone_warden: {
    text: "It kept the dungeon long after the dungeon stopped needing a keeper.",
    warning: "Watch for the sweeping cone. Roll through it, not away.",
  },
  miremother: {
    text: "The marsh is not a place to her. It is a body, and you are standing on it.",
    warning: "Poison pools under your feet. Keep moving or bring antidotes.",
  },
  frost_revenant: {
    text: "It remembers being someone. That is the only thing that still hurts it.",
    warning: "Its rings close in from the edges. Fight near the middle.",
  },
  hollow_king: {
    text: "The throne is empty. The crown is not. Something under it is still wearing it.",
    warning: "He calls acolytes at every phase. Thin them out before the king.",
  },
};

export function bossLore(monsterId: string): { text: string; warning: string } {
  return BOSS_LORE[monsterId] ?? {
    text: "Something old and patient waits here.",
    warning: "Watch its feet and do not stand in the glow.",
  };
}
