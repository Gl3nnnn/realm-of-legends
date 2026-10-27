import type { AbilityDef, ClassId, DamageType } from "@realm/core";

export type VfxStyle =
  | "slash"
  | "cleave"
  | "thrust"
  | "bash"
  | "flurry"
  | "fist"
  | "arrow"
  | "arrowVolley"
  | "gun"
  | "gunVolley"
  | "bolt"
  | "beam"
  | "nova"
  | "rune"
  | "meteor"
  | "rain"
  | "summon"
  | "trap"
  | "dash"
  | "heal"
  | "shield"
  | "buff"
  | "smoke"
  | "mark"
  | "cone"
  | "chain";

export interface VfxDescriptor {
  style: VfxStyle;
  color: string;
  accent: string;
  radius: number;
  duration: number;
  shake: number;
}

const DAMAGE_COLORS: Record<DamageType, string> = {
  physical: "#fff0cc",
  fire: "#ff9a4a",
  ice: "#7fd4ff",
  arcane: "#c99aff",
  holy: "#ffe89a",
  shadow: "#b07ae8",
  nature: "#8ef0a0",
  poison: "#a6e87a",
};

const BASIC_STYLE: Record<ClassId, VfxStyle> = {
  warrior: "slash",
  mage: "bolt",
  archer: "arrow",
  assassin: "slash",
  paladin: "slash",
  priest: "bolt",
  necromancer: "bolt",
  druid: "bolt",
  monk: "fist",
  gunslinger: "gun",
  berserker: "cleave",
  summoner: "bolt",
  ranger: "arrow",
  spellblade: "slash",
  dragonknight: "thrust",
};

const ABILITY_STYLE: Record<string, VfxStyle> = {
  shield_bash: "bash",
  whirlwind: "cleave",
  iron_defense: "shield",
  berserker_strike: "cleave",
  fortified_stance: "nova",
  fireball: "beam",
  ice_shard: "beam",
  arcane_blast: "beam",
  meteor: "meteor",
  arcane_overload: "beam",
  multi_shot: "gunVolley",
  piercing_arrow: "gun",
  poison_arrow: "trap",
  rain_of_arrows: "rain",
  eagles_volley: "rain",
  shadow_strike: "dash",
  backstab: "thrust",
  smoke_bomb: "smoke",
  blade_flurry: "flurry",
  shadow_execution: "cleave",
  holy_strike: "thrust",
  divine_shield: "nova",
  healing_light: "heal",
  judgment: "nova",
  divine_aegis: "buff",
  heal: "heal",
  blessing: "nova",
  purification: "shield",
  holy_nova: "rune",
  sanctuary: "shield",
  soul_drain: "bolt",
  bone_spear: "bolt",
  raise_skeleton: "summon",
  curse: "rune",
  army_of_the_fallen: "summon",
  thorn_burst: "nova",
  natures_embrace: "heal",
  entangling_roots: "rune",
  beast_form: "flurry",
  primal_transformation: "nova",
  rapid_strike: "flurry",
  flying_kick: "thrust",
  focused_breath: "beam",
  dragon_combo: "flurry",
  dragon_ascension: "nova",
  quick_draw: "gun",
  ricochet_shot: "chain",
  evasive_roll: "dash",
  bullet_storm: "gunVolley",
  deadeye: "buff",
  rage: "slash",
  blood_cleave: "cleave",
  ground_slam: "bash",
  frenzy: "flurry",
  unrelenting_fury: "bash",
  summon_wolf: "summon",
  arcane_familiar: "summon",
  spirit_link: "heal",
  command_minions: "buff",
  primal_convergence: "summon",
  trap_snare: "trap",
  eagle_eye: "buff",
  twin_arrow: "arrowVolley",
  camouflage: "smoke",
  hunters_mark: "mark",
  flame_slash: "slash",
  frost_blade: "slash",
  arcane_dash: "dash",
  elemental_burst: "meteor",
  elemental_convergence: "buff",
  dragon_breath: "cone",
  scaled_armor: "shield",
  dragon_leap: "nova",
  infernal_strike: "slash",
  dragons_wrath: "nova",
};

const STYLE_DURATION: Record<VfxStyle, number> = {
  slash: 220,
  cleave: 300,
  thrust: 230,
  bash: 260,
  flurry: 360,
  fist: 190,
  arrow: 220,
  arrowVolley: 300,
  gun: 180,
  gunVolley: 320,
  bolt: 260,
  beam: 320,
  nova: 480,
  rune: 520,
  meteor: 700,
  rain: 650,
  summon: 620,
  trap: 500,
  dash: 300,
  heal: 520,
  shield: 560,
  buff: 600,
  smoke: 500,
  mark: 600,
  cone: 460,
  chain: 380,
};

function fallbackStyle(ability: AbilityDef): VfxStyle {
  const effects = ability.effects;
  if (effects.some((effect) => effect.kind === "summon")) return "summon";
  if (effects.some((effect) => effect.kind === "trap")) return "trap";
  if (effects.some((effect) => effect.kind === "dash")) return "dash";
  if (effects.some((effect) => effect.kind === "heal")) return "heal";
  if (effects.some((effect) => effect.kind === "shield")) return "shield";
  if (effects.some((effect) => effect.kind === "buff")) return "buff";
  if (effects.some((effect) => effect.kind === "mark")) return "mark";
  if (effects.some((effect) => effect.kind === "damage" && effect.radius)) {
    return ability.targeting === "point" ? "rune" : "nova";
  }
  if (effects.some((effect) => effect.kind === "damage" && effect.projectile)) return "bolt";
  if (ability.targeting === "melee") return "slash";
  if (ability.targeting === "self") return "buff";
  return "bolt";
}

function primaryDamageType(ability: AbilityDef): DamageType {
  return ability.effects.find((effect) => effect.damageType)?.damageType ?? "physical";
}

export function resolveAbilityVfx(classId: ClassId, ability: AbilityDef, classAccent: string): VfxDescriptor {
  const style = ability.basic ? BASIC_STYLE[classId] ?? "slash" : ABILITY_STYLE[ability.id] ?? fallbackStyle(ability);
  const damageType = primaryDamageType(ability);
  const hasDamage = ability.effects.some((effect) => effect.kind === "damage");
  const color = hasDamage ? DAMAGE_COLORS[damageType] : style === "heal" ? "#8ef0a0" : classAccent;
  const radius = ability.effects.find((effect) => effect.radius)?.radius ?? (ability.targeting === "self" ? 72 : 26);
  const heavy = style === "meteor" || style === "nova" || style === "rain" || style === "summon";
  // Ultimates (signature skills) get a bigger, longer effect and a stronger shake.
  const signature = ability.signature === true;
  // Spirit Storm is made more dramatic: a wider, longer burst with a bigger shake.
  const dramatic = ability.id === "spirit_storm";
  return {
    style,
    color,
    accent: classAccent,
    radius: signature ? Math.round(radius * 1.3) : dramatic ? Math.round(radius * 1.5) : radius,
    duration: signature ? Math.round(STYLE_DURATION[style] * 1.25) : dramatic ? Math.round(STYLE_DURATION[style] * 1.4) : STYLE_DURATION[style],
    shake: signature ? 0.004 : dramatic ? 0.004 : heavy ? 0.0025 : 0,
  };
}

export function projectileStyle(abilityId: string, classId: ClassId): VfxStyle {
  if (abilityId === "basic") return BASIC_STYLE[classId] ?? "bolt";
  return ABILITY_STYLE[abilityId] ?? "bolt";
}

export function damageColor(damageType: DamageType): string {
  return DAMAGE_COLORS[damageType];
}
