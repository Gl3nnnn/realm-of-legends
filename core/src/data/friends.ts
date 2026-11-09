/**
 * Village friends.
 *
 * The villagers already remembered whether the hero was kind or rude, but the
 * number never turned into anything a player could see or spend. A relationship of
 * 7 looked exactly like a relationship of 1.
 *
 * Hearts fix that. Every two points of standing become one heart, up to five, and
 * the standing rises by giving each villager the gift they actually want: ore for
 * Borin, herbs for Elara, gemstones for Mira. At three hearts a villager gives you
 * a keepsake, a trinket that goes in the trinket slot and never washes out of the
 * game. That is the Stardew Valley loop, borrowed and sized down to items and
 * characters the game already had.
 *
 * Hearts live in `save.relationships` (already there, -10 to 10), so no new
 * bookkeeping is needed. Only the keepsake claim is stored, because it pays once.
 */
export const HEART_MAX = 5;

/** The number of hearts a standing value is worth. */
export function heartLevel(relationship: number | undefined): number {
  const value = Number.isFinite(relationship) ? (relationship as number) : 0;
  return Math.max(0, Math.min(HEART_MAX, Math.floor(value / 2)));
}

/** Hearts needed before a villager hands over their keepsake. */
export const KEEPSAKE_HEARTS = 3;

/** A row of filled and empty hearts, for the panel. */
export function heartBar(hearts: number): string {
  const filled = Math.max(0, Math.min(HEART_MAX, hearts));
  return "\u2665".repeat(filled) + "\u2661".repeat(HEART_MAX - filled);
}

export interface FriendGift {
  itemId: string;
  qty: number;
  /** What the villager says when they get it. */
  thanks: string;
}

/** The one thing each villager actually wants. */
export const FRIEND_GIFTS: Record<string, FriendGift> = {
  guard: { itemId: "iron_ore", qty: 2, thanks: "Good iron. The gate will hold a little longer for this." },
  merchant: { itemId: "gemstone", qty: 1, thanks: "Oh, that is a pretty one. I know exactly who will buy it." },
  blacksmith: { itemId: "iron_ore", qty: 3, thanks: "Ore with no rust on it. Now we are talking." },
  healer: { itemId: "herb", qty: 3, thanks: "Silverleaf, and fresh. You have a good eye for it." },
  trainer: { itemId: "bone_shard", qty: 3, thanks: "Old bone, older lesson. I will take it." },
  tobin: { itemId: "wolf_pelt", qty: 2, thanks: "A clean pelt. The winter will be shorter for this." },
  wenna: { itemId: "slime_gel", qty: 4, thanks: "Marsh stuff. It sings, if you know how to listen." },
  ysolde: { itemId: "wolf_pelt", qty: 3, thanks: "Warm lining. I will not forget this on the next watch." },
  aldric: { itemId: "bone_shard", qty: 4, thanks: "From the barrows. Perhaps my king would have liked you." },
};

/** The keepsake each villager hands over at three hearts: a trinket item id. */
export const FRIEND_KEEPSAKES: Record<string, string> = {
  guard: "keepsake_rowan",
  merchant: "keepsake_mira",
  blacksmith: "keepsake_borin",
  healer: "keepsake_elara",
  trainer: "keepsake_kael",
  tobin: "keepsake_tobin",
  wenna: "keepsake_wenna",
  ysolde: "keepsake_ysolde",
  aldric: "keepsake_aldric",
};

/** One line the keepsake panel shows when the gift is handed over. */
export const KEEPSAKE_WORDS: Record<string, string> = {
  guard: "Rowan's Gate Token. He pinned it to your collar without a word.",
  merchant: "Mira's Copper Scale. She says it weighs fair, which from her is a compliment.",
  blacksmith: "Borin's Hammer Ring. Worn thin by a hundred years of the same grip.",
  healer: "Elara's Quiet Bell. It rings once, softly, when you are hurt.",
  trainer: "Kael's Lesson Cord. A knot for each thing he never had to say twice.",
  tobin: "Tobin's Stag Whistle. Wade's, once. He wants you to have it.",
  wenna: "Wenna's Marsh Marble. Something green is still moving inside it.",
  ysolde: "Ysolde's Frost Pin. Cold to the touch, warm against the wrist.",
  aldric: "Aldric's Oath Ring. The last honest thing his king ever gave him.",
};

export interface FriendRow {
  npcId: string;
  name: string;
  role: string;
  color: string;
  /** Points of standing, from -10 to 10. */
  relationship: number;
  hearts: number;
  heartText: string;
  heartsToKeepsake: number;
  keepsakeItemId: string;
  keepsakeClaimed: boolean;
  /** True when the villager is ready to hand the keepsake over. */
  canClaim: boolean;
  gift: FriendGift;
  /** How many of the gift the bag holds right now. */
  have: number;
}

/** Build the rows the friends panel draws, given the save's standing and the bag. */
export function friendRows(
  npcs: { id: string; name: string; role: string; color: string }[],
  relationships: Record<string, number> | undefined,
  keepsakes: readonly string[] | undefined,
  countItem: (itemId: string) => number,
): FriendRow[] {
  return npcs
    .filter((npc) => Boolean(FRIEND_KEEPSAKES[npc.id]))
    .map((npc) => {
      const relationship = (relationships ?? {})[npc.id] ?? 0;
      const hearts = heartLevel(relationship);
      const keepsakeItemId = FRIEND_KEEPSAKES[npc.id] ?? "";
      const claimed = (keepsakes ?? []).includes(keepsakeItemId);
      const gift = FRIEND_GIFTS[npc.id] ?? { itemId: "herb", qty: 1, thanks: "Thank you." };
      return {
        npcId: npc.id,
        name: npc.name,
        role: npc.role,
        color: npc.color,
        relationship,
        hearts,
        heartText: heartBar(hearts),
        heartsToKeepsake: Math.max(0, KEEPSAKE_HEARTS - hearts),
        keepsakeItemId,
        keepsakeClaimed: claimed,
        canClaim: hearts >= KEEPSAKE_HEARTS && !claimed,
        gift,
        have: countItem(gift.itemId),
      };
    });
}
