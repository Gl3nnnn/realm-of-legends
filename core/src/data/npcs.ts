import type { NpcDef, ShopDef } from "../types";
import { CLASS_STARTER_WEAPON_IDS, EXPANSION_GEAR_IDS, EXPANSION_SUPPLY_IDS, EXPANSION_WEAPON_IDS } from "./items";

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
    quests: ["slime_trouble", "wolf_menace", "wolf_hunt_chain", "bone_breaker", "forest_bounty", "forest_keeper_gift", "marsh_visit", "marsh_cull", "venom_bounty", "frost_visit", "frost_patrol", "hollow_acolytes", "wider_world", "forest_watch"],
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
  tobin: {
    id: "tobin",
    name: "Tobin",
    role: "Lost Hunter",
    sprite: "guard",
    color: "#6b8f4e",
    dialogue: [
      "My brother Wade went into the trees chasing a stag. He never came back.",
      "You look like you can handle yourself. If you see Wade, tell him the stew is getting cold.",
      "Wade is out there somewhere. Thank you for not giving up on him.",
    ],
  },
  wenna: {
    id: "wenna",
    name: "Old Wenna",
    role: "Bog Witch",
    sprite: "healer",
    color: "#5e7a4a",
    dialogue: [
      "The marsh remembers everything it swallows. Mind where you step.",
      "The Miremother was a mother once. Her grief rotted into something hungry.",
      "You have seen the bog's true face and walked on anyway. The marsh will hear of it.",
    ],
  },
  ysolde: {
    id: "ysolde",
    name: "Ysolde",
    role: "Frostfell Scout",
    sprite: "trainer",
    color: "#7fb3d5",
    dialogue: [
      "Keep moving or the cold will settle in your bones and stay there.",
      "The Frost Revenant came out of the ice the night the watchtower fell. I still hear its call.",
      "You stood against the ice when no one else would. I will tell the others the wastes can be crossed.",
    ],
  },
  aldric: {
    id: "aldric",
    name: "Sir Aldric",
    role: "Restless Knight",
    sprite: "guard",
    color: "#9a9ab0",
    dialogue: [
      "I guarded this throne for my king. Now I guard only the silence.",
      "The Hollow King spoke to me in his own voice. I wish I had not listened.",
      "Mercy at last. Go, and tell the living that the throne is empty.",
    ],
  },
};

/** One extra line per NPC for New Game+ players. Shown instead of the usual lines once a cycle has begun. */
export const NG_PLUS_DIALOGUE: Record<string, string> = {
  guard: "Another cycle, and the same gate. I am not sure I am the same guard who swore to hold it.",
  merchant: "Prices are up again. Not because of greed. The roads are colder every cycle, and so is the coin.",
  blacksmith: "I have forged this same blade three times now. It keeps coming back dull. Strange, that.",
  healer: "I remember patching you up before. You do not look like the one I remember.",
  trainer: "You feel stronger than last cycle. Good. You will need it. Something is watching us go round again.",
  tobin: "The forest remembers you now. It did not, the first time through.",
  wenna: "I saw the Miremother in my dreams again, and she was waiting for you. Do not let her finish the sentence.",
  ysolde: "The frost remembers what you did to the Revenant. It is trying to make it right.",
  aldric: "Each cycle the throne asks for a new king. Each cycle I say no. Do not make me say it again.",
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
      ...EXPANSION_SUPPLY_IDS,
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
      ...CLASS_STARTER_WEAPON_IDS,
      ...EXPANSION_WEAPON_IDS,
      ...EXPANSION_GEAR_IDS,
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
