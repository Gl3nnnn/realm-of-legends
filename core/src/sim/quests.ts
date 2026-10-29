// Quest actions: tracking progress, accepting, turning in and picking rewards.
// Each function takes the game session as its first argument, so the
// session's saved data and helpers stay in one place.
import { getQuest, QUESTS } from "../data/quests";
import { getItem } from "../data/items";
import { NPCS } from "../data/npcs";
import { PET_SPECIES } from "../data/pets";
import type { GameSession } from "./GameSession";
import type { QuestDef, QuestObjective, QuestState } from "../types";

export function recordKill(session: GameSession, monsterId: string): void {
  for (const state of session.save.quests) {
    if (state.completed) continue;
    const quest = QUESTS[state.id];
    if (!quest) continue;
    quest.objectives.forEach((objective, i) => {
      if (objective.kind === "kill" && objective.monsterId === monsterId) state.progress[i] = Math.min(objective.count, (state.progress[i] ?? 0) + 1);
      else if (objective.kind === "boss" && objective.monsterId === monsterId) state.progress[i] = 1;
    });
    refreshQuestCompletion(session, state);
  }
}

export function advanceSurvival(session: GameSession, dt: number): void {
  const activeObjectives = new Set<string>();
  for (const state of session.save.quests) {
    if (state.completed) continue;
    const quest = QUESTS[state.id];
    if (!quest) continue;
    let changed = false;
    quest.objectives.forEach((objective, i) => {
      if (objective.kind !== "survive") return;
      const key = `${state.id}:${i}`;
      if (objective.zone !== session.save.zone) {
        if ((state.progress[i] ?? 0) !== 0) {
          state.progress[i] = 0;
          changed = true;
        }
        session.questSurvivalElapsed.delete(key);
        return;
      }
      activeObjectives.add(key);
      const elapsed = (session.questSurvivalElapsed.get(key) ?? 0) + dt;
      const wholeSeconds = Math.floor(elapsed + 1e-8);
      if (wholeSeconds > 0) {
        state.progress[i] = Math.min(objective.count, (state.progress[i] ?? 0) + wholeSeconds);
        session.questSurvivalElapsed.set(key, elapsed - wholeSeconds);
        changed = true;
      } else {
        session.questSurvivalElapsed.set(key, elapsed);
      }
    });
    if (changed) refreshQuestCompletion(session, state);
  }
  for (const key of session.questSurvivalElapsed.keys()) {
    if (!activeObjectives.has(key)) session.questSurvivalElapsed.delete(key);
  }
}

export function refreshQuestCompletion(session: GameSession, state: QuestState): void {
  const quest = QUESTS[state.id];
  if (!quest) return;
  const done = quest.objectives.every((objective, i) => (state.progress[i] ?? 0) >= objectiveCount(objective));
  if (done && !state.completed) {
    state.completed = true;
    session.emit({ type: "quest", questId: quest.id, text: `${quest.name} is ready to turn in.` });
    session.emit({ type: "log", text: `${quest.name} complete. Return to ${NPCS[quest.giverNpc]?.name ?? "the quest giver"}.`, tone: "quest" });
  }
}

function objectiveCount(objective: QuestObjective): number {
  if (objective.kind === "boss") return 1;
  if (objective.kind === "explore") return objective.zones.length;
  if (objective.kind === "visit") return 1;
  return objective.count;
}

export function refreshCollectQuests(session: GameSession): void {
  for (const state of session.save.quests) {
    if (state.completed) continue;
    const quest = QUESTS[state.id];
    if (!quest) continue;
    let changed = false;
    quest.objectives.forEach((objective, i) => {
      if (objective.kind !== "collect") return;
      const count = Math.min(objective.count, session.countItem(objective.itemId));
      if ((state.progress[i] ?? 0) !== count) {
        state.progress[i] = count;
        changed = true;
      }
    });
    if (changed) refreshQuestCompletion(session, state);
  }
}

export function getNpcQuestStates(session: GameSession, npcId: string): { questId: string; name: string; level: number; state: QuestState | null; available: boolean; canTurnIn: boolean; description: string; repeatable: boolean; requires: string[] }[] {
  const npc = NPCS[npcId];
  if (!npc?.quests) return [];
  return npc.quests.map((questId) => {
    const quest = getQuest(questId);
    const state = session.save.quests.find((q) => q.id === questId) ?? null;
    const available = !state && questUnlocked(session, quest);
    const canTurnIn = Boolean(state && state.completed && (quest.repeatable || state.completions === 0));
    const requires = (quest.requires ?? []).filter((id) => !session.save.quests.some((q) => q.id === id && q.completions > 0));
    return { questId, name: quest.name, level: quest.requiresLevel ?? 1, state, available, canTurnIn, description: quest.description, repeatable: Boolean(quest.repeatable), requires };
  });
}

// A quest unlocks when the level is high enough and every quest it requires is done.
export function questUnlocked(session: GameSession, quest: QuestDef): boolean {
  if (session.save.level < (quest.requiresLevel ?? 1)) return false;
  return (quest.requires ?? []).every((id) => session.save.quests.some((q) => q.id === id && q.completions > 0));
}

export function acceptQuest(session: GameSession, questId: string): boolean {
  const quest = QUESTS[questId];
  if (!quest) return false;
  if (!questUnlocked(session, quest)) return false;
  const existing = session.save.quests.find((q) => q.id === questId);
  if (existing) return false;
  const state: QuestState = {
    id: questId,
    progress: quest.objectives.map(() => 0),
    completed: false,
    completions: 0,
    exploredZones: quest.objectives.some((objective) => objective.kind === "explore") ? [] : undefined,
  };
  session.save.quests.push(state);
  for (const [i, objective] of quest.objectives.entries()) {
    if (objective.kind === "collect") state.progress[i] = Math.min(objective.count, session.countItem(objective.itemId));
    if (objective.kind === "visit" && objective.zone === session.save.zone) state.progress[i] = 1;
    if (objective.kind === "explore" && objective.zones.includes(session.save.zone)) {
      state.exploredZones = [session.save.zone];
      state.progress[i] = 1;
    }
    if (objective.kind === "boss" && session.save.defeatedBosses.includes(objective.monsterId)) state.progress[i] = 1;
  }
  refreshQuestCompletion(session, state);
  session.emit({ type: "quest", questId, text: `Quest accepted: ${quest.name}.` });
  session.emit({ type: "log", text: `Quest accepted: ${quest.name}.`, tone: "quest" });
  return true;
}

export function turnInQuest(session: GameSession, questId: string): boolean {
  const quest = QUESTS[questId];
  if (!quest) return false;
  const state = session.save.quests.find((q) => q.id === questId);
  if (!state) return false;
  if (!state.completed) {
    refreshQuestCompletion(session, state);
    if (!state.completed) return false;
  }
  const collectObjectives = quest.objectives.filter((objective) => objective.kind === "collect");
  for (const objective of collectObjectives) {
    if (objective.kind !== "collect") continue;
    if (session.countItem(objective.itemId) < objective.count) {
      session.emit({ type: "log", text: `You still need ${objective.count}x ${getItem(objective.itemId).name}.`, tone: "bad" });
      return false;
    }
  }
  for (const objective of collectObjectives) {
    if (objective.kind !== "collect") continue;
    session.removeItem(objective.itemId, objective.count);
  }
  const gold = session.gainGold(quest.rewards.gold);
  session.gainXp(quest.rewards.xp);
  for (const reward of quest.rewards.items ?? []) {
    const leftover = session.addItem(reward.itemId, reward.qty);
    if (leftover > 0) {
      session.loot.push({ uid: session.nextUid("l"), itemId: reward.itemId, qty: leftover, x: session.save.x, y: session.save.y, ttl: 120 });
    }
  }
  state.completions += 1;
  if (quest.repeatable) {
    state.completed = false;
    state.progress = quest.objectives.map(() => 0);
    state.exploredZones = quest.objectives.some((objective) => objective.kind === "explore") ? [] : undefined;
  } else {
    state.completed = true;
  }
  session.emit({ type: "quest", questId, text: `Quest turned in: ${quest.name}.` });
  session.emit({ type: "log", text: `Turned in ${quest.name}. Earned ${gold} gold and ${quest.rewards.xp} XP.`, tone: "good" });
  return true;
}

export function pickQuestReward(session: GameSession, questId: string, index: number): boolean {
  const quest = QUESTS[questId];
  if (!quest?.choose) return false;
  const reward = quest.choose[index];
  if (!reward) return false;
  const state = session.save.quests.find((q) => q.id === questId);
  if (!state || !state.completed) return false;
  if (state.claimedReward !== undefined) {
    session.emit({ type: "log", text: `${quest.name}: you already claimed your reward.`, tone: "bad" });
    return false;
  }
  state.claimedReward = index;
  state.completions += 1;
  session.gainGold(reward.gold);
  session.gainXp(reward.xp);
  for (const item of reward.items ?? []) {
    const leftover = session.addItem(item.itemId, item.qty);
    if (leftover > 0) {
      session.loot.push({ uid: session.nextUid("l"), itemId: item.itemId, qty: leftover, x: session.save.x, y: session.save.y, ttl: 120 });
    }
  }
  session.emit({ type: "log", text: `${quest.name}: you chose your reward.`, tone: "good" });
  if (questId === "forest_keeper_gift" && !session.save.companion) {
    const species = session.rng.pick(PET_SPECIES);
    session.save.companion = { kind: "egg", name: "Forest Egg", species: species.id };
    session.emit({ type: "log", text: "A warm egg has joined you. It will hatch in time.", tone: "good" });
  }
  return true;
}
