import type { CharacterSave } from "../types";

/**
 * A fragment of world history. Entries reveal themselves as the player
 * advances, so the Bone Warden's story is told a piece at a time.
 */
export interface LoreEntry {
  id: string;
  title: string;
  text: string;
  /** Entry appears once this story chapter has been reached (0 = from the start). */
  chapter: number;
  /** Entry appears once this boss has been defeated. */
  requiresBoss?: string;
}

export const LORE_ENTRIES: LoreEntry[] = [
  {
    id: "warden_1",
    title: "The Gate Captain",
    text:
      "Old records keep one name from before the fall: the captain of Eldoria's gate guard. He swore to hold the crypt road, and on the last night of the siege he was still standing there.",
    chapter: 0,
  },
  {
    id: "warden_2",
    title: "The Refusal",
    text:
      "When the villagers fled, the captain sent his own guard with them and stayed behind alone. Three wounded soldiers begged him to come. He told them the crypt was not a place to leave unguarded.",
    chapter: 0,
  },
  {
    id: "warden_3",
    title: "What Filled Him",
    text:
      "The dark under the barrow does not kill a man. It waits inside him, using the oath he will not break as a door. The captain never surrendered his post, so the dark never had to leave.",
    chapter: 1,
  },
  {
    id: "warden_4",
    title: "The Empty Hall",
    text:
      "The shrine in the barrow was built to honour the dead captain. Later hands left offerings that were never taken, and the hall filled with cenotaphs for soldiers who came home and ones who did not.",
    chapter: 1,
  },
  {
    id: "warden_5",
    title: "Released",
    text:
      "The bone armour was not his. It grew on him, plate by plate, as the dark used the guard's own discipline against him. Breaking the armour finally released the man who had been holding the gate all along.",
    chapter: 1,
    requiresBoss: "bone_warden",
  },
];

/** The entries the player has earned so far. */
export function revealedLore(save: CharacterSave): LoreEntry[] {
  return LORE_ENTRIES.filter((entry) => {
    if (entry.chapter > save.storyChapter) return false;
    if (entry.requiresBoss && !save.defeatedBosses.includes(entry.requiresBoss)) return false;
    return true;
  });
}
