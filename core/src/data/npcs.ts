import type { NpcDef, ShopDef } from "../types";

export const NPCS: Record<string, NpcDef> = {
  guard: {
    id: "guard",
    name: "Captain Rowan",
    role: "Village Guard",
    sprite: "guard",
    color: "#5b7fa6",
    dialogue: [
      "Keep your blade close, traveler. The forest has grown restless.",
      "Clear the slimes and I'll reward you.",
      "The dungeon to the northeast is no place for the unprepared.",
    ],
    quests: ["slime_trouble", "wolf_menace", "bone_breaker", "forest_bounty", "forest_keeper_gift", "marsh_visit", "marsh_cull", "venom_bounty", "frost_visit", "frost_patrol", "hollow_acolytes"],
  },
  merchant: {
    id: "merchant",
    name: "Mira",
    role: "General Merchant",
    sprite: "merchant",
    color: "#b07a3f",
    dialogue: [
      "Potions, pelts, and practical goods. What catches your eye?",
      "I buy anything that isn't nailed down. Well, mostly.",
    ],
    shop: "general",
  },
  blacksmith: {
    id: "blacksmith",
    name: "Borin",
    role: "Blacksmith",
    sprite: "blacksmith",
    color: "#8a4b2f",
    dialogue: [
      "Steel or sorcery, I forge what you need. Bring coin and I'll bring fire.",
      "That blade's seen better days. Let me show you something better.",
    ],
    shop: "forge",
  },
  healer: {
    id: "healer",
    name: "Elara",
    role: "Healer",
    sprite: "healer",
    color: "#4f9e8a",
    dialogue: [
      "Sit. Breathe. The light will do the rest.",
      "Silverleaf grows deep in the forest. I could use a handful, if you're heading that way.",
    ],
    quests: ["herbal_remedy", "wisp_light", "revenant_ice"],
    shop: "healer",
    healer: true,
  },
  trainer: {
    id: "trainer",
    name: "Master Kael",
    role: "Class Trainer",
    sprite: "trainer",
    color: "#7a6a9e",
    dialogue: [
      "Every class has a rhythm. Learn yours and the battlefield becomes a dance.",
      "Your skills awaken as you gain experience. Return when you're stronger.",
      "The Bone Warden in the dungeon guards something old and angry. End it.",
    ],
    quests: ["wardens_end", "miremother_fall", "frost_revenant_end", "kings_end"],
    trainer: true,
  },
};

export const NPCS_LIST = Object.values(NPCS);

export const SHOPS: Record<string, ShopDef> = {
  general: {
    id: "general",
    name: "Mira's Goods",
    itemIds: [
      "health_potion",
      "greater_health_potion",
      "mana_potion",
      "greater_mana_potion",
      "herb",
      "leather_armor",
      "leather_cap",
      "traveler_boots",
      "copper_ring",
      "sage_amulet",
    ],
  },
  forge: {
    id: "forge",
    name: "Borin's Forge",
    itemIds: [
      "iron_sword",
      "steel_sword",
      "oak_staff",
      "ember_staff",
      "shortbow",
      "yew_bow",
      "iron_daggers",
      "shadow_fangs",
      "oathblade",
      "dawnblade",
      "novice_staff",
      "seraph_staff",
      "bone_staff",
      "soul_staff",
      "training_wraps",
      "dragon_knuckles",
      "flintlock",
      "stormlock",
      "hand_axe",
      "blood_axe",
      "apprentice_tome",
      "grimoire",
      "runeblade",
      "spellblade",
      "dragon_lance",
      "wyrmblade",
      "chainmail",
      "plate_armor",
      "iron_helm",
      "swift_boots",
    ],
  },
  healer: {
    id: "healer",
    name: "Elara's Remedies",
    itemIds: [
      "health_potion",
      "greater_health_potion",
      "mana_potion",
      "greater_mana_potion",
      "herb",
      "cloth_robe",
    ],
  },
};

export const HEAL_COST_PER_HP = 0.25;
export const HEAL_MIN_COST = 5;
