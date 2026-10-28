import { ITEMS, createItemInstance, isEquippable } from "../data/items";
import { getMonster, SUMMON_IDS } from "../data/monsters";
import { STORY_CHAPTERS, NG_PLUS_HOLLOW_ENDING } from "../data/story";
import { length } from "./geometry";
import type { DamageType, ItemStack, MonsterInstance, StatusInstance } from "../types";
import type { GameSession } from "./GameSession";

// Take damage that already has the hero's own reduction applied; kills the hero when hp reaches 0.
export function damagePlayer(s: GameSession, raw: number, source: string): void {
  if (s.dead) return;
  if (s.invulnerable > 0) {
    if (s.elapsed - s.lastImmuneEvent > 0.35) {
      s.lastImmuneEvent = s.elapsed;
      s.emit({ type: "immune", x: s.save.x, y: s.save.y });
    }
    return;
  }
  const stats = s.stats;
  const reduced = raw * (1 - s.modifiers.damageReduction / 100);
  const mitigated = Math.max(1, Math.round(reduced * (100 / (100 + stats.defense * 2))));
  let damage = mitigated;
  if (s.shield > 0) {
    const absorbed = Math.min(s.shield, damage);
    s.shield -= absorbed;
    damage -= absorbed;
    if (absorbed > 0) s.emit({ type: "log", text: `Shield absorbs ${Math.round(absorbed)} damage.`, tone: "info" });
  }
  s.save.hp = Math.max(0, s.save.hp - damage);
  s.lastCombat = s.elapsed;
  if (damage > 0) s.emit({ type: "damage", target: "player", amount: Math.round(damage), crit: false, x: s.save.x, y: s.save.y, damageType: "physical" });
  if (s.save.hp <= 0) s.killPlayer(source);
}

// Unlock the next story chapter once its boss has fallen, and replay the ending on later cycles.
export function advanceStoryFromBoss(s: GameSession): void {
  // A boss defeated out of order is still recorded, so its chapter unlocks when the earlier chapters are done.
  while (s.save.storyChapter < STORY_CHAPTERS.length - 1) {
    const nextChapter = STORY_CHAPTERS[s.save.storyChapter + 1];
    if (!nextChapter || !nextChapter.bossId || !s.save.defeatedBosses.includes(nextChapter.bossId)) break;
    s.save.storyChapter += 1;
    const next = STORY_CHAPTERS[s.save.storyChapter];
    s.emit({ type: "story", title: next.title, text: next.text, closing: next.closing, bossIndex: s.save.storyChapter - 1 });
  }
  // The final boss's ending changes on later cycles, so a replay has a new story to see.
  const finalChapter = STORY_CHAPTERS[STORY_CHAPTERS.length - 1];
  if (s.save.ngPlus > 0 && s.save.defeatedBosses.includes("hollow_king") && s.save.storyChapter === STORY_CHAPTERS.length - 1) {
    s.emit({ type: "story", title: finalChapter.title, text: finalChapter.text, closing: NG_PLUS_HOLLOW_ENDING, bossIndex: STORY_CHAPTERS.length - 1 });
  }
}

export function killMonster(s: GameSession, monster: MonsterInstance): void {
  if (monster.state === "dead") return;
  monster.state = "dead";
  const def = getMonster(monster.defId);
  // A boss that was already defeated never comes back, so it has no respawn timer.
  monster.respawnTimer = def.respawn > 0 && !def.boss ? def.respawn : 0;
  s.emit({ type: "death", who: "monster", defId: def.id, x: monster.x, y: monster.y });
  s.lastCombat = s.elapsed;
  const firstBossKill = def.boss && !s.save.defeatedBosses.includes(def.id);
  if (firstBossKill) {
    s.save.defeatedBosses.push(def.id);
  }
  if (def.boss) advanceStoryFromBoss(s);
  if (monster.elite === "volatile" && length(s.save.x - monster.x, s.save.y - monster.y) <= 90) {
    damagePlayer(s, def.attack * s.difficultyScale.attack * 1.4, `${def.name} (Volatile)`);
    s.emit({ type: "log", text: `${def.name} bursts in a volatile blast!`, tone: "bad" });
  }
  if (SUMMON_IDS.has(def.id)) return;
  // A boss pays its xp, gold and loot only on the first kill.
  if (def.boss && !firstBossKill) return;
  if (def.xp > 0) s.gainXp(Math.round(def.xp * s.difficultyScale.xp));
  const gold = Math.round(s.rng.int(def.goldMin, def.goldMax) * s.difficultyScale.gold);
  if (gold > 0) {
    s.save.gold += gold;
    s.emit({ type: "gold", amount: gold });
  }
  const drops: ItemStack[] = [];
  for (const entry of def.loot) {
    if (!s.rng.chance(entry.chance)) continue;
    const item = ITEMS[entry.itemId];
    const qty = s.rng.int(entry.min, entry.max);
    const instance = item && isEquippable(item) ? createItemInstance(entry.itemId, s.rng) : undefined;
    drops.push({ itemId: entry.itemId, qty: instance ? 1 : qty, instance });
  }
  for (const drop of drops) {
    const item = ITEMS[drop.itemId];
    if (!item) continue;
    s.loot.push({
      uid: s.nextUid("l"),
      itemId: drop.itemId,
      qty: drop.qty,
      x: monster.x + s.rng.between(-10, 10),
      y: monster.y + s.rng.between(-10, 10),
      ttl: 90,
      instance: drop.instance,
    });
    s.emit({ type: "loot", itemId: drop.itemId, qty: drop.qty, x: monster.x, y: monster.y });
  }
  s.recordKill(def.id);
}

export function hitMonster(s: GameSession, monster: MonsterInstance, raw: number, crit: boolean, damageType: DamageType, statuses: StatusInstance[]): void {
  if (monster.state === "dead") return;
  const def = getMonster(monster.defId);
  const mods = s.modifiers;
  const marked = monster.statuses.some((st) => st.kind === "mark");
  const maxHp = monster.maxHp ?? def.maxHp;
  const execute = monster.hp / maxHp <= 0.3 ? 1 + mods.execute / 100 : 1;
  const eliteDefense = monster.elite === "armored" ? 1.35 : 1;
  const mitigated = Math.max(1, Math.round(raw * (100 / (100 + def.defense * 2.5 * eliteDefense)) * (marked ? 1.2 : 1) * execute));
  monster.hp -= mitigated;
  if (mods.lifesteal > 0) s.healPlayer(mitigated * (mods.lifesteal / 100));
  s.lastCombat = s.elapsed;
  s.emit({
    type: "damage",
    target: "monster",
    uid: monster.uid,
    amount: mitigated,
    crit,
    x: monster.x,
    y: monster.y,
    damageType,
    source: s.hatchlingHitting ? "hatchling" : undefined,
  });
  for (const status of statuses) {
    if (status.kind === "stun") {
      const existing = monster.statuses.find((st) => st.kind === "stun");
      if (existing) existing.remaining = Math.max(existing.remaining, status.remaining);
      else monster.statuses.push({ ...status });
    } else if (status.kind === "slow" || status.kind === "mark") {
      const existing = monster.statuses.find((st) => st.kind === status.kind);
      if (existing) {
        existing.remaining = Math.max(existing.remaining, status.remaining);
        existing.value = Math.max(existing.value, status.value);
      } else monster.statuses.push({ ...status });
    } else {
      monster.statuses.push({ ...status });
    }
  }
  if (monster.hp <= 0) {
    if (mods.healOnKill > 0) s.healPlayer(s.stats.maxHp * (mods.healOnKill / 100));
    killMonster(s, monster);
  }
}
