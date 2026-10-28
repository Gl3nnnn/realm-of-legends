import type { CharacterSave } from "../types";

/**
 * A fragment of world history. Entries reveal themselves as the player
 * advances, so each boss's story is told a piece at a time.
 */
export interface LoreEntry {
  id: string;
  title: string;
  text: string;
  /** Entry appears once this story chapter has been reached (0 = from the start). */
  chapter: number;
  /** Entry appears once this boss has been defeated. */
  requiresBoss?: string;
  /** The boss whose history this entry belongs to, used to group the journal. */
  about?: string;
}

export const LORE_ENTRIES: LoreEntry[] = [
  // The Bone Warden: the gate captain who never left his post.
  {
    id: "warden_1",
    title: "The Gate Captain",
    text:
      "Old records keep one name from before the fall: the captain of Eldoria's gate guard. He swore to hold the crypt road, and on the last night of the siege he was still standing there.",
    chapter: 0,
    about: "bone_warden",
  },
  {
    id: "warden_2",
    title: "The Refusal",
    text:
      "When the villagers fled, the captain sent his own guard with them and stayed behind alone. Three wounded soldiers begged him to come. He told them the crypt was not a place to leave unguarded.",
    chapter: 0,
    about: "bone_warden",
  },
  {
    id: "warden_3",
    title: "What Filled Him",
    text:
      "The dark under the barrow does not kill a man. It waits inside him, using the oath he will not break as a door. The captain never surrendered his post, so the dark never had to leave.",
    chapter: 1,
    about: "bone_warden",
  },
  {
    id: "warden_4",
    title: "The Empty Hall",
    text:
      "The shrine in the barrow was built to honour the dead captain. Later hands left offerings that were never taken, and the hall filled with cenotaphs for soldiers who came home and ones who did not.",
    chapter: 1,
    about: "bone_warden",
  },
  {
    id: "warden_5",
    title: "Released",
    text:
      "The bone armour was not his. It grew on him, plate by plate, as the dark used the guard's own discipline against him. Breaking the armour finally released the man who had been holding the gate all along.",
    chapter: 1,
    requiresBoss: "bone_warden",
    about: "bone_warden",
  },

  // The Miremother: the marsh healer who bargained with the mire.
  {
    id: "mire_1",
    title: "The Marsh Healer",
    text:
      "Before the water turned, the marshfolk had one healer. She walked the flooded paths with a satchel of roots and never asked the poor for coin, only for a share of the evening meal.",
    chapter: 1,
    about: "miremother",
  },
  {
    id: "mire_2",
    title: "The Fever",
    text:
      "A fever came up out of the flooded fields. The healer saved eleven children in one season and could not save the twelfth, and that one was her daughter.",
    chapter: 1,
    about: "miremother",
  },
  {
    id: "mire_3",
    title: "The Bargain",
    text:
      "She went out to the deep mire alone at night and asked the water for the child back. The mire answered. No one who saw her come home could say she had walked in and out of it.",
    chapter: 1,
    about: "miremother",
  },
  {
    id: "mire_4",
    title: "The Swamp's Keeper",
    text:
      "Marshfolk left bread and salt at the water's edge, and received clear water and quiet nights in return. Then the fever spread again, and the village took its boats and its children and left her there with the reeds.",
    chapter: 1,
    about: "miremother",
  },
  {
    id: "mire_5",
    title: "The Quenched Grief",
    text:
      "The mire had been holding her still, the way a hand holds a candle. When it let go, the reed beds drained and the fever went out of the water. Her daughter's name is still scratched into the stone at the water line.",
    chapter: 2,
    requiresBoss: "miremother",
    about: "miremother",
  },

  // The Frost Revenant: the hunter who answered the Hollow King's call.
  {
    id: "frost_1",
    title: "The Hunter's Trail",
    text:
      "The snow passes had one tracker, a hunter the frost villages paid in bread and firewood. He knew every gap in the rocks and never once lost a trail, not even in a whiteout.",
    chapter: 2,
    about: "frost_revenant",
  },
  {
    id: "frost_2",
    title: "The Call",
    text:
      "When the Hollow King called out from the throne, the villages went quiet. The hunter packed his gear and went north to bring his people home. His tracks stop in open snow, with no sign of a turn.",
    chapter: 2,
    about: "frost_revenant",
  },
  {
    id: "frost_3",
    title: "Standing Watch",
    text:
      "His body froze where he fell, but the cold kept his spirit at its post. He still counts the passes as a hunter, and anything that walks the snow is prey to be tracked.",
    chapter: 2,
    about: "frost_revenant",
  },
  {
    id: "frost_4",
    title: "The Snow That Never Melts",
    text:
      "The ruins keep one ring of ground clear around him. The wind drops inside it, and the frost on the stones is patterned like a hunter's tally marks, added to night after night.",
    chapter: 2,
    about: "frost_revenant",
  },
  {
    id: "frost_5",
    title: "The Watch Ends",
    text:
      "A hunter's work is done when the trail closes. Laid down at last, his spirit left the pass and the snow began to fall evenly again, the way it falls when nothing is being watched.",
    chapter: 2,
    requiresBoss: "frost_revenant",
    about: "frost_revenant",
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

/** The earned entries, grouped under the boss whose history they tell. */
export function loreBySubject(save: CharacterSave): { subject: string; title: string; entries: LoreEntry[] }[] {
  const titles: Record<string, string> = {
    bone_warden: "The Bone Warden",
    miremother: "The Miremother",
    frost_revenant: "The Frost Revenant",
  };
  const groups = new Map<string, LoreEntry[]>();
  for (const entry of revealedLore(save)) {
    const key = entry.about ?? "other";
    const list = groups.get(key) ?? [];
    list.push(entry);
    groups.set(key, list);
  }
  return [...groups.entries()].map(([subject, entries]) => ({
    subject,
    title: titles[subject] ?? "Other records",
    entries,
  }));
}
