import type { AbilityDef, AbilityEffect, ClassDef, ClassId, DamageType } from "../types";

function basicMelee(damageType: DamageType, icon = "sword"): AbilityDef {
  return {
    id: "basic",
    name: "Basic Attack",
    description: "A quick strike with your equipped weapon.",
    icon,
    cost: 0,
    cooldown: 0.7,
    range: 46,
    unlockLevel: 1,
    targeting: "melee",
    basic: true,
    effects: [{ kind: "damage", amount: 4, scaling: 0.85, damageType }],
  };
}

function basicRanged(icon: string, damageType: DamageType, _color = "#d9e6ff"): AbilityDef {
  return {
    id: "basic",
    name: "Basic Attack",
    description: "Fire a quick shot toward your cursor.",
    icon,
    cost: 0,
    cooldown: 0.8,
    range: 330,
    unlockLevel: 1,
    targeting: "direction",
    basic: true,
    effects: [{ kind: "damage", amount: 4, scaling: 0.75, damageType, projectile: { speed: 440, radius: 6 } }],
  };
}

function skill(
  id: string,
  name: string,
  icon: string,
  description: string,
  cost: number,
  cooldown: number,
  range: number,
  unlockLevel: number,
  targeting: AbilityDef["targeting"],
  effects: AbilityEffect[],
  signature = false,
): AbilityDef {
  return { id, name, icon, description, cost, cooldown, range, unlockLevel, targeting, effects, signature };
}

const dmg = (amount: number, scaling: number, damageType: DamageType, radius?: number): AbilityEffect => ({
  kind: "damage",
  amount,
  scaling,
  damageType,
  radius,
});

const proj = (amount: number, scaling: number, damageType: DamageType, speed = 380, radius = 6): AbilityEffect => ({
  kind: "damage",
  amount,
  scaling,
  damageType,
  projectile: { speed, radius },
});

const classes: ClassDef[] = [
  {
    id: "warrior",
    name: "Warrior",
    role: "Frontline fighter and tank",
    weapon: "Sword and shield",
    difficulty: "Easy",
    description: "A seasoned fighter who holds the line. Tough, direct, and forgiving for new adventurers.",
    resource: "rage",
    color: "#c0392b",
    accent: "#e8c07d",
    sprite: "warrior",
    base: { maxHp: 180, maxResource: 100, attack: 12, defense: 8, crit: 0.05, moveSpeed: 92 },
    growth: { maxHp: 24, maxResource: 2, attack: 2.2, defense: 1.4 },
    basic: basicMelee("physical"),
    abilities: [
      skill("shield_bash", "Shield Bash", "shield", "Slam your shield into a nearby foe, stunning it briefly.", 12, 6, 62, 1, "melee", [
        dmg(14, 0.9, "physical"),
        { kind: "stun", duration: 0.6 },
        { kind: "knockback" },
      ]),
      skill("whirlwind", "Whirlwind", "whirlwind", "Spin with your weapon, striking every enemy around you.", 20, 9, 0, 3, "self", [
        dmg(18, 1.1, "physical", 74),
      ]),
      skill("iron_defense", "Iron Defense", "shield", "Brace yourself, reducing incoming damage for 5 seconds.", 15, 14, 0, 5, "self", [
        { kind: "buff", stat: "defense", percent: 40, duration: 5, name: "Iron Defense" },
      ]),
      skill("berserker_strike", "Berserker Strike", "axe", "A brutal overhead blow with tremendous force.", 25, 10, 62, 7, "melee", [
        dmg(30, 1.6, "physical"),
      ]),
      skill("fortified_stance", "Fortified Stance", "shield", "Signature: raise an unbreakable guard, gaining a shield and heavy damage reduction.", 30, 28, 0, 9, "self", [
        { kind: "shield", amount: 80 },
        { kind: "buff", stat: "defense", percent: 30, duration: 8, name: "Fortified Stance" },
      ], true),
    ],
  },
  {
    id: "mage",
    name: "Mage",
    role: "Ranged elemental damage",
    weapon: "Magic staff",
    difficulty: "Medium",
    description: "A scholar of destructive magic. Fragile, but capable of melting entire packs from afar.",
    resource: "mana",
    color: "#4a7dff",
    accent: "#b7d4ff",
    sprite: "mage",
    base: { maxHp: 100, maxResource: 140, attack: 16, defense: 3, crit: 0.06, moveSpeed: 90 },
    growth: { maxHp: 12, maxResource: 8, attack: 3.0, defense: 0.7 },
    basic: basicRanged("fire", "arcane", "#8fb4ff"),
    abilities: [
      skill("fireball", "Fireball", "fire", "Hurl a roaring ball of flame that burns its target.", 15, 5, 340, 1, "direction", [
        { ...proj(20, 1.2, "fire", 390, 8), duration: 3 },
        { kind: "dot", amount: 6, duration: 3 },
      ]),
      skill("ice_shard", "Ice Shard", "ice", "Pierce a foe with ice, slowing its movement.", 12, 6, 320, 3, "direction", [
        proj(16, 1.0, "ice", 430, 6),
        { kind: "slow", percent: 40, duration: 2.5 },
      ]),
      skill("arcane_blast", "Arcane Blast", "arcane", "Detonate raw arcane energy at a chosen point.", 22, 9, 280, 5, "point", [
        dmg(26, 1.4, "arcane", 72),
      ]),
      skill("meteor", "Meteor", "meteor", "Call down a burning meteor. Devastating over a wide area.", 35, 18, 360, 7, "point", [
        dmg(45, 2.0, "fire", 100),
        { kind: "dot", amount: 8, duration: 4 },
      ]),
      skill("arcane_overload", "Arcane Overload", "arcane", "Signature: flood your body with power, greatly increasing attack for 8 seconds.", 40, 30, 0, 9, "self", [
        { kind: "buff", stat: "attack", percent: 50, duration: 8, name: "Arcane Overload" },
      ], true),
    ],
  },
  {
    id: "archer",
    name: "Archer",
    role: "Precision ranged physical damage",
    weapon: "Bow",
    difficulty: "Easy",
    description: "A calm eye and a steady hand. Rewards positioning and careful use of cooldowns.",
    resource: "energy",
    color: "#3fa34d",
    accent: "#c9e8a5",
    sprite: "archer",
    base: { maxHp: 120, maxResource: 100, attack: 14, defense: 4, crit: 0.12, moveSpeed: 96 },
    growth: { maxHp: 16, maxResource: 3, attack: 2.6, defense: 0.9 },
    basic: basicRanged("arrow", "physical"),
    abilities: [
      skill("multi_shot", "Multi-Shot", "multiarrow", "Loose three arrows in a tight spread.", 12, 5, 300, 1, "direction", [
        proj(10, 0.6, "physical", 470, 5),
        proj(10, 0.6, "physical", 470, 5),
        proj(10, 0.6, "physical", 470, 5),
      ]),
      skill("piercing_arrow", "Piercing Arrow", "arrow", "A heavy arrow that punches through armor.", 15, 7, 380, 3, "direction", [
        { ...proj(24, 1.2, "physical", 520, 7), armorPiercing: true },
      ]),
      skill("poison_arrow", "Poison Arrow", "poison", "A venom-coated arrow that applies a lingering poison.", 14, 8, 340, 5, "direction", [
        proj(12, 0.7, "poison", 470, 6),
        { kind: "dot", amount: 8, duration: 5 },
      ]),
      skill("rain_of_arrows", "Rain of Arrows", "rain", "Blanket an area with arrows, slowing those caught inside.", 30, 16, 340, 7, "point", [
        dmg(30, 1.3, "physical", 95),
        { kind: "slow", percent: 25, duration: 2 },
      ]),
      skill("eagles_volley", "Eagle's Volley", "rain", "Signature: unleash a storm of arrows over a wide area.", 35, 26, 420, 9, "point", [
        dmg(40, 1.6, "physical", 120),
        proj(14, 0.7, "physical", 520, 6),
        proj(14, 0.7, "physical", 520, 6),
      ], true),
    ],
  },
  {
    id: "assassin",
    name: "Assassin",
    role: "Critical hits, mobility, and burst",
    weapon: "Dual daggers",
    difficulty: "Hard",
    description: "Strike from nowhere and vanish before the answer comes. High risk, high reward.",
    resource: "energy",
    color: "#6c5ce7",
    accent: "#bfa8ff",
    sprite: "assassin",
    base: { maxHp: 110, maxResource: 100, attack: 16, defense: 3, crit: 0.2, moveSpeed: 108 },
    growth: { maxHp: 14, maxResource: 3, attack: 2.9, defense: 0.7 },
    basic: basicMelee("physical", "dagger"),
    abilities: [
      skill("shadow_strike", "Shadow Strike", "shadow", "Slip through the shadows and strike from an angle.", 15, 6, 65, 1, "melee", [
        { kind: "dash", amount: 60 },
        dmg(22, 1.2, "shadow"),
      ]),
      skill("backstab", "Backstab", "dagger", "A vicious blow to a vulnerable spot.", 18, 8, 55, 3, "melee", [
        dmg(34, 1.8, "physical"),
      ]),
      skill("smoke_bomb", "Smoke Bomb", "smoke", "Disappear in a cloud of smoke, gaining speed and a small shield.", 20, 14, 0, 5, "self", [
        { kind: "buff", stat: "moveSpeed", percent: 40, duration: 4, name: "Smoke Bomb" },
        { kind: "shield", amount: 40 },
      ]),
      skill("blade_flurry", "Blade Flurry", "flurry", "Unleash a whirl of three rapid cuts.", 24, 12, 0, 7, "self", [
        dmg(16, 0.8, "physical", 64),
        dmg(16, 0.8, "physical", 64),
        dmg(16, 0.8, "physical", 64),
      ]),
      skill("shadow_execution", "Shadow Execution", "shadow", "Signature: a devastating strike that demands close range.", 35, 30, 70, 9, "melee", [
        dmg(70, 3.0, "shadow"),
      ], true),
    ],
  },
  {
    id: "paladin",
    name: "Paladin",
    role: "Defensive fighter and holy support",
    weapon: "Holy sword and shield",
    difficulty: "Easy",
    description: "A bulwark of light. Soaks damage, mends wounds, and punishes the wicked.",
    resource: "mana",
    color: "#f1c40f",
    accent: "#fff2b0",
    sprite: "paladin",
    base: { maxHp: 190, maxResource: 100, attack: 11, defense: 10, crit: 0.05, moveSpeed: 88 },
    growth: { maxHp: 25, maxResource: 4, attack: 2.0, defense: 1.6 },
    basic: basicMelee("holy", "mace"),
    abilities: [
      skill("holy_strike", "Holy Strike", "holy", "Smite a foe with radiant steel and recover a little health.", 12, 5, 60, 1, "melee", [
        dmg(18, 1.0, "holy"),
        { kind: "heal", amount: 6, scaling: 0.1 },
      ]),
      skill("divine_shield", "Divine Shield", "shield", "A shimmering barrier absorbs damage and hardens your armor.", 20, 16, 0, 3, "self", [
        { kind: "shield", amount: 100 },
        { kind: "buff", stat: "defense", percent: 25, duration: 6, name: "Divine Shield" },
      ]),
      skill("healing_light", "Healing Light", "heal", "Bathe yourself in warm light, restoring health.", 22, 9, 0, 5, "self", [
        { kind: "heal", amount: 45, scaling: 1.0 },
      ]),
      skill("judgment", "Judgment", "judgment", "Call down judgment on everything nearby.", 28, 14, 0, 7, "self", [
        dmg(35, 1.5, "holy", 76),
      ]),
      skill("divine_aegis", "Divine Aegis", "holy", "Signature: become a beacon of protection, gaining a large shield and damage reduction.", 35, 30, 0, 9, "self", [
        { kind: "shield", amount: 160 },
        { kind: "buff", stat: "defense", percent: 40, duration: 8, name: "Divine Aegis" },
      ], true),
    ],
  },
  {
    id: "priest",
    name: "Priest",
    role: "Healing and team support",
    weapon: "Holy staff",
    difficulty: "Medium",
    description: "A devoted healer with enough holy fire to defend the faithful.",
    resource: "mana",
    color: "#f7f1e3",
    accent: "#ffe9a8",
    sprite: "priest",
    base: { maxHp: 110, maxResource: 160, attack: 10, defense: 4, crit: 0.05, moveSpeed: 90 },
    growth: { maxHp: 13, maxResource: 9, attack: 1.8, defense: 0.9 },
    basic: basicRanged("holy", "holy", "#fff1b8"),
    abilities: [
      skill("heal", "Heal", "heal", "Restore a large amount of health.", 18, 5, 0, 1, "self", [
        { kind: "heal", amount: 50, scaling: 1.2 },
      ]),
      skill("blessing", "Blessing", "holy", "A blessing of strength and protection.", 20, 14, 0, 3, "self", [
        { kind: "buff", stat: "attack", percent: 25, duration: 8, name: "Blessing" },
        { kind: "buff", stat: "defense", percent: 15, duration: 8, name: "Blessing" },
      ]),
      skill("purification", "Purification", "heal", "Cleanse your body with holy energy and gain a ward.", 22, 12, 0, 5, "self", [
        { kind: "heal", amount: 30, scaling: 0.6 },
        { kind: "shield", amount: 60 },
      ]),
      skill("holy_nova", "Holy Nova", "nova", "A burst of light damages enemies and mends you.", 26, 10, 0, 7, "self", [
        dmg(20, 1.1, "holy", 90),
        { kind: "heal", amount: 20, scaling: 0.5 },
      ]),
      skill("sanctuary", "Sanctuary", "holy", "Signature: consecrate the ground, restoring a great deal of health and raising your defense.", 40, 35, 0, 9, "self", [
        { kind: "heal", amount: 120, scaling: 1.5 },
        { kind: "buff", stat: "defense", percent: 20, duration: 10, name: "Sanctuary" },
      ], true),
    ],
  },
  {
    id: "necromancer",
    name: "Necromancer",
    role: "Dark magic, curses, and undead",
    weapon: "Bone staff",
    difficulty: "Hard",
    description: "Commands the restless dead. Wins through attrition, curses, and disposable allies.",
    resource: "mana",
    color: "#7d3c98",
    accent: "#c9a0dc",
    sprite: "necromancer",
    base: { maxHp: 115, maxResource: 150, attack: 14, defense: 3, crit: 0.06, moveSpeed: 90 },
    growth: { maxHp: 14, maxResource: 8, attack: 2.6, defense: 0.8 },
    basic: basicRanged("shadow", "shadow", "#b98cff"),
    abilities: [
      skill("soul_drain", "Soul Drain", "skull", "Tear at a distant soul and steal a little vitality.", 15, 6, 280, 1, "direction", [
        proj(18, 1.1, "shadow", 380, 7),
        { kind: "heal", amount: 8, scaling: 0.2 },
      ]),
      skill("bone_spear", "Bone Spear", "bone", "Hurl a jagged spear of bone.", 14, 5, 340, 3, "direction", [
        proj(26, 1.3, "physical", 470, 6),
      ]),
      skill("raise_skeleton", "Raise Skeleton", "summon", "Summon a skeleton to fight beside you for 20 seconds.", 25, 18, 0, 5, "self", [
        { kind: "summon", summonId: "skeleton_minion", summonCount: 1, summonDuration: 20 },
      ]),
      skill("curse", "Curse", "curse", "Curse an area with shadow and rot.", 18, 12, 300, 7, "point", [
        { kind: "dot", amount: 10, duration: 6, damageType: "shadow", radius: 70 },
        { kind: "slow", percent: 20, duration: 4, radius: 70 },
      ]),
      skill("army_of_the_fallen", "Army of the Fallen", "skull", "Signature: call three skeletons from the grave.", 45, 40, 0, 9, "self", [
        { kind: "summon", summonId: "skeleton_minion", summonCount: 3, summonDuration: 25 },
      ], true),
    ],
  },
  {
    id: "druid",
    name: "Druid",
    role: "Nature magic, healing, and transformation",
    weapon: "Nature staff",
    difficulty: "Medium",
    description: "Balances growth and wrath. Sustains themselves while shredding foes with thorns.",
    resource: "mana",
    color: "#27ae60",
    accent: "#a8e6a1",
    sprite: "druid",
    base: { maxHp: 135, maxResource: 130, attack: 12, defense: 5, crit: 0.06, moveSpeed: 94 },
    growth: { maxHp: 18, maxResource: 7, attack: 2.3, defense: 1.1 },
    basic: basicRanged("leaf", "nature", "#a8e6a1"),
    abilities: [
      skill("thorn_burst", "Thorn Burst", "leaf", "Erupt thorns around you, tearing at nearby enemies.", 12, 5, 0, 1, "self", [
        dmg(16, 0.9, "nature", 58),
      ]),
      skill("natures_embrace", "Nature's Embrace", "heal", "Wrap yourself in living energy and recover health.", 20, 10, 0, 3, "self", [
        { kind: "heal", amount: 55, scaling: 1.2 },
      ]),
      skill("entangling_roots", "Entangling Roots", "roots", "Roots burst from the ground, damaging and stunning foes.", 16, 11, 280, 5, "point", [
        dmg(10, 0.6, "nature", 62),
        { kind: "stun", duration: 1.5, radius: 62 },
      ]),
      skill("beast_form", "Beast Form", "beast", "Take on a predatory aspect, gaining attack and speed.", 25, 22, 0, 7, "self", [
        { kind: "buff", stat: "attack", percent: 30, duration: 8, name: "Beast Form" },
        { kind: "buff", stat: "moveSpeed", percent: 20, duration: 8, name: "Beast Form" },
      ]),
      skill("primal_transformation", "Primal Transformation", "beast", "Signature: become one with the wild, greatly empowering body and claw.", 40, 35, 0, 9, "self", [
        { kind: "buff", stat: "attack", percent: 50, duration: 10, name: "Primal Form" },
        { kind: "buff", stat: "defense", percent: 30, duration: 10, name: "Primal Form" },
      ], true),
    ],
  },
  {
    id: "monk",
    name: "Monk",
    role: "Mobile melee fighter",
    weapon: "Fists and wraps",
    difficulty: "Hard",
    description: "A flowing fighter who rewards rhythm and aggression. Fast, precise, relentless.",
    resource: "energy",
    color: "#e67e22",
    accent: "#ffd08a",
    sprite: "monk",
    base: { maxHp: 150, maxResource: 120, attack: 15, defense: 6, crit: 0.1, moveSpeed: 110 },
    growth: { maxHp: 19, maxResource: 5, attack: 2.7, defense: 1.2 },
    basic: basicMelee("physical", "fist"),
    abilities: [
      skill("rapid_strike", "Rapid Strike", "fist", "Two lightning-fast punches.", 10, 3.5, 55, 1, "melee", [
        dmg(10, 0.6, "physical"),
        dmg(10, 0.6, "physical"),
      ]),
      skill("flying_kick", "Flying Kick", "kick", "Leap forward and drive a boot into your target.", 16, 7, 70, 3, "melee", [
        { kind: "dash", amount: 70 },
        dmg(22, 1.1, "physical"),
        { kind: "stun", duration: 0.5 },
      ]),
      skill("focused_breath", "Focused Breath", "heal", "Center yourself, recovering health and speed.", 18, 12, 0, 5, "self", [
        { kind: "heal", amount: 35, scaling: 0.9 },
        { kind: "buff", stat: "moveSpeed", percent: 25, duration: 5, name: "Focused Breath" },
      ]),
      skill("dragon_combo", "Dragon Combo", "combo", "A three-hit combination that sweeps nearby foes.", 24, 10, 0, 7, "self", [
        dmg(14, 0.7, "physical", 62),
        dmg(14, 0.7, "physical", 62),
        dmg(14, 0.7, "physical", 62),
      ]),
      skill("dragon_ascension", "Dragon Ascension", "dragon", "Signature: ascend in a surge of martial power.", 35, 28, 0, 9, "self", [
        { kind: "buff", stat: "attack", percent: 45, duration: 8, name: "Dragon Ascension" },
        { kind: "buff", stat: "moveSpeed", percent: 25, duration: 8, name: "Dragon Ascension" },
      ], true),
    ],
  },
  {
    id: "gunslinger",
    name: "Gunslinger",
    role: "Ranged damage and mobility",
    weapon: "Fantasy hand cannon",
    difficulty: "Medium",
    description: "A wandering marksman with a smoking barrel and a knack for escaping trouble.",
    resource: "energy",
    color: "#95a5a6",
    accent: "#f0d29b",
    sprite: "gunslinger",
    base: { maxHp: 115, maxResource: 100, attack: 15, defense: 3, crit: 0.12, moveSpeed: 100 },
    growth: { maxHp: 15, maxResource: 3, attack: 2.8, defense: 0.8 },
    basic: basicRanged("gun", "physical", "#ffd68a"),
    abilities: [
      skill("quick_draw", "Quick Draw", "gun", "A snap shot with barely a moment's aim.", 10, 4, 320, 1, "direction", [
        proj(16, 0.9, "physical", 620, 5),
      ]),
      skill("ricochet_shot", "Ricochet Shot", "ricochet", "A bullet that ricochets through a cluster of foes.", 15, 6, 300, 3, "point", [
        { ...proj(20, 1.0, "physical", 520, 6), radius: 72, ricochets: 3 },
      ]),
      skill("evasive_roll", "Evasive Roll", "roll", "Roll out of danger and pick up speed.", 12, 8, 0, 5, "direction", [
        { kind: "dash", amount: 100 },
        { kind: "buff", stat: "moveSpeed", percent: 30, duration: 3, name: "Evasive Roll" },
      ]),
      skill("bullet_storm", "Bullet Storm", "bullet", "Empty the chamber in a wide barrage.", 28, 14, 300, 7, "direction", [
        proj(10, 0.5, "physical", 620, 5),
        proj(10, 0.5, "physical", 620, 5),
        proj(10, 0.5, "physical", 620, 5),
        proj(10, 0.5, "physical", 620, 5),
      ]),
      skill("deadeye", "Deadeye", "eye", "Signature: focus completely, greatly increasing attack for 8 seconds.", 30, 30, 0, 9, "self", [
        { kind: "buff", stat: "attack", percent: 40, duration: 8, name: "Deadeye" },
      ], true),
    ],
  },
  {
    id: "berserker",
    name: "Berserker",
    role: "High-risk, high-damage melee",
    weapon: "Heavy axe",
    difficulty: "Hard",
    description: "Abandon defense and embrace the storm. Every fight is a race to kill first.",
    resource: "rage",
    color: "#d35400",
    accent: "#ffb07a",
    sprite: "berserker",
    base: { maxHp: 200, maxResource: 100, attack: 18, defense: 5, crit: 0.12, moveSpeed: 100 },
    growth: { maxHp: 26, maxResource: 2, attack: 3.1, defense: 1.0 },
    basic: basicMelee("physical", "axe"),
    abilities: [
      skill("rage", "Rage", "rage", "Work yourself into a fury, increasing attack.", 10, 10, 0, 1, "self", [
        { kind: "buff", stat: "attack", percent: 25, duration: 6, name: "Rage" },
      ]),
      skill("blood_cleave", "Blood Cleave", "cleave", "A wide axe swing that bites into everything nearby.", 18, 5, 0, 3, "self", [
        dmg(22, 1.1, "physical", 64),
      ]),
      skill("ground_slam", "Ground Slam", "slam", "Shatter the earth, damaging and stunning nearby foes.", 24, 10, 0, 5, "self", [
        dmg(26, 1.2, "physical", 82),
        { kind: "stun", duration: 0.8, radius: 82 },
      ]),
      skill("frenzy", "Frenzy", "frenzy", "Give yourself over to speed and violence.", 30, 20, 0, 7, "self", [
        { kind: "buff", stat: "attack", percent: 35, duration: 6, name: "Frenzy" },
        { kind: "buff", stat: "moveSpeed", percent: 20, duration: 6, name: "Frenzy" },
      ]),
      skill("unrelenting_fury", "Unrelenting Fury", "axe", "Signature: trade defense for overwhelming attack.", 40, 35, 0, 9, "self", [
        { kind: "buff", stat: "attack", percent: 60, duration: 10, name: "Unrelenting Fury" },
        { kind: "buff", stat: "defense", percent: -20, duration: 10, name: "Reckless" },
      ], true),
    ],
  },
  {
    id: "summoner",
    name: "Summoner",
    role: "Companion damage and battlefield control",
    weapon: "Summoning tome",
    difficulty: "Medium",
    description: "Never fights alone. Commands beasts and spirits while supporting from the back line.",
    resource: "mana",
    color: "#16a085",
    accent: "#9fe8d8",
    sprite: "summoner",
    base: { maxHp: 115, maxResource: 150, attack: 12, defense: 3, crit: 0.05, moveSpeed: 92 },
    growth: { maxHp: 14, maxResource: 8, attack: 2.2, defense: 0.8 },
    basic: basicRanged("book", "arcane", "#9fe8d8"),
    abilities: [
      skill("summon_wolf", "Summon Wolf", "summon", "Call a spirit wolf to fight for you for 25 seconds.", 22, 16, 0, 1, "self", [
        { kind: "summon", summonId: "spirit_wolf", summonCount: 1, summonDuration: 25 },
      ]),
      skill("arcane_familiar", "Arcane Familiar", "familiar", "Summon a floating familiar that peppers your enemies.", 18, 14, 0, 3, "self", [
        { kind: "summon", summonId: "familiar", summonCount: 1, summonDuration: 30 },
      ]),
      skill("spirit_link", "Spirit Link", "link", "Share vitality with your companions, healing and shielding yourself.", 20, 15, 0, 5, "self", [
        { kind: "heal", amount: 30, scaling: 0.8 },
        { kind: "buff", stat: "defense", percent: 20, duration: 6, name: "Spirit Link" },
      ]),
      skill("command_minions", "Command Minions", "command", "Drive your companions into a frenzy.", 24, 12, 0, 7, "self", [
        { kind: "buff", stat: "attack", percent: 30, duration: 6, name: "Command" },
        { kind: "summon", summonId: "spirit_wolf", summonCount: 1, summonDuration: 15 },
      ]),
      skill("primal_convergence", "Primal Convergence", "summon", "Signature: call two spirit wolves and empower yourself.", 40, 35, 0, 9, "self", [
        { kind: "summon", summonId: "spirit_wolf", summonCount: 2, summonDuration: 25 },
        { kind: "buff", stat: "attack", percent: 25, duration: 10, name: "Primal Convergence" },
      ], true),
    ],
  },
  {
    id: "ranger",
    name: "Ranger",
    role: "Ranged combat, tracking, and traps",
    weapon: "Longbow and traps",
    difficulty: "Medium",
    description: "A patient hunter who controls the battlefield with traps and marking shots.",
    resource: "energy",
    color: "#8e6e53",
    accent: "#d9c2a3",
    sprite: "ranger",
    base: { maxHp: 125, maxResource: 110, attack: 14, defense: 4, crit: 0.1, moveSpeed: 97 },
    growth: { maxHp: 16, maxResource: 4, attack: 2.6, defense: 1.0 },
    basic: basicRanged("arrow", "physical"),
    abilities: [
      skill("trap_snare", "Trap Snare", "trap", "Place a snare that damages and holds the first enemy to step on it.", 16, 9, 200, 1, "point", [
        { kind: "trap", amount: 20, scaling: 0.8, damageType: "physical", radius: 45, duration: 1.5 },
      ]),
      skill("eagle_eye", "Eagle Eye", "eye", "Sharpen your senses, increasing attack.", 15, 14, 0, 3, "self", [
        { kind: "buff", stat: "attack", percent: 30, duration: 8, name: "Eagle Eye" },
      ]),
      skill("twin_arrow", "Twin Arrow", "multiarrow", "Two arrows fired in quick succession.", 18, 6, 340, 5, "direction", [
        proj(14, 0.8, "physical", 500, 5),
        proj(14, 0.8, "physical", 500, 5),
      ]),
      skill("camouflage", "Camouflage", "camouflage", "Blend into the terrain, gaining speed and defense.", 20, 18, 0, 7, "self", [
        { kind: "buff", stat: "moveSpeed", percent: 20, duration: 5, name: "Camouflage" },
        { kind: "buff", stat: "defense", percent: 25, duration: 5, name: "Camouflage" },
      ]),
      skill("hunters_mark", "Hunter's Mark", "mark", "Signature: mark an area, causing enemies to take increased damage.", 25, 20, 340, 9, "point", [
        { kind: "mark", percent: 25, duration: 8, radius: 75 },
      ], true),
    ],
  },
  {
    id: "spellblade",
    name: "Spellblade",
    role: "Hybrid melee and elemental magic",
    weapon: "Enchanted sword",
    difficulty: "Hard",
    description: "Weaves steel and sorcery into a single deadly dance.",
    resource: "mana",
    color: "#00bcd4",
    accent: "#a6f2ff",
    sprite: "spellblade",
    base: { maxHp: 145, maxResource: 120, attack: 15, defense: 5, crit: 0.08, moveSpeed: 98 },
    growth: { maxHp: 18, maxResource: 6, attack: 2.7, defense: 1.1 },
    basic: basicMelee("arcane", "sword"),
    abilities: [
      skill("flame_slash", "Flame Slash", "flameblade", "A burning cut that leaves the wound smoldering.", 12, 4.5, 60, 1, "melee", [
        dmg(18, 1.0, "fire"),
        { kind: "dot", amount: 5, duration: 3 },
      ]),
      skill("frost_blade", "Frost Blade", "frostblade", "A freezing strike that slows the target.", 14, 6, 60, 3, "melee", [
        dmg(16, 0.9, "ice"),
        { kind: "slow", percent: 35, duration: 2.5 },
      ]),
      skill("arcane_dash", "Arcane Dash", "dash", "Blink forward in a trail of arcane light.", 15, 8, 0, 5, "direction", [
        { kind: "dash", amount: 110 },
        dmg(14, 0.7, "arcane", 50),
      ]),
      skill("elemental_burst", "Elemental Burst", "burst", "Release a storm of fire and ice around you.", 28, 14, 0, 7, "self", [
        dmg(38, 1.5, "fire", 85),
        dmg(25, 1.0, "ice", 85),
      ]),
      skill("elemental_convergence", "Elemental Convergence", "burst", "Signature: fuse steel and elements, greatly increasing attack.", 40, 32, 0, 9, "self", [
        { kind: "buff", stat: "attack", percent: 45, duration: 8, name: "Elemental Convergence" },
        { kind: "buff", stat: "moveSpeed", percent: 10, duration: 8, name: "Elemental Convergence" },
      ], true),
    ],
  },
  {
    id: "dragonknight",
    name: "Dragon Knight",
    role: "Heavy melee with draconic power",
    weapon: "Dragon lance and greatsword",
    difficulty: "Medium",
    description: "Carries the blood of wyrms. Durable, explosive, and terrifying up close.",
    resource: "mana",
    color: "#b71c1c",
    accent: "#ffb37a",
    sprite: "dragonknight",
    base: { maxHp: 210, maxResource: 110, attack: 16, defense: 9, crit: 0.05, moveSpeed: 86 },
    growth: { maxHp: 27, maxResource: 5, attack: 2.8, defense: 1.5 },
    basic: basicMelee("fire", "lance"),
    abilities: [
      skill("dragon_breath", "Dragon Breath", "breath", "Exhale a cone of fire that scorches everything in front of you.", 20, 8, 180, 1, "point", [
        { ...dmg(24, 1.2, "fire", 82), shape: "cone" },
        { kind: "dot", amount: 7, duration: 3 },
      ]),
      skill("scaled_armor", "Scaled Armor", "scale", "Harden your scales, gaining a shield and defense.", 18, 16, 0, 3, "self", [
        { kind: "shield", amount: 60 },
        { kind: "buff", stat: "defense", percent: 45, duration: 6, name: "Scaled Armor" },
      ]),
      skill("dragon_leap", "Dragon Leap", "leap", "Leap into battle, crushing the ground on impact.", 22, 12, 0, 5, "direction", [
        { kind: "dash", amount: 120 },
        dmg(20, 1.0, "fire", 70),
      ]),
      skill("infernal_strike", "Infernal Strike", "infernal", "Bring your blade down in a pillar of fire.", 26, 10, 70, 7, "melee", [
        dmg(36, 1.8, "fire"),
      ]),
      skill("dragons_wrath", "Dragon's Wrath", "dragon", "Signature: unleash the full fury of your draconic blood.", 45, 40, 0, 9, "self", [
        dmg(60, 2.5, "fire", 110),
        { kind: "dot", amount: 12, duration: 4, radius: 110 },
      ], true),
    ],
  },
];

export const CLASSES: Record<ClassId, ClassDef> = Object.fromEntries(
  classes.map((c) => [c.id, c]),
) as Record<ClassId, ClassDef>;

export const CLASS_LIST: ClassDef[] = classes;

export const FLAGSHIP_CLASSES: ClassId[] = ["warrior", "mage", "archer"];

export function getClass(id: ClassId): ClassDef {
  const def = CLASSES[id];
  if (!def) throw new Error(`Unknown class: ${id}`);
  return def;
}

export const ALL_ABILITIES: AbilityDef[] = classes.flatMap((c) => [...c.abilities, c.basic]);
