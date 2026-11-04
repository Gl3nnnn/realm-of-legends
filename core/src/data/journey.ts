import type { ZoneId } from "../types";

/**
 * The Journey: a free, permanent progression track that sits beside the level bar.
 *
 * Trending games all ship one - a season pass you never have to pay for, filled
 * by *playing well* rather than by grinding experience. Every deed below is a
 * small, concrete thing to do in a zone. Finishing deeds fills the Journey, and
 * each Journey step pays a reward. Nothing here is time-limited, so a returning
 * player never comes back to a track that expired.
 */

/** A deed: one small thing to do, worth journey points. */
export interface DeedDef {
  id: string;
  zone: ZoneId;
  name: string;
  /** What the player must do, in plain words, for the journal. */
  task: string;
  /** Which counter this deed reads. */
  kind: "kills" | "bosses" | "chests" | "gathers" | "arena" | "quests";
  /** How many are needed. */
  target: number;
  /** Journey points paid on completion. */
  points: number;
  /** Gold paid on completion. */
  gold: number;
}

export const DEEDS: DeedDef[] = [
  {
    id: "village_first_blood",
    zone: "village",
    name: "Keep the Road Clear",
    task: "Slay 10 monsters in the village.",
    kind: "kills",
    target: 10,
    points: 40,
    gold: 25,
  },
  {
    id: "village_tidy",
    zone: "village",
    name: "Nothing Left Locked",
    task: "Open 3 chests in the village.",
    kind: "chests",
    target: 3,
    points: 50,
    gold: 30,
  },
  {
    id: "village_errands",
    zone: "village",
    name: "Everyone's Errand Boy",
    task: "Finish 2 quests that start in the village.",
    kind: "quests",
    target: 2,
    points: 60,
    gold: 40,
  },
  {
    id: "forest_cull",
    zone: "forest",
    name: "Thin the Pack",
    task: "Slay 25 monsters in the forest.",
    kind: "kills",
    target: 25,
    points: 70,
    gold: 55,
  },
  {
    id: "forest_harvest",
    zone: "forest",
    name: "Gatherer's Hands",
    task: "Gather from 6 nodes in the forest.",
    kind: "gathers",
    target: 6,
    points: 60,
    gold: 45,
  },
  {
    id: "dungeon_warden",
    zone: "dungeon",
    name: "The Keeper Falls",
    task: "Defeat the Bone Warden.",
    kind: "bosses",
    target: 1,
    points: 120,
    gold: 120,
  },
  {
    id: "dungeon_sweep",
    zone: "dungeon",
    name: "Every Corner",
    task: "Open 4 chests in the dungeon.",
    kind: "chests",
    target: 4,
    points: 80,
    gold: 70,
  },
  {
    id: "marsh_cull",
    zone: "marsh",
    name: "Boots Full of Swamp",
    task: "Slay 30 monsters in the marsh.",
    kind: "kills",
    target: 30,
    points: 90,
    gold: 85,
  },
  {
    id: "marsh_mother",
    zone: "marsh",
    name: "Send Her Back to the Mud",
    task: "Defeat the Miremother.",
    kind: "bosses",
    target: 1,
    points: 150,
    gold: 150,
  },
  {
    id: "frost_cull",
    zone: "frost",
    name: "Warm Blood Out Here",
    task: "Slay 30 monsters in the frost.",
    kind: "kills",
    target: 30,
    points: 110,
    gold: 110,
  },
  {
    id: "frost_revenant",
    zone: "frost",
    name: "Break the Shell",
    task: "Defeat the Frost Revenant.",
    kind: "bosses",
    target: 1,
    points: 170,
    gold: 170,
  },
  {
    id: "throne_acolytes",
    zone: "throne",
    name: "Silence the Choir",
    task: "Slay 20 monsters in the throne.",
    kind: "kills",
    target: 20,
    points: 130,
    gold: 140,
  },
  {
    id: "throne_hollow",
    zone: "throne",
    name: "Take the Crown Off",
    task: "Defeat the Hollow King.",
    kind: "bosses",
    target: 1,
    points: 250,
    gold: 300,
  },
  {
    id: "ring_ten",
    zone: "village",
    name: "Ten Deep",
    task: "Clear 10 waves in the Hollow Ring.",
    kind: "arena",
    target: 10,
    points: 160,
    gold: 160,
  },
];

/** A stop on the journey track and what it pays. */
export interface JourneyStop {
  level: number;
  /** Journey points needed to reach this stop, cumulatively. */
  needed: number;
  gold: number;
  /** Item granted, if any. */
  itemId?: string;
  /** One short line describing the stop. */
  label: string;
}

/** Journey points per stop grow gently, so early stops land in the first hour. */
const STOP_POINTS = [0, 60, 140, 240, 360, 500, 660, 840, 1040, 1260, 1500, 1780, 2080, 2400, 2740, 3100];

const STOP_LABELS = [
  "A first pat on the back",
  "The road remembers you",
  "Pockets a little heavier",
  "A small kindness returned",
  "The village knows your name",
  "A reward worth carrying",
  "Halfway to somewhere",
  "The old road opens",
  "The pack runs with you",
  "A name they will not forget",
  "Almost a legend",
  "The realm has heard of you",
  "A hero of Eldoria",
  "A title that sticks",
  "One step from the song",
  "The song, sung",
];

const STOP_GOLD = [40, 70, 110, 160, 220, 300, 380, 480, 600, 750, 900, 1100, 1350, 1600, 2000, 2500];

/** The item prizes sit at a few stops, so the track has landmarks to aim for. */
const STOP_ITEMS: Record<number, string> = {
  4: "health_potion",
  8: "greater_health_potion",
  12: "health_potion",
  16: "greater_health_potion",
};

export const JOURNEY_STOPS: JourneyStop[] = STOP_POINTS.map((needed, index) => ({
  level: index + 1,
  needed,
  gold: STOP_GOLD[index],
  itemId: STOP_ITEMS[index + 1],
  label: STOP_LABELS[index],
}));

export const MAX_JOURNEY = JOURNEY_STOPS.length;

/** The stop at a journey level (clamped, so a corrupt save cannot overflow). */
export function journeyStop(level: number): JourneyStop {
  const index = Math.max(0, Math.min(MAX_JOURNEY - 1, Math.floor(level) - 1));
  return JOURNEY_STOPS[index];
}

/** Journey level reached by a number of points. */
export function journeyLevelFor(points: number): number {
  let level = 1;
  for (const stop of JOURNEY_STOPS) {
    if (points >= stop.needed) level = stop.level;
    else break;
  }
  return level;
}

/** Points still needed for the next stop, or 0 at the end of the track. */
export function journeyPointsToNext(points: number): number {
  const next = JOURNEY_STOPS.find((stop) => stop.needed > points);
  return next ? next.needed - points : 0;
}

/** The next stop, or null once the track is finished. */
export function journeyNextStop(points: number): JourneyStop | null {
  return JOURNEY_STOPS.find((stop) => stop.needed > points) ?? null;
}

/** All deeds grouped by zone, for the journal. */
export function deedsByZone(): { zone: ZoneId; deeds: DeedDef[] }[] {
  const order: ZoneId[] = ["village", "forest", "dungeon", "marsh", "frost", "throne"];
  return order
    .map((zone) => ({ zone, deeds: DEEDS.filter((deed) => deed.zone === zone) }))
    .filter((entry) => entry.deeds.length > 0);
}

/** One deed by id. */
export function getDeed(id: string): DeedDef | undefined {
  return DEEDS.find((deed) => deed.id === id);
}

/** Total journey points a hero could earn from every deed. */
export const TOTAL_DEED_POINTS = DEEDS.reduce((sum, deed) => sum + deed.points, 0);
