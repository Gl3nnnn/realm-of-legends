import { ITEMS } from "../data/items";
import { MONSTERS, SUMMON_IDS } from "../data/monsters";
import { QUESTS } from "../data/quests";
import { STORY_CHAPTERS } from "../data/story";
import { ZONES } from "../generated/world-data";
import type { CharacterSave, MonsterDef, QuestDef, ZoneData, ZoneId } from "../types";

/**
 * Small helpers that answer the questions a player actually asks mid-game:
 * "where does this monster live?", "what does it drop?", "who wants it dead?",
 * and "what should I do next?". All of it is read-only and cheap enough to call
 * from the HUD every frame.
 */

export interface MonsterGuideEntry {
  monster: MonsterDef;
  /** The first zone the monster is placed in, i.e. where to go looking. */
  zone: ZoneId;
  zoneName: string;
  /** Names of the quests that ask the player to kill it. */
  quests: string[];
  /** The loot worth knowing about, by display name. */
  drops: string[];
  /** Its attack type, so a player can pick the right potion or defence. */
  kind: "ranged" | "support" | "melee";
}

function zoneForMonster(monsterId: string): ZoneData | undefined {
  return Object.values(ZONES).find((zone) => zone.monsterSpawns.some((spawn) => spawn.id === monsterId));
}

function questsFor(monsterId: string): string[] {
  return Object.values(QUESTS)
    .filter((quest) => quest.objectives.some((objective) =>
      (objective.kind === "kill" || objective.kind === "boss") && objective.monsterId === monsterId,
    ))
    .map((quest) => quest.name);
}

let guideCache: MonsterGuideEntry[] | null = null;

/** Every monster the player can meet, in level order, with where it lives and what wants it dead. */
export function monsterGuide(): MonsterGuideEntry[] {
  if (guideCache) return guideCache;
  const entries: MonsterGuideEntry[] = Object.values(MONSTERS)
    .filter((monster) => !SUMMON_IDS.has(monster.id))
    .map((monster) => {
      const zone = zoneForMonster(monster.id);
      const drops = monster.loot
        .filter((entry) => entry.chance >= 0.05)
        .sort((a, b) => b.chance - a.chance)
        .slice(0, 3)
        .map((entry) => ITEMS[entry.itemId]?.name ?? entry.itemId);
      const kind: MonsterGuideEntry["kind"] = monster.role === "ranged" ? "ranged" : monster.role === "support" ? "support" : "melee";
      return {
        monster,
        zone: (zone?.id ?? "village") as ZoneId,
        zoneName: zone?.name ?? "Unknown",
        quests: questsFor(monster.id),
        drops,
        kind,
      } satisfies MonsterGuideEntry;
    })
    .sort((a, b) => a.monster.level - b.monster.level || a.monster.name.localeCompare(b.monster.name));
  guideCache = entries;
  return entries;
}

/** The monster guide entry for one monster id, or undefined when it is a summon. */
export function monsterGuideEntry(monsterId: string): MonsterGuideEntry | undefined {
  return monsterGuide().find((entry) => entry.monster.id === monsterId);
}

export interface NextStep {
  title: string;
  detail: string;
  zone: ZoneId;
  zoneName: string;
  /** Level the game expects the player to be, for the "you are under-levelled" nudge. */
  level: number;
  questName: string | null;
}

function objectiveDetail(quest: QuestDef): string {
  const first = quest.objectives[0];
  if (!first) return "See your quest journal for details.";
  if (first.kind === "kill" || first.kind === "boss") {
    const monster = MONSTERS[first.monsterId];
    const name = monster?.name ?? first.monsterId;
    const zone = zoneForMonster(first.monsterId);
    const where = zone ? ` in ${zone.name}` : "";
    return first.kind === "boss" ? `Defeat ${name}${where}.` : `Defeat ${first.count} ${name}${where}.`;
  }
  if (first.kind === "collect") return `Collect ${first.count} ${ITEMS[first.itemId]?.name ?? first.itemId}.`;
  if (first.kind === "visit") return `Travel to ${ZONES[first.zone]?.name ?? first.zone}.`;
  if (first.kind === "explore") return `Explore ${first.zones.length} new zones.`;
  if (first.kind === "survive") return `Survive ${first.count} seconds in ${ZONES[first.zone]?.name ?? first.zone}.`;
  return "See your quest journal for details.";
}

function questZone(quest: QuestDef): ZoneId {
  for (const objective of quest.objectives) {
    if (objective.kind === "kill" || objective.kind === "boss") {
      const zone = zoneForMonster(objective.monsterId);
      if (zone) return zone.id as ZoneId;
    }
    if (objective.kind === "visit" || objective.kind === "survive") return objective.zone;
    if (objective.kind === "explore") return objective.zones[0] ?? "village";
  }
  // No location in the objectives means the work starts where the quest giver stands.
  return "village";
}

/**
 * The one thing the player should do next, in priority order: finish a quest that is already
 * under way, take the next story boss, or nothing at all. Returned so the HUD can point an arrow
 * at it instead of leaving the player to guess.
 */
export function nextStep(save: CharacterSave): NextStep | null {
  const active = save.quests
    .filter((state) => QUESTS[state.id] && !state.completed)
    .map((state) => QUESTS[state.id]!)
    .sort((a, b) => (a.requiresLevel ?? 0) - (b.requiresLevel ?? 0));
  const quest = active[0];
  if (quest) {
    const zone = questZone(quest);
    return {
      title: quest.name,
      detail: objectiveDetail(quest),
      zone,
      zoneName: ZONES[zone]?.name ?? zone,
      level: quest.requiresLevel ?? 1,
      questName: quest.name,
    };
  }
  // Nothing under way: point at the next story boss instead, so the campaign never stalls.
  const chapter = STORY_CHAPTERS[save.storyChapter + 1];
  const bossId = chapter?.bossId;
  if (!chapter || !bossId) return null;
  const boss = MONSTERS[bossId];
  const zone = zoneForMonster(bossId);
  const zoneId = (zone?.id ?? "village") as ZoneId;
  return {
    title: chapter.title,
    detail: boss ? `Defeat ${boss.name} to continue the story.` : "Follow the road north.",
    zone: zoneId,
    zoneName: zone?.name ?? zoneId,
    level: boss?.level ?? 1,
    questName: null,
  };
}
