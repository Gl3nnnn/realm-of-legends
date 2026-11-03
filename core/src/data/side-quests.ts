import type { QuestDef } from "../types";

/**
 * Side work that fills the quiet stretches between story bosses. Every quest here uses the
 * same shape as the main list and is attached to an existing NPC, so it shows up in that
 * NPC's conversation without any extra wiring.
 *
 * Design rules followed here:
 * - a step up in level: no quest asks for a monster far above the level it unlocks at
 * - a short count: nothing here needs more than eight kills
 * - one clear reward: a potion, an ore, or a gem, never an empty hand
 */
export const SIDE_QUESTS: QuestDef[] = [
  {
    id: "trail_of_ash",
    name: "Trail of Ash",
    giverNpc: "tobin",
    description:
      "Tobin found burnt grass along the forest edge, in a ring no campfire would make. Walk the ring and see what left it.",
    objectives: [{ kind: "visit", zone: "forest" }],
    rewards: { xp: 180, gold: 45, items: [{ itemId: "health_potion", qty: 2 }] },
    requiresLevel: 2,
  },
  {
    id: "stew_gets_cold",
    name: "Before the Stew Gets Cold",
    giverNpc: "tobin",
    description:
      "Tobin's brother Wade went into the trees after a stag and never came back. Thin the wolves that prowl the same trail, so the way home is safe for him.",
    objectives: [{ kind: "kill", monsterId: "wolf", count: 6 }],
    rewards: { xp: 480, gold: 110, items: [{ itemId: "leather_cap", qty: 1 }] },
    requiresLevel: 4,
    requires: ["trail_of_ash"],
  },
  {
    id: "marsh_boots",
    name: "Boots That Keep",
    giverNpc: "wenna",
    description:
      "Wenna will not walk the marsh in worn boots. Bring her three hides worth of spidersilk and she will teach you how the bog lies.",
    objectives: [{ kind: "kill", monsterId: "venom_spider", count: 3 }],
    rewards: { xp: 700, gold: 140, items: [{ itemId: "traveler_boots", qty: 1 }] },
    requiresLevel: 10,
  },
  {
    id: "what_the_bog_swallowed",
    name: "What the Bog Swallowed",
    giverNpc: "wenna",
    description:
      "The mire keeps what it takes. Wenna wants six bog lurkers dragged out of the water so their packs can be returned to the village.",
    objectives: [{ kind: "kill", monsterId: "bog_lurker", count: 6 }],
    rewards: { xp: 1200, gold: 240, items: [{ itemId: "greater_health_potion", qty: 2 }] },
    requiresLevel: 12,
    requires: ["marsh_boots"],
  },
  {
    id: "watchtower_light",
    name: "The Watchtower Light",
    giverNpc: "ysolde",
    description:
      "Ysolde watched the watchtower fall from the ice road. Reach the ruins and stand where the light used to be, so she knows the way is still open.",
    objectives: [{ kind: "visit", zone: "frost" }],
    rewards: { xp: 2000, gold: 360, items: [{ itemId: "greater_mana_potion", qty: 2 }] },
    requiresLevel: 15,
  },
  {
    id: "hold_the_ice_road",
    name: "Hold the Ice Road",
    giverNpc: "ysolde",
    description:
      "Frost wraiths drift down the ice road every night. Ysolde cannot hold it alone. Stand your ground there for fifteen seconds and the road stays open.",
    objectives: [{ kind: "survive", zone: "frost", count: 15 }],
    rewards: { xp: 2800, gold: 480, items: [{ itemId: "iron_ore", qty: 4 }] },
    requiresLevel: 17,
    requires: ["watchtower_light"],
  },
  {
    id: "the_silent_guard",
    name: "The Silent Guard",
    giverNpc: "aldric",
    description:
      "Sir Aldric guarded the throne for a king who stopped listening. Silence three hollow acolytes so their chanting cannot wake him again.",
    objectives: [{ kind: "kill", monsterId: "hollow_acolyte", count: 3 }],
    rewards: { xp: 5000, gold: 800, items: [{ itemId: "gemstone", qty: 1 }] },
    requiresLevel: 23,
  },
  {
    id: "throne_of_warmth",
    name: "Throne of Warmth",
    giverNpc: "aldric",
    description:
      "Aldric has one last duty: to see the throne occupied by someone who will not take the warmth from the land. Walk every corner of the realm first, so you know what you are guarding.",
    objectives: [{ kind: "explore", zones: ["forest", "marsh", "frost", "throne"] }],
    rewards: { xp: 9000, gold: 1500, items: [{ itemId: "gemstone", qty: 3 }] },
    requiresLevel: 24,
    requires: ["the_silent_guard"],
  },
];

/** Extra lore lines that name the side quests, so the journal and the NPC always agree. */
export const SIDE_QUEST_WHISPERS: Record<string, string> = {
  tobin: "Wade left before dawn and the wolves had already started circling. Every one you thin is one less behind him.",
  wenna: "The marsh keeps count of what it swallows. So do I. Bring me proof and I will teach you where it hides.",
  ysolde: "The watchtower light is what told us the road was clear. Now there is no light, and no one to light it.",
  aldric: "I will not be the one who lets the throne stay empty. Not again. Not after everything that came through it.",
};
