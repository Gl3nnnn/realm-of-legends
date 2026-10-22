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
