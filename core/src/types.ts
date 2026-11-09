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
  /** Gem ids set into the item's sockets. Each one keeps giving its bonus while worn. */
  gems?: string[];
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
  state: "idle" | "chase" | "attack" | "return" | "dead" | "flee";
  facing: number;
  attackTimer: number;
  respawnTimer: number;
  statuses: StatusInstance[];
  wanderTimer: number;
  wanderX: number;
  wanderY: number;
  elite?: EliteAffix;
  phase?: number;
  /** Cannot be hurt: the training dummy soaks hits and never hits back. */
  invulnerable?: boolean;
  /** Seconds left before a fleeing thief escapes with its purse. */
  fleeTimer?: number;
  /** Where the fleeing thief is running to. */
  fleeX?: number;
  fleeY?: number;
}

/** A coin that points at a hidden chest, one per zone, worth the walk. */
export interface TreasureHunt {
  zone: ZoneId;
  x: number;
  y: number;
  claimX: number;
  claimY: number;
  hint: string;
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
  /** This NPC keeps the village vault and can open it from their conversation. */
  stash?: boolean;
  sprite: string;
  color: string;
}

export interface ShopDef {
  id: string;
  name: string;
  itemIds: string[];
}

export interface SaveStats {
  monstersSlain: number;
  bossesSlain: number;
  deaths: number;
  chestsOpened: number;
  questsCompleted: number;
  goldEarned: number;
  itemsFound: number;
  potionsUsed: number;
  perfectDodges: number;
  bestHit: number;
  distanceWalked: number;
  bestStreak: number;
  /** Gold earned from the bounty board. */
  bountyGold: number;
  /** Monsters defeated while the winner was the last one standing in a fight. */
  flawlessFights: number;
  /** Longest chain of hits landed without taking one. */
  bestCombo: number;
  /** Weakness hits landed, the "did you read the bestiary" counter. */
  weaknessHits: number;
  /** The biggest single hit the training dummy has soaked. */
  bestDummyHit: number;
  /** The longest clean chain landed on the training dummy. */
  bestDummyCombo: number;
}

export interface BountyProgress {
  /** Which rolled bounty this counts toward (see sim/bounties.ts). */
  key: string;
  progress: number;
  claimed: boolean;
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
  /** Lifetime counters, shown in the journal and used by achievements. */
  stats: SaveStats;
  /** Ids of the achievements already earned. */
  achievements: string[];
  /** Zones unlocked for fast travel. */
  waypoints: ZoneId[];
  /** Experience earned by the hatched companion. */
  petXp: number;
  /** The title worn by the hero, earned from achievements. */
  title: string;
  /** Progress on the rotating bounty board. */
  bounties: BountyProgress[];
  /** The last in-game day a shrine blessing was bought on. */
  blessingDay: number;
  /** The bounty streak: bounties turned in without a death in between. */
  bountyStreak: number;
  /** Casts per ability id, so mastery is earned by using a skill, not by reading about it. */
  abilityUses: Record<string, number>;
  /** Elements woken by hitting a burning, soaked, chilled or shocked monster with another. */
  reactionsSeen: string[];
  /** The quest the hero pinned above all others. Cleared when it is finished. */
  pinnedQuest: string | null;
  /** Ids of monsters the hero has actually met, so the bestiary fills in as it is played. */
  metMonsters: string[];
  /** Kills per monster id, the "have I killed this one yet" column of the bestiary. */
  monsterKills: Record<string, number>;
  /** The last few things that happened, newest first, for the "what did I just do" page. */
  diary: DiaryEntry[];
  /** Journey points earned by finishing deeds, spent on the free Journey track. */
  journeyPoints: number;
  /** Ids of deeds already finished. */
  deeds: string[];
  /** The highest Journey stop the hero has already claimed. */
  journeyClaimed: number;
  /** Progress for each deed, counted as the hero plays. */
  deedProgress: Record<string, number>;
  /** The monster with a grudge, once one has beaten the hero. */
  rival: RivalState | null;
  /** The deepest Hollow Ring wave ever cleared. */
  arenaBest: number;
  /** The deepest Endless Descent wave ever cleared. */
  descentBest: number;
  /** Shards earned in the Descent, traded for gold in the journal. */
  descentShards: number;
  /** Relics bought with shards. They are permanent and never lost. */
  descentRelics: string[];
  /** The risk carried into each Descent run (0-3, see data/descent.ts). */
  descentPact: number;
  /** Bosses already beaten in the Hollow Ring's gauntlet, in any order. */
  gauntletCleared: string[];
  /** The last few descent runs, kept for the local leaderboard. */
  descentRuns: DescentRun[];
  /** The local day the daily reward was last collected ("YYYY-MM-DD"). */
  dailyClaimedOn: string;
  /** Consecutive days the daily reward was collected. */
  dailyStreak: number;
  /** The week the weekly score belongs to ("YYYY-Www"). */
  weeklyKey: string;
  /** The best Endless Descent wave posted this week. */
  weeklyBest: number;
  /** Gear sets the hero saved, swapped with one press. */
  loadouts: Loadout[];
  /** The village vault. Only the first `STASH_CAPACITIES[stashTier]` squares can be used. */
  stash: (ItemStack | null)[];
  /** How many vault expansions have been bought (0-3). */
  stashTier: number;
  /** The Torment tier the hero is playing on (0-10, see data/torment.ts). */
  torment: number;
  /** Achievements whose reward has already been collected, so it pays once. */
  achievementClaims: string[];
  /** How far each village building has been rebuilt (see data/village.ts). */
  village: Record<string, number>;
  /** The collar and charm the companion wears (see data/companions.ts). */
  petGear: PetGearState;
  /** The one passive skill the companion was taught. */
  petSkill: string | null;
  /** A hardcore hero dies for good: the save is moved to the memorial instead of carried on. */
  hardcore: boolean;
}

/** The two worn companion items, kept on the save so they survive a reload. */
export interface PetGearState {
  collar: string | null;
  charm: string | null;
}

/** A hero who fell in hardcore mode, kept on the memorial wall. */
export interface MemorialEntry {
  id: string;
  name: string;
  classId: ClassId;
  level: number;
  /** The zone the hero fell in, by its display name. */
  zone: string;
  /** Who did it, if the game knows. */
  killer: string;
  /** What killed them, in one short line. */
  cause: string;
  /** How long they were played, in seconds. */
  playtime: number;
  /** When they fell, as a timestamp. */
  at: number;
  /** Bosses they put down before the end. */
  bosses: number;
}

/**
 * The monster that beat the hero and remembers it. It grows with the hero,
 * so the grudge stays worth settling.
 */
export interface RivalState {
  name: string;
  species: string;
  faces: string;
  wins: number;
  losses: number;
}

/** A gear set the hero saved and can put back on with one press. */
export interface Loadout {
  name: string;
  equipment: Equipment;
  /** The two quick slots that belonged with the set. */
  quickSlots: [string | null, string | null];
}

/** One finished Endless Descent run, kept for the local leaderboard. */
export interface DescentRun {
  /** Deepest wave cleared. */
  score: number;
  /** The seed the run was rolled from. */
  seed: number;
  /** When the run ended, as a timestamp. */
  at: number;
}

/**
 * A single line in the hero's diary, written when something worth remembering happens.
 * It is small on purpose: a stamp, a kind and one short line.
 */
export interface DiaryEntry {
  /** Play time, in seconds, when the line was written. */
  t: number;
  /** Which sort of line this is, used for the icon and the colour. */
  kind: "kill" | "quest" | "boss" | "level" | "loot" | "death" | "zone" | "achievement";
  text: string;
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
  | { type: "death"; who: "player" | "monster"; defId?: string; x: number; y: number; boss?: boolean }
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
  | { type: "achievement"; id: string; name: string; title?: string }
  | { type: "pet-stage"; stage: number; name: string }
  | { type: "boss-intro"; monsterId: string; name: string; text: string; warning: string; level: number }
  | { type: "treasure"; zone: ZoneId; x: number; y: number; claimX: number; claimY: number; hint: string }
  | { type: "error"; message: string }
  /** A hardcore hero has died for good; the shell writes the entry to the wall and removes the save. */
  | { type: "hardcore-end"; entry: MemorialEntry };

export interface InteractResult {
  kind: "npc" | "portal" | "chest" | "gather";
  id: string;
  label: string;
}
