export type Vec2 = { x: number; y: number };

export type Direction = "down" | "left" | "right" | "up";

export type ZoneId = "village" | "forest" | "dungeon" | "marsh" | "frost" | "throne";

export type GameDifficulty = "story" | "normal" | "nightmare";

export type EliteAffix = "swift" | "armored" | "venomous" | "volatile";

export type ClassId =
  | "warrior"
  | "mage"
  | "archer"
  | "assassin"
  | "paladin"
  | "priest"
  | "necromancer"
  | "druid"
  | "monk"
  | "gunslinger"
  | "berserker"
  | "summoner"
  | "ranger"
  | "spellblade"
  | "dragonknight"
  | "warden"
  | "oracle"
  | "battlemage"
  | "shadowdancer"
  | "artificer"
  | "beastmaster"
  | "duelist"
  | "elementalist"
  | "sentinel"
  | "stormcaller";

export type ResourceKind = "mana" | "energy" | "rage";

export type DamageType =
  | "physical"
  | "fire"
  | "ice"
  | "arcane"
  | "holy"
  | "shadow"
  | "nature"
  | "poison";

export type Difficulty = "Easy" | "Medium" | "Hard";

export type EquipSlot = "weapon" | "armor" | "helm" | "boots" | "trinket";

export type ItemType = EquipSlot | "consumable" | "material";

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type AffixId = "fierce" | "keen" | "sturdy" | "vital" | "swift" | "arcane" | "warded" | "brutal";

export type GearSetId = "wanderer" | "ironclad" | "ember";

export interface ItemInstance {
  uid: string;
  affixes: AffixId[];
  upgrade: number;
}

export interface BaseStats {
  maxHp: number;
  maxResource: number;
  attack: number;
  defense: number;
  crit: number;
  moveSpeed: number;
}

export interface ClassGrowth {
  maxHp: number;
  maxResource: number;
  attack: number;
  defense: number;
}

export type StatBonus = Partial<{
  attack: number;
  defense: number;
  maxHp: number;
  maxResource: number;
  crit: number;
  moveSpeed: number;
}>;

export type AbilityTargeting = "melee" | "direction" | "point" | "self";

export type EffectKind =
  | "damage"
  | "heal"
  | "buff"
  | "dot"
  | "slow"
  | "stun"
  | "dash"
  | "summon"
  | "trap"
  | "shield"
  | "mark"
  | "knockback";

export interface AbilityEffect {
  kind: EffectKind;
  amount?: number;
  scaling?: number;
  damageType?: DamageType;
  radius?: number;
  shape?: "cone";
  duration?: number;
  percent?: number;
  armorPiercing?: boolean;
  ricochets?: number;
  stat?: "attack" | "defense" | "moveSpeed" | "maxHp";
  name?: string;
  projectile?: { speed: number; radius: number };
  summonId?: string;
  summonCount?: number;
  summonDuration?: number;
}

export interface AbilityDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  cost: number;
  cooldown: number;
  range: number;
  unlockLevel: number;
  targeting: AbilityTargeting;
  effects: AbilityEffect[];
  signature?: boolean;
  basic?: boolean;
}

export interface ClassDef {
  id: ClassId;
  name: string;
  role: string;
  weapon: string;
  difficulty: Difficulty;
  description: string;
  resource: ResourceKind;
  sprite: string;
  color: string;
  accent: string;
  base: BaseStats;
  growth: ClassGrowth;
  basic: AbilityDef;
  abilities: AbilityDef[];
}

export interface ItemDef {
  id: string;
  name: string;
  type: ItemType;
  rarity: Rarity;
  icon: string;
  description: string;
  stack: number;
  buy?: number;
  sell: number;
  stats?: StatBonus;
  classes?: ClassId[];
  heal?: number;
  restore?: number;
  set?: GearSetId;
  requiresLevel?: number;
}

export interface ItemStack {
  itemId: string;
  qty: number;
  instance?: ItemInstance;
}

export type Equipment = Partial<Record<EquipSlot, ItemStack>>;

export interface QuestRewards {
  xp: number;
  gold: number;
  items?: ItemStack[];
}

export type QuestObjective =
  | { kind: "kill"; monsterId: string; count: number }
  | { kind: "collect"; itemId: string; count: number }
  | { kind: "visit"; zone: ZoneId }
  | { kind: "boss"; monsterId: string }
  | { kind: "explore"; zones: ZoneId[] }
  | { kind: "survive"; zone: ZoneId; count: number };

export interface QuestDef {
  id: string;
  name: string;
  giverNpc: string;
  description: string;
  objectives: QuestObjective[];
  rewards: QuestRewards;
  choose?: (QuestRewards & { icon?: string })[];
  requiresLevel?: number;
  requires?: string[];
  repeatable?: boolean;
}

export interface QuestState {
  id: string;
  progress: number[];
  completed: boolean;
  completions: number;
  exploredZones?: ZoneId[];
  /** Index of the reward picked from a choice quest; set once and never changed. */
  claimedReward?: number;
}

export interface LootEntry {
  itemId: string;
  chance: number;
  min: number;
  max: number;
}

export interface MonsterDef {
  id: string;
  name: string;
  level: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  aggroRadius: number;
  leashRadius: number;
  attackRange: number;
  attackCooldown: number;
  xp: number;
  goldMin: number;
  goldMax: number;
  loot: LootEntry[];
  respawn: number;
  radius: number;
  sprite: string;
  boss?: boolean;
  role?: "ranged" | "support";
}

export interface StatusInstance {
  kind: "poison" | "burn" | "slow" | "stun" | "mark";
  remaining: number;
  value: number;
}

export interface MonsterInstance {
  uid: string;
  defId: string;
  x: number;
  y: number;
  spawnX: number;
  spawnY: number;
  hp: number;
  maxHp?: number;
  state: "idle" | "chase" | "attack" | "return" | "dead";
  facing: number;
  attackTimer: number;
  respawnTimer: number;
  statuses: StatusInstance[];
  wanderTimer: number;
  wanderX: number;
  wanderY: number;
  elite?: EliteAffix;
  phase?: number;
}

export interface ProjectileInstance {
  uid: string;
  abilityId: string;
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  speed: number;
  ttl: number;
  radius: number;
  damage: number;
  crit: number;
  damageType: DamageType;
  color: string;
  statuses: StatusInstance[];
  owner: "player" | "pet";
  hit?: boolean;
  missLogged?: boolean;
  abilityName?: string;
  healingOnHit?: number;
  armorPiercing?: boolean;
  ricochetsRemaining?: number;
  hitTargets?: string[];
}

export interface GroundLoot {
  uid: string;
  itemId: string;
  qty: number;
  x: number;
  y: number;
  ttl: number;
  instance?: ItemInstance;
}

export interface TelegraphInstance {
  uid: string;
  x: number;
  y: number;
  radius: number;
  remaining: number;
  total: number;
  damage: number;
  kind: "boss" | "enemy" | "trap";
  shape?: "ring" | "line" | "cone" | "spot";
  angle?: number;
  /** Name of the boss that cast this telegraph, so the damage message names the right boss. */
  source?: string;
  sourceUid?: string;
  statusEffect?: StatusInstance;
  damageType?: DamageType;
}

export interface PetInstance {
  uid: string;
  kind: "skeleton" | "wolf" | "familiar";
  x: number;
  y: number;
  hp: number;
  ttl: number;
  attackTimer: number;
  damage: number;
}

export interface BuffInstance {
  name: string;
  stat: "attack" | "defense" | "moveSpeed" | "maxHp";
  percent: number;
  remaining: number;
}

export interface TrapInstance {
  uid: string;
  x: number;
  y: number;
  radius: number;
  damage: number;
  kind: "hazard" | "snare";
  armed: boolean;
  rearmTimer: number;
  rearmDelay: number;
  statusEffect?: StatusInstance;
}

export interface PortalDef {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  targetZone: ZoneId;
  targetX: number;
  targetY: number;
  label: string;
}

export interface NpcSpawn {
  id: string;
  x: number;
  y: number;
}

export interface MonsterSpawn {
  id: string;
  x: number;
  y: number;
}

export interface ChestSpawn {
  id: string;
  x: number;
  y: number;
}

export interface TrapSpawn {
  id: string;
  x: number;
  y: number;
  radius: number;
  damage: number;
  cooldown: number;
}

export interface GatherSpawn {
  id: string;
  itemId: string;
  x: number;
  y: number;
}

export interface ZoneData {
  id: ZoneId;
  name: string;
  width: number;
  height: number;
  tileWidth: number;
  tileHeight: number;
  blocked: boolean[];
  safe: boolean;
  ambience: "village" | "forest" | "dungeon" | "marsh" | "frost" | "throne";
  spawn: Vec2;
  portals: PortalDef[];
  npcs: NpcSpawn[];
  monsterSpawns: MonsterSpawn[];
  chests: ChestSpawn[];
  traps: TrapSpawn[];
  gatherNodes: GatherSpawn[];
}

export interface NpcDef {
  id: string;
  name: string;
  role: string;
  dialogue: string[];
  quests?: string[];
  shop?: string;
  healer?: boolean;
  trainer?: boolean;
  sprite: string;
  color: string;
}

export interface ShopDef {
  id: string;
  name: string;
  itemIds: string[];
}

export interface CharacterSave {
  version: number;
  id: string;
  name: string;
  classId: ClassId;
  level: number;
  xp: number;
  gold: number;
  hp: number;
  resource: number;
  zone: ZoneId;
  x: number;
  y: number;
  inventory: (ItemStack | null)[];
  quickSlots: [string | null, string | null];
  gatherCooldowns: Record<string, number>;
  talents: string[];
  equipment: Equipment;
  quests: QuestState[];
  openedChests: string[];
  difficulty: GameDifficulty;
  ngPlus: number;
  defeatedBosses: string[];
  storyChapter: number;
  introShown?: boolean;
  relationships: Record<string, number>;
  npcKindRewards: string[];
  playtime: number;
  rngState: number;
  createdAt: number;
  updatedAt: number;
  companion?: CompanionEgg;
}

export interface CompanionEgg {
  kind: "egg";
  name: string;
  hatched?: boolean;
  /** Id of the pet species this egg hatches into (see data/pets.ts). */
  species?: string;
}

export interface InputState {
  moveX: number;
  moveY: number;
  aimX: number;
  aimY: number;
}

export type SimEvent =
  | {
      type: "damage";
      target: "player" | "monster";
      uid?: string;
      amount: number;
      crit: boolean;
      x: number;
      y: number;
      damageType: DamageType;
      source?: "hatchling";
    }
  | { type: "heal"; amount: number; x: number; y: number }
  | { type: "dodge"; x: number; y: number }
  | { type: "immune"; x: number; y: number }
  | { type: "death"; who: "player" | "monster"; defId?: string; x: number; y: number }
  | { type: "levelup"; level: number }
  | { type: "xp"; amount: number }
  | { type: "gold"; amount: number }
  | { type: "loot"; itemId: string; qty: number; x: number; y: number }
  | { type: "pickup"; itemId: string; qty: number }
  | { type: "quest"; questId: string; text: string }
  | { type: "zone"; zone: ZoneId }
  | { type: "passage"; zone: ZoneId; x: number; y: number; width: number; height: number; portal?: PortalDef }
  | { type: "log"; text: string; tone?: "info" | "good" | "bad" | "quest" }
  | { type: "story"; title: string; text: string; closing: string; bossIndex: number }
  | { type: "save" }
  | {
      type: "cast";
      abilityId: string;
      x: number;
      y: number;
      targetX: number;
      targetY: number;
      targeting: AbilityTargeting;
      radius: number;
      basic: boolean;
      color: string;
      icon: string;
    }
  | { type: "telegraph"; x: number; y: number; radius: number; remaining: number; shape?: "ring" | "line" | "cone" | "spot"; angle?: number }
  | { type: "interact"; kind: "npc" | "portal" | "chest" | "gather"; id: string }
  | { type: "respawn" }
  | { type: "error"; message: string };

export interface InteractResult {
  kind: "npc" | "portal" | "chest" | "gather";
  id: string;
  label: string;
}
