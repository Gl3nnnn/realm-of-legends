import { ITEMS, GEM_ITEM_IDS, createItemInstance, isEquippable } from "../data/items";
import { getMonster, SUMMON_IDS } from "../data/monsters";
import { STORY_CHAPTERS, NG_PLUS_HOLLOW_ENDING } from "../data/story";
import { length } from "./geometry";
import { writeDiary } from "./diary";
import type { DamageType, ItemStack, MonsterInstance, StatusInstance } from "../types";
import type { GameSession } from "./GameSession";

// Take damage that already has the hero's own reduction applied; kills the hero when hp reaches 0.
export function damagePlayer(s: GameSession, raw: number, source: string, damageType: DamageType = "physical", sourceUid = ""): void {
  if (s.dead) return;
  if (s.invulnerable > 0) {
    if (s.perfectDodgeTimer > 0) {
      s.perfectDodgeTimer = 0;
      s.rewardPerfectDodge();
    }
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
  // Spiked Hide and Thorn Mail: whatever hits the hero takes part of it back.
  const thorns = s.fightSpecials.thorns;
  if (thorns > 0 && sourceUid) {
    const attacker = s.monsters.find((monster) => monster.uid === sourceUid);
    if (attacker && attacker.state !== "dead" && !attacker.invulnerable) {
      const back = Math.max(1, Math.round(mitigated * (thorns / 100)));
      s.hitMonster(attacker, back, false, "physical", []);
    }
  }
  // Whatever lands is remembered for the death screen, so a loss actually teaches something.
  s.rememberHit(source, damage);
  if (s.shield > 0) {
    const absorbed = Math.min(s.shield, damage);
    s.shield -= absorbed;
    damage -= absorbed;
    if (absorbed > 0) s.emit({ type: "log", text: `Shield absorbs ${Math.round(absorbed)} damage.`, tone: "info" });
  }
  s.save.hp = Math.max(0, s.save.hp - damage);
  s.lastCombat = s.elapsed;
  // Any real hit breaks the clean streak and the hit chain, so both always mean something.
  if (damage > 0) s.breakCombo();
  if (damage > 0) s.resetKillStreak();
  if (damage > 0) s.emit({ type: "damage", target: "player", amount: Math.round(damage), crit: false, x: s.save.x, y: s.save.y, damageType });
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
  // The training dummy cannot die: it swallows every hit and pays nothing for it.
  if (monster.invulnerable) return;
  monster.state = "dead";
  const def = getMonster(monster.defId);
  // Arena, Descent and gauntlet bosses are echoes, not story kills: they pay the mode, not the chapter.
  const modeKill = monster.uid.startsWith("arena_") || monster.uid.startsWith("descent_") || monster.uid.startsWith("gauntlet_");
  // A boss that was already defeated never comes back, so it has no respawn timer.
  monster.respawnTimer = def.respawn > 0 && !def.boss ? def.respawn : 0;
  s.emit({ type: "death", who: "monster", defId: def.id, x: monster.x, y: monster.y, boss: def.boss });
  // Every death passes through here, so this is where a mode hears about its own kill.
  s.onModeKill(monster);
  s.lastCombat = s.elapsed;
  const firstBossKill = !modeKill && def.boss && !s.save.defeatedBosses.includes(def.id);
  if (firstBossKill) {
    s.save.defeatedBosses.push(def.id);
    writeDiary(s.save, "boss", `Defeated ${def.name} in ${s.zone.name}.`);
    if (def.id === "bone_warden") s.openDungeonWing();
  }
  if (def.boss && !modeKill) advanceStoryFromBoss(s);
  // Lifetime counters, and the kill streak that a clean fight builds up.
  s.save.stats.monstersSlain += 1;
  if (def.boss && firstBossKill) s.save.stats.bossesSlain += 1;
  // Glutton and the Reaper's Toll relic: a kill gives a little health back.
  const healOnKill = s.fightSpecials.healOnKill;
  if (healOnKill > 0) s.healPlayer(s.stats.maxHp * (healOnKill / 100));
  const petStageBefore = s.petStage.stage;
  s.save.petXp += def.boss ? 60 : 6;
  // The companion grows in stages: say so the moment it changes, so the player sees it happen.
  if (s.petStage.stage > petStageBefore) {
    s.emit({ type: "pet-stage", stage: s.petStage.stage, name: s.petStage.name });
    writeDiary(s.save, "loot", `${s.save.companion?.name ?? "Your companion"} grew into a ${s.petStage.name}.`);
  }
  s.bumpKillStreak();
  s.recordBountyKill(def.id);
  if (monster.elite === "volatile" && length(s.save.x - monster.x, s.save.y - monster.y) <= 90) {
    damagePlayer(s, def.attack * s.difficultyScale.attack * 1.4, `${def.name} (Volatile)`, "physical", monster.uid);
    s.emit({ type: "log", text: `${def.name} bursts in a volatile blast!`, tone: "bad" });
  }
  if (SUMMON_IDS.has(def.id)) return;
  // A boss pays its xp, gold and loot only on the first kill.
  if (def.boss && !firstBossKill) return;
  const eliteReward = monster.elite ? 1.5 : 1;
  if (def.xp > 0) s.gainXp(Math.round(def.xp * s.difficultyScale.xp * eliteReward));
  const gold = Math.round(s.rng.int(def.goldMin, def.goldMax) * s.difficultyScale.gold * eliteReward);
  if (gold > 0) s.gainGold(gold);
  const drops: ItemStack[] = [];
  // Rain and ash make the beasts leave a little more behind, and a red sky leaves more still.
  const weatherDrop = (1 + s.weather.effects.dropBonus / 100) * (1 + s.bloodMoonEffects.dropBonus);
  for (const entry of def.loot) {
    const dropChance = (monster.elite ? Math.min(1, entry.chance * 1.5) : entry.chance) * weatherDrop;
    if (!s.rng.chance(dropChance)) continue;
    const item = ITEMS[entry.itemId];
    const qty = s.rng.int(entry.min, entry.max);
    const instance = item && isEquippable(item) ? createItemInstance(entry.itemId, s.rng) : undefined;
    drops.push({ itemId: entry.itemId, qty: instance ? 1 : qty, instance });
  }
  // A boss leaves one gem behind, so the sockets fill from real fights and not only from the shop.
  if (def.boss && !modeKill) {
    drops.push({ itemId: s.rng.pick(GEM_ITEM_IDS), qty: 1 });
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

export function hitMonster(
  s: GameSession,
  monster: MonsterInstance,
  raw: number,
  crit: boolean,
  damageType: DamageType,
  statuses: StatusInstance[],
  armorPiercing = false,
): void {
  if (monster.state === "dead") return;
  // A purse imp never takes the blow: it runs instead, which is the whole chase.
  if (monster.defId === "loot_imp" && monster.state !== "flee") {
    s.startImpFlee(monster);
    return;
  }
  const def = getMonster(monster.defId);
  const mods = s.modifiers;
  const specials = s.fightSpecials;
  // The dummy is a measuring stick: it takes the hit, reports it, and is never killed.
  // It does not build a combo, so a metered hit cannot charge an ultimate.
  if (monster.invulnerable) {
    const dummyHp = monster.maxHp ?? def.maxHp;
    const dummyMitigated = Math.max(1, Math.round(raw * (armorPiercing ? 1 : 100 / (100 + def.defense * 2.5))));
    monster.hp = dummyHp;
    s.recordDummyHit(dummyMitigated);
    s.emit({ type: "damage", target: "monster", uid: monster.uid, amount: dummyMitigated, crit, x: monster.x, y: monster.y, damageType });
    s.lastCombat = s.elapsed;
    return;
  }
  const marked = monster.statuses.some((st) => st.kind === "mark");
  const maxHp = monster.maxHp ?? def.maxHp;
  // Executioner, Bloodletter and Reaper's Toll all make a low-health foe the better target.
  const execute = (monster.hp / maxHp <= 0.3 ? 1 + mods.execute / 100 : 1) * (monster.hp / maxHp <= 0.3 ? 1 + specials.execute / 100 : 1);
  const eliteDefense = monster.elite === "armored" ? 1.35 : 1;
  const defenseMultiplier = armorPiercing ? 1 : 100 / (100 + def.defense * 2.5 * eliteDefense);
  const mitigated = Math.max(1, Math.round(raw * defenseMultiplier * (marked ? 1.2 : 1) * execute));
  // Every creature has one element it cannot stand, printed in the bestiary and on the boss card.
  const weakness = s.weaknessFactor(def.id, damageType);
  const weaknessDamage = weakness > 1 ? Math.max(1, Math.round(mitigated * weakness) - mitigated) : 0;
  if (weakness > 1) s.recordWeaknessHit(def.id);
  monster.hp -= weaknessDamage;
  if (weaknessDamage > 0) {
    s.emit({ type: "damage", target: "monster", uid: monster.uid, amount: weaknessDamage, crit: false, x: monster.x, y: monster.y, damageType });
  }
  // A landed hit builds the momentum chain, which is what a clean fight is made of.
  s.bumpCombo();
  monster.hp -= mitigated;
  // Hitting a burning or frozen thing with a different element wakes a reaction for a little extra.
  const reactionBonus = s.wakeReaction(monster, damageType);
  if (reactionBonus > 0) {
    const bonus = Math.max(1, Math.round(mitigated * reactionBonus));
    monster.hp -= bonus;
    s.emit({
      type: "damage",
      target: "monster",
      uid: monster.uid,
      amount: bonus,
      crit: false,
      x: monster.x,
      y: monster.y,
      damageType,
    });
  }
  if (mitigated > s.save.stats.bestHit) s.save.stats.bestHit = mitigated;
  if (mods.lifesteal > 0) s.healPlayer(mitigated * (mods.lifesteal / 100));
  // Leech and the Blood Pact relic: every hit gives a little back, so a long run holds together.
  if (specials.lifesteal > 0) s.healPlayer(mitigated * (specials.lifesteal / 100));
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
    if (status.kind === "stun" || status.kind === "slow" || status.kind === "mark" || status.kind === "poison" || status.kind === "burn") {
      const existing = monster.statuses.find((st) => st.kind === status.kind);
      if (existing) existing.remaining = Math.max(existing.remaining, status.remaining);
      if (existing) {
        if (status.kind !== "stun") existing.value = Math.max(existing.value, status.value);
      } else {
        monster.statuses.push({ ...status });
      }
    } else {
      monster.statuses.push({ ...status });
    }
  }
  if (monster.hp <= 0) {
    if (mods.healOnKill > 0) s.healPlayer(s.stats.maxHp * (mods.healOnKill / 100));
    killMonster(s, monster);
  }
}
