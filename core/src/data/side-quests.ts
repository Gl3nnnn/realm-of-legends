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
  {
    id: "frost_in_the_bones",
    name: "Frost in the Bones",
    giverNpc: "ysolde",
    description:
      "Ysolde says the wraiths on the ice road freeze before they bite. Break their cold with fire and they come apart. She wants to see it done, not hear about it.",
    objectives: [{ kind: "kill", monsterId: "frost_wraith", count: 5 }],
    rewards: { xp: 2400, gold: 420, items: [{ itemId: "greater_health_potion", qty: 2 }] },
    requiresLevel: 16,
    requires: ["watchtower_light"],
  },
  {
    id: "elaras_quiet_ward",
    name: "A Quiet Ward",
    giverNpc: "healer",
    description:
      "Elara can mend a body, but not a habit. She asks you to bring her eight sprigs of silverleaf so she can teach the village children which green things bite back.",
    objectives: [{ kind: "collect", itemId: "herb", count: 8 }],
    rewards: { xp: 320, gold: 90, items: [{ itemId: "health_potion", qty: 3 }] },
    requiresLevel: 3,
  },
  {
    id: "mira_owes_nobody",
    name: "Mira Owes Nobody",
    giverNpc: "merchant",
    description:
      "A cart went over on the marsh road and Mira will not send her own people after it. Clear the spiders from the stretch where it fell, and she will call the debt settled.",
    objectives: [{ kind: "kill", monsterId: "venom_spider", count: 4 }],
    rewards: { xp: 900, gold: 260, items: [{ itemId: "traveler_boots", qty: 1 }] },
    requiresLevel: 11,
  },
  {
    id: "borin_hears_the_forge",
    name: "Borin Hears the Forge",
    giverNpc: "blacksmith",
    description:
      "Borin swears the anvil rings wrong since the mire woke up. Bring him five iron ore dug from ground the marsh has not touched, and he will set the forge right.",
    objectives: [{ kind: "collect", itemId: "iron_ore", count: 5 }],
    rewards: { xp: 1100, gold: 200, items: [{ itemId: "chainmail", qty: 1 }] },
    requiresLevel: 9,
  },
  {
    id: "kaels_last_lesson",
    name: "Master Kael's Last Lesson",
    giverNpc: "trainer",
    description:
      "Master Kael has taught every stance he knows. The last one he cannot teach: bring him proof that you have stood in every kind of ground the realm offers.",
    objectives: [{ kind: "explore", zones: ["village", "forest", "dungeon", "marsh"] }],
    rewards: { xp: 2200, gold: 340, items: [{ itemId: "gemstone", qty: 1 }] },
    requiresLevel: 13,
  },
];

/** Extra lore lines that name the side quests, so the journal and the NPC always agree. */
export const SIDE_QUEST_WHISPERS: Record<string, string> = {
  tobin: "Wade left before dawn and the wolves had already started circling. Every one you thin is one less behind him.",
  wenna: "The marsh keeps count of what it swallows. So do I. Bring me proof and I will teach you where it hides.",
  ysolde: "The watchtower light is what told us the road was clear. Now there is no light, and no one to light it.",
  aldric: "I will not be the one who lets the throne stay empty. Not again. Not after everything that came through it.",
  merchant: "A cart went over on the marsh road last week. I have not sent anyone after it. I would rather owe you than lose someone.",
  blacksmith: "Listen to that anvil. It rings flat, like the steel is remembering something. I need clean ore and I need it before I lose the knack.",
  healer: "Silverleaf grows where the light falls clean. Bring me a handful and I will teach the children which green things bite back.",
  trainer: "There is nothing left I can show you on a training yard. Go and stand where the ground itself is trying to kill you.",
};
