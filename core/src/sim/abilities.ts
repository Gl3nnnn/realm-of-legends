import type { AbilityDef, AbilityEffect, MonsterInstance, Vec2 } from "../types";
import { PLAYER_RADIUS } from "../constants";
import { dist2, length, normalize } from "./geometry";
import type { GameSession } from "./GameSession";
import { DAMAGE_COLORS } from "./GameSession";

/** Fires the ability's projectiles along the aim direction. */
export function castDirection(s: GameSession, ability: AbilityDef, dir: Vec2): void {
  const damageEffects = ability.effects.filter((e) => e.kind === "damage");
  if (damageEffects.length === 0) {
    castSelf(s, ability);
    return;
  }
  // Several arrows (like Multi-Shot) fan out in a tight spread instead of stacking.
  const count = damageEffects.length;
  const spreadStep = count > 1 ? 0.14 : 0;
  damageEffects.forEach((effect, index) => {
    const speed = effect.projectile?.speed ?? 430;
    const radius = effect.projectile?.radius ?? 6;
    const damageType = effect.damageType ?? "physical";
    const { damage, crit: rolledCrit } = s.effectDamage(effect);
    const crit = damage > 0 && rolledCrit;
    const angle = (index - (count - 1) / 2) * spreadStep;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const aimX = dir.x * cos - dir.y * sin;
    const aimY = dir.x * sin + dir.y * cos;
    s.projectiles.push({
      uid: s.nextUid("p"),
      abilityId: ability.id,
      abilityName: ability.name,
      x: s.save.x + aimX * 14,
      y: s.save.y + aimY * 14,
      dirX: aimX,
      dirY: aimY,
      speed,
      ttl: Math.max(0.5, ability.range / speed),
      radius,
      damage,
      crit: crit ? 1 : 0,
      damageType,
      color: DAMAGE_COLORS[damageType],
      statuses: s.statusesFromEffects(ability.effects, damageType),
      owner: "player",
    });
  });
}

/** Hits the monsters inside the area around a chosen point. */
export function castPoint(s: GameSession, ability: AbilityDef, point: Vec2): void {
  const radius = ability.effects.find((e) => e.radius)?.radius ?? 40;
  const targets = s.monsters.filter((m) => m.state !== "dead" && dist2(m.x, m.y, point.x, point.y) <= (radius + 12) ** 2);
  if (targets.length === 0) {
    s.emit({ type: "log", text: `${ability.name} missed: nothing was in the area.`, tone: "info" });
  }
  applyEffects(s, ability, targets, point);
}

/** Affects the monsters around the hero, or heals and buffs the hero. */
export function castSelf(s: GameSession, ability: AbilityDef): void {
  const radius = ability.effects.find((e) => e.radius)?.radius ?? 72;
  const damageEffects = ability.effects.some((e) => e.kind === "damage");
  const targets = damageEffects
    ? s.monsters.filter((m) => m.state !== "dead" && dist2(m.x, m.y, s.save.x, s.save.y) <= (radius + 12) ** 2)
    : [];
  applyEffects(s, ability, targets, { x: s.save.x, y: s.save.y });
}

/** Hits the closest enemy in the aim direction, plus any enemies near it. */
export function castMelee(s: GameSession, ability: AbilityDef, dir: Vec2): void {
  const candidates = s.monsters
    .filter((m) => m.state !== "dead")
    .map((m) => ({ m, d: length(m.x - s.save.x, m.y - s.save.y), dot: normalize(m.x - s.save.x, m.y - s.save.y).x * dir.x + normalize(m.x - s.save.x, m.y - s.save.y).y * dir.y }))
    .filter((entry) => entry.d <= ability.range + 14)
    .sort((a, b) => b.dot - a.dot || a.d - b.d);
  const primary = candidates[0]?.m;
  const radius = ability.effects.find((e) => e.radius)?.radius;
  const targets = primary
    ? s.monsters.filter((m) => m.state !== "dead" && (m === primary || (radius && dist2(m.x, m.y, primary.x, primary.y) <= radius * radius)))
    : [];
  if (targets.length === 0) {
    if (ability.targeting === "melee" && dir.x !== 0) s.facing = dir.x > 0 ? "right" : "left";
    s.emit({ type: "log", text: `${ability.name} missed: no enemy within reach.`, tone: "info" });
  }
  applyEffects(s, ability, targets, primary ? { x: primary.x, y: primary.y } : { x: s.save.x + dir.x * 30, y: s.save.y + dir.y * 30 });
}

/** Applies each effect of an ability in order. */
export function applyEffects(s: GameSession, ability: AbilityDef, targets: MonsterInstance[], center: Vec2): void {
  for (const effect of ability.effects) {
    if (effect.kind === "damage") {
      const { damage, crit } = s.effectDamage(effect);
      const statuses = s.statusesFromEffects(ability.effects, effect.damageType ?? "physical");
      if (targets.length === 0) continue;
      for (const target of targets) s.hitMonster(target, damage, crit, effect.damageType ?? "physical", statuses);
    } else if (effect.kind === "heal") {
      const amount = (effect.amount ?? 0) + (effect.scaling ?? 0) * s.stats.attack;
      s.healPlayer(amount);
    } else if (effect.kind === "buff" && effect.stat && effect.duration) {
      const existing = s.buffs.find((b) => b.name === (effect.name ?? ability.name));
      if (existing) {
        existing.remaining = Math.max(existing.remaining, effect.duration);
        existing.percent = Math.max(existing.percent, effect.percent ?? 0);
      } else {
        s.buffs.push({
          name: effect.name ?? ability.name,
          stat: effect.stat,
          percent: effect.percent ?? 20,
          remaining: effect.duration,
        });
      }
      s.emit({ type: "log", text: `${effect.name ?? ability.name} activated.`, tone: "good" });
    } else if (effect.kind === "shield") {
      s.shield += effect.amount ?? 30;
      s.emit({ type: "log", text: `A shield absorbs incoming damage.`, tone: "good" });
    } else if (effect.kind === "summon") {
      summon(s, effect);
    } else if (effect.kind === "knockback") {
      // Pushes each target away from the centre of the hit by its distance.
      const push = effect.amount ?? 40;
      for (const target of targets) {
        const away = normalize(target.x - center.x, target.y - center.y);
        target.x += away.x * push;
        target.y += away.y * push;
      }
    } else if (effect.kind === "dash") {
      dash(s, effect.amount ?? 80);
    } else if (effect.kind === "trap") {
      placeTrap(s, effect, center);
    } else if (effect.kind === "dot" || effect.kind === "slow" || effect.kind === "stun" || effect.kind === "mark") {
      if (targets.length === 0) continue;
      const statuses = s.statusesFromEffects([effect], effect.damageType ?? "physical");
      for (const target of targets) {
        for (const status of statuses) {
          const existing = target.statuses.find((x) => x.kind === status.kind);
          if (existing) {
            existing.remaining = Math.max(existing.remaining, status.remaining);
            existing.value = Math.max(existing.value, status.value);
          } else target.statuses.push({ ...status });
        }
      }
    }
  }
}

/** Moves the hero forward in the aim direction, stopping at walls. */
export function dash(s: GameSession, distance: number): void {
  const dir = s.lastAim;
  const steps = 14;
  const step = distance / steps;
  for (let i = 0; i < steps; i += 1) {
    if (s.isBlockedAt(s.save.x + dir.x * step, s.save.y + dir.y * step, PLAYER_RADIUS)) break;
    s.save.x += dir.x * step;
    s.save.y += dir.y * step;
  }
}

/** Calls companions that fight beside the hero for a while. */
export function summon(s: GameSession, effect: AbilityEffect): void {
  const count = effect.summonCount ?? 1;
  const kind = effect.summonId === "skeleton_minion" ? "skeleton" : effect.summonId === "spirit_wolf" ? "wolf" : "familiar";
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count + s.rng.next();
    s.pets.push({
      uid: s.nextUid("pet"),
      kind,
      x: s.save.x + Math.cos(angle) * 28,
      y: s.save.y + Math.sin(angle) * 28,
      hp: 100,
      ttl: effect.summonDuration ?? 15,
      attackTimer: 0,
      damage: Math.round((8 + s.save.level * 2 + s.stats.attack * 0.4) * 10) / 10,
    });
  }
  s.emit({ type: "log", text: `${count > 1 ? count + " companions answer" : "A companion answers"} your call.`, tone: "good" });
}

/** Sets a trap on the ground that springs when a monster steps on it. */
export function placeTrap(s: GameSession, effect: AbilityEffect, center: Vec2): void {
  s.traps.push({
    uid: s.nextUid("trap"),
    x: center.x,
    y: center.y,
    radius: effect.radius ?? 40,
    damage: Math.round((effect.amount ?? 20) + (effect.scaling ?? 0) * s.stats.attack),
    armed: true,
    rearmTimer: 0,
  });
  s.emit({ type: "log", text: "A trap is set.", tone: "info" });
}
