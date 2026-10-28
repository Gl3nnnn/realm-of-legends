export const CHAR_ORDER = ["warrior","mage","archer","assassin","paladin","priest","necromancer","druid","monk","gunslinger","berserker","summoner","ranger","spellblade","dragonknight","warden","oracle","battlemage","shadowdancer","artificer","beastmaster","duelist","elementalist","sentinel","stormcaller","guard","merchant","blacksmith","healer","trainer"];
export const CLASS_ORDER = ["warrior","mage","archer","assassin","paladin","priest","necromancer","druid","monk","gunslinger","berserker","summoner","ranger","spellblade","dragonknight","warden","oracle","battlemage","shadowdancer","artificer","beastmaster","duelist","elementalist","sentinel","stormcaller"];
export const MONSTER_ORDER = ["slime","wolf","skeleton","bone_warden","familiar"];
export const ITEM_ICON_ORDER = ["armor","helm","boots","ring","potion_red","potion_blue","ore","pelt","bone","gem","herb","gel","mace","staff","sword","dagger","gun","bow","lance","fist","axe","book","coin"];
export const ABILITY_ICON_ORDER = ["shield","whirlwind","axe","fire","ice","arcane","meteor","multiarrow","arrow","poison","rain","shadow","dagger","smoke","flurry","holy","heal","judgment","nova","skull","bone","summon","curse","leaf","roots","beast","fist","kick","combo","dragon","gun","ricochet","roll","bullet","eye","rage","cleave","slam","frenzy","familiar","link","command","trap","camouflage","mark","flameblade","frostblade","dash","burst","breath","scale","leap","infernal","earth","taunt","divine","barrier","explosion","lightning","sword","water","lance","wind","storm","book","mace","bow","staff"];

export const CHAR_INDEX: Record<string, number> = {
  "warrior": 0,
  "mage": 1,
  "archer": 2,
  "assassin": 3,
  "paladin": 4,
  "priest": 5,
  "necromancer": 6,
  "druid": 7,
  "monk": 8,
  "gunslinger": 9,
  "berserker": 10,
  "summoner": 11,
  "ranger": 12,
  "spellblade": 13,
  "dragonknight": 14,
  "warden": 15,
  "oracle": 16,
  "battlemage": 17,
  "shadowdancer": 18,
  "artificer": 19,
  "beastmaster": 20,
  "duelist": 21,
  "elementalist": 22,
  "sentinel": 23,
  "stormcaller": 24,
  "guard": 25,
  "merchant": 26,
  "blacksmith": 27,
  "healer": 28,
  "trainer": 29
};
export const MONSTER_INDEX: Record<string, number> = {
  "slime": 0,
  "wolf": 1,
  "skeleton": 2,
  "bone_warden": 3,
  "familiar": 4
};
export const ITEM_ICON_INDEX: Record<string, number> = {
  "armor": 0,
  "helm": 1,
  "boots": 2,
  "ring": 3,
  "potion_red": 4,
  "potion_blue": 5,
  "ore": 6,
  "pelt": 7,
  "bone": 8,
  "gem": 9,
  "herb": 10,
  "gel": 11,
  "mace": 12,
  "staff": 13,
  "sword": 14,
  "dagger": 15,
  "gun": 16,
  "bow": 17,
  "lance": 18,
  "fist": 19,
  "axe": 20,
  "book": 21,
  "coin": 22
};
export const ABILITY_ICON_INDEX: Record<string, number> = {
  "shield": 0,
  "whirlwind": 1,
  "axe": 2,
  "fire": 3,
  "ice": 4,
  "arcane": 5,
  "meteor": 6,
  "multiarrow": 7,
  "arrow": 8,
  "poison": 9,
  "rain": 10,
  "shadow": 11,
  "dagger": 12,
  "smoke": 13,
  "flurry": 14,
  "holy": 15,
  "heal": 16,
  "judgment": 17,
  "nova": 18,
  "skull": 19,
  "bone": 20,
  "summon": 21,
  "curse": 22,
  "leaf": 23,
  "roots": 24,
  "beast": 25,
  "fist": 26,
  "kick": 27,
  "combo": 28,
  "dragon": 29,
  "gun": 30,
  "ricochet": 31,
  "roll": 32,
  "bullet": 33,
  "eye": 34,
  "rage": 35,
  "cleave": 36,
  "slam": 37,
  "frenzy": 38,
  "familiar": 39,
  "link": 40,
  "command": 41,
  "trap": 42,
  "camouflage": 43,
  "mark": 44,
  "flameblade": 45,
  "frostblade": 46,
  "dash": 47,
  "burst": 48,
  "breath": 49,
  "scale": 50,
  "leap": 51,
  "infernal": 52,
  "earth": 53,
  "taunt": 54,
  "divine": 55,
  "barrier": 56,
  "explosion": 57,
  "lightning": 58,
  "sword": 59,
  "water": 60,
  "lance": 61,
  "wind": 62,
  "storm": 63,
  "book": 64,
  "mace": 65,
  "bow": 66,
  "staff": 67
};

export const DIR_ORDER = ["down", "left", "right", "up"] as const;
export const PORTRAIT_ORDER = CLASS_ORDER;

export function charFrame(sprite: string, dir: string, frame: number): number {
  const entity = CHAR_INDEX[sprite] ?? 0;
  const d = Math.max(0, DIR_ORDER.indexOf(dir as (typeof DIR_ORDER)[number]));
  return entity * 16 + d * 4 + (((frame % 4) + 4) % 4);
}

export function monsterFrame(sprite: string, frame: number): number {
  const row = MONSTER_INDEX[sprite] ?? 0;
  return row * 4 + (((frame % 4) + 4) % 4);
}

export function itemIcon(sprite: string): number {
  return ITEM_ICON_INDEX[sprite] ?? ITEM_ICON_INDEX.sword ?? 0;
}

export function abilityIcon(sprite: string): number {
  return ABILITY_ICON_INDEX[sprite] ?? ABILITY_ICON_INDEX.sword ?? 0;
}

export function portraitFrame(sprite: string): { col: number; row: number } {
  const i = Math.max(0, PORTRAIT_ORDER.indexOf(sprite));
  return { col: i % 5, row: Math.floor(i / 5) };
}

export const ATLASES = {
  characters: { key: "characters", file: "assets/characters.png", frameWidth: 32, frameHeight: 32, columns: 4 },
  monsters: { key: "monsters", file: "assets/monsters.png", frameWidth: 32, frameHeight: 32, columns: 4 },
  portraits: { key: "portraits", file: "assets/portraits.png", frameWidth: 64, frameHeight: 64, columns: 5 },
  items: { key: "items", file: "assets/items.png", frameWidth: 16, frameHeight: 16, columns: 8 },
  abilities: { key: "abilities", file: "assets/abilities.png", frameWidth: 16, frameHeight: 16, columns: 8 },
} as const;
