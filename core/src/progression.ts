import { LEVEL_CAP } from "./constants";
import { getItem } from "./data/items";
import type { AbilityDef, ClassDef, Equipment, ResourceKind, StatBonus } from "./types";

export interface DerivedStats {
  maxHp: number;
  maxResource: number;
  attack: number;
  defense: number;
  crit: number;
  moveSpeed: number;
}

export function xpToNext(level: number): number {
  if (level >= LEVEL_CAP) return 0;
  return Math.floor(90 * Math.pow(level, 1.35) + 40 * level);
}

export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i += 1) total += xpToNext(i);
  return total;
}

export function equipmentBonuses(equipment: Equipment): StatBonus {
  const total: StatBonus = {};
  for (const stack of Object.values(equipment)) {
    if (!stack) continue;
    const def = getItem(stack.itemId);
    if (!def.stats) continue;
    for (const [key, value] of Object.entries(def.stats) as [keyof StatBonus, number][]) {
      total[key] = (total[key] ?? 0) + value;
    }
  }
  return total;
}

export function deriveStats(classDef: ClassDef, level: number, equipment: Equipment): DerivedStats {
  const bonus = equipmentBonuses(equipment);
  const levels = Math.max(0, level - 1);
  return {
    maxHp: Math.floor(classDef.base.maxHp + classDef.growth.maxHp * levels + (bonus.maxHp ?? 0)),
    maxResource: Math.floor(classDef.base.maxResource + classDef.growth.maxResource * levels + (bonus.maxResource ?? 0)),
    attack: classDef.base.attack + classDef.growth.attack * levels + (bonus.attack ?? 0),
    defense: Math.max(0, classDef.base.defense + classDef.growth.defense * levels + (bonus.defense ?? 0)),
    crit: Math.min(0.75, Math.max(0, classDef.base.crit + (bonus.crit ?? 0))),
    moveSpeed: Math.max(40, classDef.base.moveSpeed + (bonus.moveSpeed ?? 0)),
  };
}

export function unlockedAbilities(classDef: ClassDef, level: number): AbilityDef[] {
  return classDef.abilities.filter((a) => a.unlockLevel <= level).sort((a, b) => a.unlockLevel - b.unlockLevel);
}

export function isAbilityUnlocked(classDef: ClassDef, level: number, abilityId: string): boolean {
  if (abilityId === "basic") return true;
  const ability = classDef.abilities.find((a) => a.id === abilityId);
  return Boolean(ability && ability.unlockLevel <= level);
}

export function resourceRegen(kind: ResourceKind, maxResource: number): number {
  if (kind === "mana") return 1 + maxResource * 0.03;
  if (kind === "energy") return 2 + maxResource * 0.05;
  return 0;
}

export function rageDecayPerSecond(): number {
  return 2;
}

export function clampLevel(level: number): number {
  return Math.max(1, Math.min(LEVEL_CAP, Math.floor(level)));
}
