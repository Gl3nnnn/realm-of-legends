import type { ClassId, StatBonus } from "../types";

export type TalentSpecial =
  | "execute"
  | "damageReduction"
  | "lifesteal"
  | "healOnKill"
  | "critDamage"
  | "shieldOnDodge"
  | "cooldown";

export interface TalentChoice {
  id: string;
  classId: ClassId;
  tier: number;
  level: number;
  name: string;
  description: string;
  stats?: StatBonus;
  special?: TalentSpecial;
  value?: number;
}

export interface TalentPassive {
  name: string;
  description: string;
  stats?: StatBonus;
  special?: TalentSpecial;
  value?: number;
}

export interface TalentTier {
  level: number;
  choices: TalentChoice[];
}

export interface TalentTree {
  passive: TalentPassive;
  tiers: TalentTier[];
}

export interface TalentModifiers {
  execute: number;
  damageReduction: number;
  lifesteal: number;
  healOnKill: number;
  critDamage: number;
  shieldOnDodge: number;
  cooldown: number;
}

type Archetype = "martial" | "arcane" | "ranged" | "shadow" | "nature" | "divine" | "tech";

const TIER_LEVELS = [5, 10, 15, 20, 30] as const;

const ARCHETYPE_BY_CLASS: Record<ClassId, Archetype> = {
  warrior: "martial",
  mage: "arcane",
  archer: "ranged",
  assassin: "shadow",
  paladin: "divine",
  priest: "divine",
  necromancer: "shadow",
  druid: "nature",
  monk: "martial",
  gunslinger: "tech",
  berserker: "martial",
  summoner: "arcane",
  ranger: "ranged",
  spellblade: "arcane",
  dragonknight: "martial",
};

const NAMES: Record<Archetype, [string, string][]> = {
  martial: [
    ["Weapon Mastery", "Iron Skin"],
    ["Battle Trance", "Second Wind"],
    ["Executioner", "Bulwark"],
    ["Bloodlust", "Unbreakable"],
    ["Avatar of War", "Living Fortress"],
  ],
  arcane: [
    ["Arcane Focus", "Mana Shield"],
    ["Elemental Edge", "Flow State"],
    ["Overload", "Ward"],
    ["Spell Echo", "Arcane Reservoir"],
    ["Archmage", "Timeless Ward"],
  ],
  ranged: [
    ["Steady Aim", "Light Feet"],
    ["Rapid Fire", "Trailblazer"],
    ["Piercing Shot", "Camouflage"],
    ["Deadeye", "Evasion"],
    ["Storm of Arrows", "Ghost Step"],
  ],
  shadow: [
    ["Backstab", "Quick Reflexes"],
    ["Venom Blades", "Smoke Step"],
    ["Assassinate", "Shadow Cloak"],
    ["Lethality", "Slippery"],
    ["Death Mark", "Umbral Form"],
  ],
  nature: [
    ["Thorned Hide", "Verdant Vitality"],
    ["Toxic Bloom", "Regrowth"],
    ["Wild Fury", "Barkskin"],
    ["Predator", "Grove Guardian"],
    ["Avatar of the Wild", "Eternal Bloom"],
  ],
  divine: [
    ["Zeal", "Grace"],
    ["Smite", "Blessing"],
    ["Radiant Power", "Sanctuary"],
    ["Divine Wrath", "Aegis"],
    ["Ascendance", "Unbroken Faith"],
  ],
  tech: [
    ["Calibrated", "Plating"],
    ["Overclock", "Scrap Shield"],
    ["High Caliber", "Field Repair"],
    ["Chain Reaction", "Auto-Turret"],
    ["Masterwork", "Juggernaut"],
  ],
};

interface Template {
  stats: StatBonus;
  special?: TalentSpecial;
  value?: number;
}

const TEMPLATES: [Template, Template][] = [
  [
    { stats: { attack: 4, crit: 0.02 } },
    { stats: { defense: 5, maxHp: 12 } },
  ],
  [
    { stats: { attack: 7, maxResource: 10 } },
    { stats: { defense: 7, maxHp: 22 } },
  ],
  [
    { stats: { attack: 9, crit: 0.03 }, special: "execute", value: 12 },
    { stats: { defense: 9, maxHp: 35 }, special: "damageReduction", value: 4 },
  ],
  [
    { stats: { attack: 12 }, special: "lifesteal", value: 3 },
    { stats: { defense: 12, maxHp: 45 }, special: "healOnKill", value: 4 },
  ],
  [
    { stats: { attack: 18, crit: 0.06 }, special: "critDamage", value: 20 },
    { stats: { defense: 16, maxHp: 75 }, special: "shieldOnDodge", value: 20 },
  ],
];

const PASSIVES: Record<ClassId, TalentPassive> = {
  warrior: { name: "Battle Hardened", description: "Years of war harden body and nerve.", stats: { defense: 2, maxHp: 12 } },
  mage: { name: "Mana Well", description: "A deep reservoir of arcane power.", stats: { maxResource: 12, attack: 2 }, special: "cooldown", value: 3 },
  archer: { name: "Keen Eye", description: "Every breath reveals the perfect shot.", stats: { crit: 0.02, attack: 2 } },
  assassin: { name: "Predator's Step", description: "Strike first, then vanish.", stats: { moveSpeed: 2, crit: 0.02 } },
  paladin: { name: "Inner Light", description: "Faith shelters the faithful.", stats: { maxHp: 12, maxResource: 8 } },
  priest: { name: "Divine Grace", description: "The light answers every prayer.", stats: { maxResource: 12, defense: 2 } },
  necromancer: { name: "Soul Harvest", description: "Life leaks from every wound you open.", stats: { attack: 2 }, special: "lifesteal", value: 1 },
  druid: { name: "Verdant Regrowth", description: "The wild mends its own.", stats: { maxHp: 18 } },
  monk: { name: "Flowing Form", description: "Motion is the truest armor.", stats: { moveSpeed: 2, defense: 2 } },
  gunslinger: { name: "Quick Draw", description: "The first shot is already away.", stats: { attack: 2, crit: 0.01 }, special: "cooldown", value: 3 },
  berserker: { name: "Blood Rage", description: "Pain only sharpens the blade.", stats: { attack: 3 }, special: "lifesteal", value: 1 },
  summoner: { name: "Bound Spirits", description: "Your companions lend you their essence.", stats: { maxResource: 12 }, special: "cooldown", value: 4 },
  ranger: { name: "Pathfinder", description: "No wild place is truly unknown.", stats: { moveSpeed: 2, attack: 2 } },
  spellblade: { name: "Arcane Edge", description: "Steel and sorcery are one weapon.", stats: { attack: 2, maxResource: 8 }, special: "cooldown", value: 3 },
  dragonknight: { name: "Draconic Scales", description: "The blood of dragons turns aside steel.", stats: { defense: 4, maxHp: 10 } },
};

const STAT_LABELS: Record<keyof StatBonus, string> = {
  attack: "Attack",
  defense: "Defense",
  maxHp: "Health",
  maxResource: "Resource",
  crit: "Crit",
  moveSpeed: "Move Speed",
};

function describe(stats: StatBonus | undefined, special?: TalentSpecial, value?: number): string {
  const parts = Object.entries(stats ?? {}).map(([key, amount]) => {
    const shown = key === "crit" ? `${Math.round(Number(amount) * 100)}%` : String(Math.round(Number(amount)));
    return `+${shown} ${STAT_LABELS[key as keyof StatBonus]}`;
  });
  if (special === "execute") parts.push(`Deal +${value}% damage to enemies below 30% health`);
  if (special === "damageReduction") parts.push(`Take ${value}% less damage`);
  if (special === "lifesteal") parts.push(`Heal for ${value}% of damage dealt`);
  if (special === "healOnKill") parts.push(`Recover ${value}% health on kill`);
  if (special === "critDamage") parts.push(`Critical hits deal +${value}% damage`);
  if (special === "shieldOnDodge") parts.push(`Gain a ${value}-point shield when you dodge`);
  if (special === "cooldown") parts.push(`Ability cooldowns reduced by ${value}%`);
  return parts.join(". ");
}

function buildTree(classId: ClassId): TalentTree {
  const archetype = ARCHETYPE_BY_CLASS[classId];
  const passive = PASSIVES[classId];
  const tiers: TalentTier[] = TIER_LEVELS.map((level, tierIndex) => ({
    level,
    choices: TEMPLATES[tierIndex].map((template, optionIndex) => ({
      id: `${classId}:${tierIndex}:${optionIndex}`,
      classId,
      tier: tierIndex,
      level,
      name: NAMES[archetype][tierIndex][optionIndex],
      description: describe(template.stats, template.special, template.value),
      stats: template.stats,
      special: template.special,
      value: template.value,
    })),
  }));
  return { passive, tiers };
}

const TREES: Record<ClassId, TalentTree> = Object.fromEntries(
  (Object.keys(ARCHETYPE_BY_CLASS) as ClassId[]).map((classId) => [classId, buildTree(classId)]),
) as Record<ClassId, TalentTree>;

const CHOICES = new Map<string, TalentChoice>();
for (const tree of Object.values(TREES)) {
  for (const tier of tree.tiers) {
    for (const choice of tier.choices) CHOICES.set(choice.id, choice);
  }
}

export function getTalentTree(classId: ClassId): TalentTree {
  return TREES[classId];
}

export function getTalentChoice(classId: ClassId, talentId: string): TalentChoice | null {
  const choice = CHOICES.get(talentId);
  return choice && choice.classId === classId ? choice : null;
}

export function talentBonuses(classId: ClassId, talentIds: string[]): StatBonus {
  const total: StatBonus = {};
  const add = (stats?: StatBonus) => {
    if (!stats) return;
    for (const [key, value] of Object.entries(stats) as [keyof StatBonus, number][]) {
      total[key] = (total[key] ?? 0) + value;
    }
  };
  add(TREES[classId].passive.stats);
  for (const id of talentIds) add(getTalentChoice(classId, id)?.stats);
  return total;
}

export function talentModifiers(classId: ClassId, talentIds: string[]): TalentModifiers {
  const modifiers: TalentModifiers = {
    execute: 0,
    damageReduction: 0,
    lifesteal: 0,
    healOnKill: 0,
    critDamage: 0,
    shieldOnDodge: 0,
    cooldown: 0,
  };
  const apply = (special?: TalentSpecial, value?: number) => {
    if (special && value) modifiers[special] += value;
  };
  apply(TREES[classId].passive.special, TREES[classId].passive.value);
  for (const id of talentIds) {
    const choice = getTalentChoice(classId, id);
    apply(choice?.special, choice?.value);
  }
  return modifiers;
}

export function talentTierChosen(classId: ClassId, talentIds: string[], tier: number): TalentChoice | null {
  for (const id of talentIds) {
    const choice = getTalentChoice(classId, id);
    if (choice?.tier === tier) return choice;
  }
  return null;
}

export function allTalentChoices(classId: ClassId): TalentChoice[] {
  return TREES[classId].tiers.flatMap((tier) => tier.choices);
}
