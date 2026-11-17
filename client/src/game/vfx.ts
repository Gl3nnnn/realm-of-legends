import type { AbilityDef, ClassId, DamageType } from "@realm/core";
import { loadPreferences } from "../ui/preferences";

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
  | "chain"
  // Styles added so a skill's picture matches what its text promises.
  | "fireball"
  | "iceShard"
  | "arcaneBlast"
  | "drain"
  | "roots"
  | "quake"
  | "smash"
  | "smite"
  | "venom"
  | "spin"
  | "spear"
  // Shapes for skills whose text promises something none of the above draws.
  | "explosion"
  | "roar"
  | "stoneRing"
  | "tide";

export interface VfxDescriptor {
  style: VfxStyle;
  color: string;
  accent: string;
  radius: number;
  duration: number;
  shake: number;
}

const DAMAGE_COLORS: Record<DamageType, string> = {
  physical: "#ffeccb",
  fire: "#ff7a2e",
  ice: "#8fe6ff",
  arcane: "#c98bff",
  holy: "#ffe27a",
  shadow: "#9a5cf0",
  nature: "#6ff09a",
  poison: "#b8f04a",
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
  warden: "cleave",
  oracle: "bolt",
  battlemage: "slash",
  shadowdancer: "slash",
  artificer: "gun",
  beastmaster: "arrow",
  duelist: "thrust",
  elementalist: "bolt",
  sentinel: "thrust",
  stormcaller: "bolt",
};

const ABILITY_STYLE: Record<string, VfxStyle> = {
  // Warrior: steel, guard and a wide spin
  shield_bash: "bash",
  whirlwind: "spin",
  iron_defense: "shield",
  berserker_strike: "smash",
  fortified_stance: "shield",
  // Mage: fire, ice and raw arcane
  fireball: "fireball",
  ice_shard: "iceShard",
  arcane_blast: "arcaneBlast",
  meteor: "meteor",
  arcane_overload: "buff",
  // Archer
  multi_shot: "arrowVolley",
  piercing_arrow: "arrow",
  poison_arrow: "venom",
  rain_of_arrows: "rain",
  eagles_volley: "rain",
  // Assassin: vanish and cut
  shadow_strike: "dash",
  backstab: "thrust",
  smoke_bomb: "smoke",
  blade_flurry: "flurry",
  // Text: "a devastating strike that demands close range" - one heavy blow, not a wide sweep.
  shadow_execution: "smash",
  // Paladin: radiant steel
  holy_strike: "thrust",
  divine_shield: "shield",
  healing_light: "heal",
  judgment: "smite",
  divine_aegis: "shield",
  // Priest: light and ward
  heal: "heal",
  blessing: "buff",
  purification: "heal",
  holy_nova: "nova",
  sanctuary: "heal",
  // Necromancer: graves and rot
  soul_drain: "drain",
  bone_spear: "spear",
  raise_skeleton: "summon",
  curse: "rune",
  army_of_the_fallen: "summon",
  // Druid: thorn and root
  thorn_burst: "roots",
  natures_embrace: "heal",
  entangling_roots: "roots",
  beast_form: "buff",
  primal_transformation: "buff",
  // Monk
  rapid_strike: "flurry",
  // Text: "leap forward" - a lunge, so the dash trail is what sells it.
  flying_kick: "dash",
  focused_breath: "heal",
  dragon_combo: "flurry",
  dragon_ascension: "buff",
  // Gunslinger
  quick_draw: "gun",
  ricochet_shot: "chain",
  evasive_roll: "dash",
  bullet_storm: "gunVolley",
  deadeye: "mark",
  // Berserker
  rage: "buff",
  blood_cleave: "cleave",
  ground_slam: "quake",
  frenzy: "buff",
  // Text: "trade defense for overwhelming attack" - it is a self-buff, not a swing.
  unrelenting_fury: "buff",
  // Summoner
  summon_wolf: "summon",
  arcane_familiar: "summon",
  spirit_link: "heal",
  command_minions: "buff",
  primal_convergence: "summon",
  // Ranger
  trap_snare: "trap",
  // Text: "sharpen your senses, increasing attack" - a self-buff, not a mark on the ground.
  eagle_eye: "buff",
  twin_arrow: "arrowVolley",
  camouflage: "smoke",
  hunters_mark: "mark",
  // Spellblade
  flame_slash: "slash",
  frost_blade: "slash",
  arcane_dash: "dash",
  elemental_burst: "nova",
  elemental_convergence: "buff",
  // Dragon Knight
  dragon_breath: "cone",
  scaled_armor: "shield",
  dragon_leap: "quake",
  infernal_strike: "smash",
  dragons_wrath: "nova",
  // Warden, oracle and the rest
  warden_cleave: "cleave",
  bulwark_pulse: "shield",
  // Text: "drive your weapon into the ground" - the floor breaks.
  anchor_step: "quake",
  // Text: "a rallying roar" - a shout of rings, not a quiet buff glow.
  guardian_roar: "roar",
  last_stand: "shield",
  // Text: "launch a focused bolt" - a bolt, not a full laser beam.
  oracle_bolt: "bolt",
  oracle_solace: "heal",
  // Text: "mark a point with a radiant glyph" - drawn where it lands.
  oracle_glyph: "rune",
  oracle_ray: "beam",
  // Text: "a circle of light that heals you and punishes nearby enemies".
  oracle_prophecy: "nova",
  battlemage_arcane_cut: "slash",
  battlemage_ember_burst: "nova",
  // Text: "shape mana into a shield" / "blink forward" / "a storm of arcane power".
  battlemage_mana_guard: "shield",
  battlemage_blink_strike: "dash",
  battlemage_spellstorm: "nova",
  shadowdancer_fan: "arrowVolley",
  shadowdancer_step: "dash",
  shadowdancer_smoke: "smoke",
  shadowdancer_flurry: "flurry",
  shadowdancer_execution: "cleave",
  artificer_rivet: "gun",
  artificer_spring_trap: "trap",
  // Text: "deploy a quick shield from spare plating".
  artificer_scrap_shield: "shield",
  // Text: "toss an explosive charge that detonates" - thrown and exploded, not a falling rock.
  artificer_blast_charge: "explosion",
  artificer_overclock: "buff",
  beastmaster_barbed_arrow: "arrow",
  beastmaster_call_wolf: "summon",
  // Text: "rally yourself and your companion with a powerful howl".
  beastmaster_pack_howl: "roar",
  beastmaster_net: "trap",
  beastmaster_stampede: "summon",
  duelist_lunge: "thrust",
  // Text: "raise your guard" - a deflecting shell, not a buff glow.
  duelist_parry: "shield",
  duelist_feint: "dash",
  duelist_riposte: "flurry",
  duelist_finale: "flurry",
  elementalist_fire: "spear",
  elementalist_ice: "iceShard",
  // Text: "raise a ring of stone" - rock rising in a circle, not plant roots.
  elementalist_stone: "stoneRing",
  // Text: "send a surge of water" - a wave washing outward.
  elementalist_tide: "tide",
  elementalist_primal: "nova",
  sentinel_halberd: "cleave",
  sentinel_aegis: "shield",
  sentinel_rally: "heal",
  sentinel_charge: "dash",
  sentinel_oath: "shield",
  stormcaller_bolt: "chain",
  stormcaller_gust: "dash",
  stormcaller_static: "nova",
  stormcaller_tempest: "spear",
  stormcaller_eye: "nova",
};

/**
 * Every class leans on two of its own colours. Damaging skills keep their damage
 * hue but slide toward the class colour, and the rings and shards always take the
 * class's second colour - so a kit reads as one family without losing fire vs ice.
 */
export const CLASS_PALETTE: Record<ClassId, { primary: string; secondary: string }> = {
  warrior: { primary: "#d8b06a", secondary: "#fff0c4" },
  mage: { primary: "#c98bff", secondary: "#7fd4ff" },
  archer: { primary: "#9fe083", secondary: "#ffe6a8" },
  assassin: { primary: "#8c6bd8", secondary: "#e6dcff" },
  paladin: { primary: "#ffe27a", secondary: "#fff8d0" },
  priest: { primary: "#ffe7a8", secondary: "#ffd9f0" },
  necromancer: { primary: "#b06bff", secondary: "#8fe8b0" },
  druid: { primary: "#6ff09a", secondary: "#d4ffb0" },
  monk: { primary: "#ffd08a", secondary: "#fff1cf" },
  gunslinger: { primary: "#f0c46b", secondary: "#ff9a4a" },
  berserker: { primary: "#ff6b4a", secondary: "#ffd08a" },
  summoner: { primary: "#9fe8d8", secondary: "#d8fff5" },
  ranger: { primary: "#e8c88a", secondary: "#a6f2a0" },
  spellblade: { primary: "#a6f2ff", secondary: "#ffb37a" },
  dragonknight: { primary: "#ff7a4a", secondary: "#ffd06b" },
  warden: { primary: "#b9d1a6", secondary: "#8cf0c0" },
  oracle: { primary: "#ffe08a", secondary: "#fff6cc" },
  battlemage: { primary: "#e0a8ff", secondary: "#ffd08a" },
  shadowdancer: { primary: "#a06bff", secondary: "#7ff0ff" },
  artificer: { primary: "#f0c46b", secondary: "#8ce0ff" },
  beastmaster: { primary: "#d0b779", secondary: "#a6e07a" },
  duelist: { primary: "#a8f0e0", secondary: "#ffe9a8" },
  elementalist: { primary: "#a6eef0", secondary: "#ff9a4a" },
  sentinel: { primary: "#d1e4d7", secondary: "#ffe08a" },
  stormcaller: { primary: "#8cd4ff", secondary: "#f1df7a" },
};

/** How far a skill's own damage colour slides toward the class colour. */
const CLASS_TINT_WEIGHT = 0.38;

function channels(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((part) => part + part).join("") : clean;
  const value = Number.parseInt(full, 16);
  if (!Number.isFinite(value)) return [255, 255, 255];
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

/** Blend two hex colours: 0 keeps the first, 1 takes the second. */
export function mixHex(from: string, to: string, amount: number): string {
  const a = channels(from);
  const b = channels(to);
  const t = Math.max(0, Math.min(1, amount));
  const part = (index: number): string => {
    const value = Math.round(a[index] + (b[index] - a[index]) * t);
    return Math.max(0, Math.min(255, value)).toString(16).padStart(2, "0");
  };
  return `#${part(0)}${part(1)}${part(2)}`;
}

/** The two colours a class wears on its skills. */
export function classPalette(classId: ClassId, fallback = "#e8c07d"): { primary: string; secondary: string } {
  return CLASS_PALETTE[classId] ?? { primary: fallback, secondary: fallback };
}

/** The class's main colour, for rims and glows outside the world. */
export function classTint(classId: ClassId, fallback = "#e8c07d"): string {
  return classPalette(classId, fallback).primary;
}

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
  fireball: 520,
  iceShard: 420,
  arcaneBlast: 480,
  drain: 620,
  roots: 620,
  quake: 560,
  smash: 380,
  smite: 620,
  venom: 420,
  spin: 420,
  spear: 340,
  explosion: 520,
  roar: 620,
  stoneRing: 600,
  tide: 560,
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

/** The element a skill is built on, for sounds and trails: fire, ice, steel and so on. */
export function primaryDamageType(ability: AbilityDef): DamageType {
  return ability.effects.find((effect) => effect.damageType)?.damageType ?? "physical";
}

export function resolveAbilityVfx(classId: ClassId, ability: AbilityDef, classAccent: string): VfxDescriptor {
  const style = ability.basic ? BASIC_STYLE[classId] ?? "slash" : ABILITY_STYLE[ability.id] ?? fallbackStyle(ability);
  const damageType = primaryDamageType(ability);
  const hasDamage = ability.effects.some((effect) => effect.kind === "damage");
  const palette = classPalette(classId, classAccent);
  // A hit keeps its damage hue (fire still burns orange, ice still reads cold) but
  // slides toward the class colour, so two classes casting fire look different.
  const color = hasDamage
    ? mixHex(DAMAGE_COLORS[damageType], palette.primary, CLASS_TINT_WEIGHT)
    : style === "heal"
      ? mixHex("#8ef0a0", palette.primary, 0.25)
      : palette.primary;
  const radius = ability.effects.find((effect) => effect.radius)?.radius ?? (ability.targeting === "self" ? 72 : 26);
  const heavy = style === "meteor" || style === "nova" || style === "rain" || style === "summon" || style === "quake" || style === "smite" || style === "roots" || style === "drain";
  // Ultimates (signature skills) get a bigger, longer effect and a stronger shake.
  const signature = ability.signature === true;
  // Spirit Storm is made more dramatic: a wider, longer burst with a bigger shake.
  const dramatic = ability.id === "spirit_storm";
  // The player's effect intensity setting scales how big and how strong the effect looks.
  const intensity = loadPreferences().effectIntensity;
  return {
    style,
    color,
    accent: palette.secondary,
    radius: Math.round((signature ? radius * 1.3 : dramatic ? radius * 1.5 : radius) * intensity),
    duration: signature ? Math.round(STYLE_DURATION[style] * 1.25) : dramatic ? Math.round(STYLE_DURATION[style] * 1.4) : STYLE_DURATION[style],
    shake: (signature ? 0.004 : dramatic ? 0.004 : heavy ? 0.0025 : 0) * intensity,
  };
}

export function projectileStyle(abilityId: string, classId: ClassId): VfxStyle {
  if (abilityId === "basic") return BASIC_STYLE[classId] ?? "bolt";
  return ABILITY_STYLE[abilityId] ?? "bolt";
}

export function damageColor(damageType: DamageType): string {
  return DAMAGE_COLORS[damageType];
}

/**
 * The family of sound a skill belongs to. Before this, a 40-second ultimate and a
 * 5-second poke played the same two notes, because only the damage element reached
 * the ear. The shape of the skill decides which family it speaks in.
 */
export type SkillVoice = "strike" | "shot" | "burst" | "ward" | "summon" | "wisp";

const STYLE_VOICE: Record<VfxStyle, SkillVoice> = {
  slash: "strike",
  cleave: "strike",
  thrust: "strike",
  bash: "strike",
  flurry: "strike",
  fist: "strike",
  smash: "strike",
  spin: "strike",
  arrow: "shot",
  arrowVolley: "shot",
  gun: "shot",
  gunVolley: "shot",
  bolt: "shot",
  beam: "shot",
  fireball: "shot",
  iceShard: "shot",
  arcaneBlast: "shot",
  spear: "shot",
  venom: "shot",
  nova: "burst",
  explosion: "burst",
  quake: "burst",
  meteor: "burst",
  rain: "burst",
  cone: "burst",
  chain: "burst",
  tide: "burst",
  stoneRing: "burst",
  drain: "burst",
  smite: "burst",
  roots: "burst",
  shield: "ward",
  heal: "ward",
  buff: "ward",
  roar: "ward",
  rune: "ward",
  mark: "ward",
  trap: "summon",
  summon: "summon",
  dash: "wisp",
  smoke: "wisp",
};

/** Which voice a skill speaks in, from the shape it is drawn with. */
export function abilityVoice(ability: AbilityDef, style: VfxStyle): SkillVoice {
  // Basics follow their own drawing too, so a bow's shot stays a shot and a sword stays a hit.
  void ability;
  return STYLE_VOICE[style] ?? "strike";
}
