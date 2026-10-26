import type { QuestDef } from "../types";

const defs: QuestDef[] = [
  {
    id: "slime_trouble",
    name: "Slime Trouble",
    giverNpc: "guard",
    description: "Captain Rowan wants the slimes pushed back from the forest road. Defeat five green slimes.",
    objectives: [{ kind: "kill", monsterId: "slime", count: 5 }],
    rewards: { xp: 150, gold: 50, items: [{ itemId: "health_potion", qty: 2 }] },
  },
  {
    id: "wolf_menace",
    name: "Wolf Menace",
    giverNpc: "guard",
    description: "Wolves have been circling the village at night. Thin the pack by defeating four grey wolves.",
    objectives: [{ kind: "kill", monsterId: "wolf", count: 4 }],
    rewards: { xp: 320, gold: 90, items: [{ itemId: "leather_cap", qty: 1 }] },
    requiresLevel: 2,
  },
  {
    id: "herbal_remedy",
    name: "Herbal Remedy",
    giverNpc: "healer",
    description: "Elara needs five Silverleaf Herbs from the Whispering Forest to brew a remedy.",
    objectives: [{ kind: "collect", itemId: "herb", count: 5 }],
    rewards: { xp: 140, gold: 40, items: [{ itemId: "mana_potion", qty: 2 }] },
  },
  {
    id: "bone_breaker",
    name: "Bone Breaker",
    giverNpc: "guard",
    description: "Restless skeletons have risen in the Forgotten Dungeon. Put six of them to rest.",
    objectives: [{ kind: "kill", monsterId: "skeleton", count: 6 }],
    rewards: { xp: 700, gold: 180, items: [{ itemId: "iron_ore", qty: 2 }] },
    requiresLevel: 4,
  },
  {
    id: "forest_bounty",
    name: "Forest Bounty",
    giverNpc: "guard",
    description: "A standing bounty on the forest's pests. Repeatable work for a reliable adventurer.",
    objectives: [
      { kind: "kill", monsterId: "slime", count: 5 },
      { kind: "kill", monsterId: "wolf", count: 3 },
    ],
    rewards: { xp: 250, gold: 60, items: [{ itemId: "health_potion", qty: 1 }] },
    requiresLevel: 3,
    repeatable: true,
  },
  {
    id: "wardens_end",
    name: "Warden's End",
    giverNpc: "trainer",
    description: "Master Kael believes the Bone Warden's restless vigil must end. Descend into the dungeon and destroy it.",
    objectives: [{ kind: "boss", monsterId: "bone_warden" }],
    rewards: { xp: 2000, gold: 400, items: [{ itemId: "gemstone", qty: 1 }] },
    requiresLevel: 7,
  },
];

export const QUESTS: Record<string, QuestDef> = Object.fromEntries(defs.map((d) => [d.id, d]));
export const QUEST_LIST = defs;

export function getQuest(id: string): QuestDef {
  const def = QUESTS[id];
  if (!def) throw new Error(`Unknown quest: ${id}`);
  return def;
}

const expansionQuests: QuestDef[] = [
  {
    id: "marsh_visit",
    name: "Into the Mire",
    giverNpc: "guard",
    description: "Scouts report a foul new marsh beyond the southern forest. Find a safe path and see what stirs there.",
    objectives: [{ kind: "visit", zone: "marsh" }],
    rewards: { xp: 500, gold: 120, items: [{ itemId: "greater_health_potion", qty: 1 }] },
    requiresLevel: 9,
  },
  {
    id: "marsh_cull",
    name: "Bog Cull",
    giverNpc: "guard",
    description: "Bog lurkers are dragging travelers into the mire. Put down eight of them.",
    objectives: [{ kind: "kill", monsterId: "bog_lurker", count: 8 }],
    rewards: { xp: 900, gold: 180, items: [{ itemId: "iron_ore", qty: 3 }] },
    requiresLevel: 10,
  },
  {
    id: "wisp_light",
    name: "Wisp Light",
    giverNpc: "healer",
    description: "Elara can distill mire wisp light into a powerful tonic. Bring her the essence of six wisps.",
    objectives: [{ kind: "kill", monsterId: "mire_wisp", count: 6 }],
    rewards: { xp: 1100, gold: 220, items: [{ itemId: "greater_mana_potion", qty: 2 }] },
    requiresLevel: 11,
  },
  {
    id: "venom_bounty",
    name: "Venom Bounty",
    giverNpc: "guard",
    description: "Venom spiders have overrun the marsh paths. Clear six of their nests.",
    objectives: [{ kind: "kill", monsterId: "venom_spider", count: 6 }],
    rewards: { xp: 1500, gold: 300, items: [{ itemId: "gemstone", qty: 1 }] },
    requiresLevel: 13,
  },
  {
    id: "miremother_fall",
    name: "Mother of the Mire",
    giverNpc: "trainer",
    description: "The Miremother is no mere beast. End her ancient brood before the marsh spreads into the forest.",
    objectives: [{ kind: "boss", monsterId: "miremother" }],
    rewards: { xp: 3500, gold: 600, items: [{ itemId: "gemstone", qty: 2 }] },
    requiresLevel: 14,
  },
  {
    id: "frost_visit",
    name: "The Frozen Gate",
    giverNpc: "guard",
    description: "Beyond the marsh lies a ruined keep sealed in ice. Scout Frostfell Ruins and return alive.",
    objectives: [{ kind: "visit", zone: "frost" }],
    rewards: { xp: 2000, gold: 350, items: [{ itemId: "greater_health_potion", qty: 2 }] },
    requiresLevel: 16,
  },
  {
    id: "frost_patrol",
    name: "Frost Patrol",
    giverNpc: "guard",
    description: "Frost wraiths drift through the ruins. Destroy eight before they reach the marsh road.",
    objectives: [{ kind: "kill", monsterId: "frost_wraith", count: 8 }],
    rewards: { xp: 2600, gold: 450, items: [{ itemId: "iron_ore", qty: 5 }] },
    requiresLevel: 17,
  },
  {
    id: "revenant_ice",
    name: "Ice-Cold Remedy",
    giverNpc: "healer",
    description: "Elara needs three gemstones to anchor a warming ward against the frost.",
    objectives: [{ kind: "collect", itemId: "gemstone", count: 3 }],
    rewards: { xp: 3000, gold: 500, items: [{ itemId: "greater_health_potion", qty: 3 }] },
    requiresLevel: 18,
  },
  {
    id: "frost_revenant_end",
    name: "The Frost Revenant",
    giverNpc: "trainer",
    description: "A revenant of the old keep has awakened. Break its frozen vigil forever.",
    objectives: [{ kind: "boss", monsterId: "frost_revenant" }],
    rewards: { xp: 7000, gold: 1000, items: [{ itemId: "gemstone", qty: 3 }] },
    requiresLevel: 23,
  },
  {
    id: "hollow_acolytes",
    name: "Hollow Choir",
    giverNpc: "guard",
    description: "Hollow acolytes chant beneath the frozen throne. Silence six of them.",
    objectives: [{ kind: "kill", monsterId: "hollow_acolyte", count: 6 }],
    rewards: { xp: 6000, gold: 900, items: [{ itemId: "gemstone", qty: 2 }] },
    requiresLevel: 22,
  },
  {
    id: "kings_end",
    name: "The Hollow King",
    giverNpc: "trainer",
    description: "The Hollow King waits on a throne of frozen bone. End his reign and close the wound in the world.",
    objectives: [{ kind: "boss", monsterId: "hollow_king" }],
    rewards: { xp: 15000, gold: 2500, items: [{ itemId: "gemstone", qty: 5 }] },
    requiresLevel: 26,
  },
];

for (const quest of expansionQuests) {
  defs.push(quest);
  QUESTS[quest.id] = quest;
}
