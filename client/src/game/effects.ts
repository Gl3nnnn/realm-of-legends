import Phaser from "phaser";
import { MONSTERS, type ProjectileInstance, type SimEvent } from "@realm/core";
import { loadPreferences, type GamePreferences } from "../ui/preferences";
import { projectileStyle, resolveAbilityVfx, type VfxDescriptor } from "./vfx";
import type { WorldScene } from "./WorldScene";

/** Draws portal glows, traps, telegraphs, projectiles and monster health bars for one frame. */
export function renderFloorEffects(scene: WorldScene, time: number): void {
  const preferences = loadPreferences();
  const g = scene.floorFx;
  g.clear();
  for (const portal of scene.session.zone.portals) {
    g.fillStyle(preferences.highContrast ? 0xffffff : 0xd9b45a, preferences.highContrast ? 0.12 : 0.05);
    const pulse = preferences.reducedMotion ? 0 : Math.sin(time / 350) * 3;
    const x = portal.x + portal.w / 2;
    const y = portal.y + portal.h / 2;
    g.fillCircle(x, y, 20 + pulse);
    if (preferences.highContrast) {
      g.lineStyle(2, 0xffffff, 0.9);
      g.strokeCircle(x, y, 23 + pulse);
    }
  }
  for (const trap of scene.session.traps) {
    if (!trap.armed) continue;
    const color = trap.kind === "snare" ? 0x78d18a : 0xff7a4a;
    g.fillStyle(preferences.highContrast ? 0xffffff : color, preferences.highContrast ? 0.14 : 0.08);
    g.fillCircle(trap.x, trap.y, trap.radius);
    g.lineStyle(preferences.highContrast ? 2 : 1, preferences.highContrast ? 0xffffff : trap.kind === "snare" ? 0xa2f0ae : 0xff9a6a, 0.75);
    g.strokeCircle(trap.x, trap.y, trap.radius);
    if (preferences.highContrast) g.strokeCircle(trap.x, trap.y, Math.max(4, trap.radius - 5));
  }
  for (const telegraph of scene.session.telegraphs) {
    const progress = 1 - Math.max(0, telegraph.remaining) / Math.max(0.001, telegraph.total);
    const fillColor = telegraph.kind === "boss" ? 0xd94a4a : telegraph.kind === "enemy" ? 0x8c74db : 0xe08a3a;
    const shape = telegraph.shape ?? "ring";
    const angle = telegraph.angle ?? 0;
    g.fillStyle(fillColor, 0.1 + progress * 0.2);
    const highContrast = preferences.highContrast;
    g.lineStyle(highContrast ? 3 : 2, highContrast ? 0xffffff : telegraph.kind === "enemy" ? 0xb9a6ff : 0xff6a6a, 0.95);
    if (shape === "line") {
      const half = 14;
      const len = telegraph.radius;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const ox = telegraph.x;
      const oy = telegraph.y;
      const px = -sin * half;
      const py = cos * half;
      const corners = [
        new Phaser.Math.Vector2(ox + px, oy + py),
        new Phaser.Math.Vector2(ox + cos * len + px, oy + sin * len + py),
        new Phaser.Math.Vector2(ox + cos * len - px, oy + sin * len - py),
        new Phaser.Math.Vector2(ox - px, oy - py),
      ];
      g.fillPoints(corners, true);
      g.strokePoints(corners, true);
    } else if (shape === "cone") {
      const spread = Math.PI / 2;
      g.beginPath();
      g.moveTo(telegraph.x, telegraph.y);
      g.arc(telegraph.x, telegraph.y, telegraph.radius, angle - spread / 2, angle + spread / 2, false);
      g.closePath();
      g.fillPath();
      g.strokePath();
    } else if (shape === "spot") {
      g.fillCircle(telegraph.x, telegraph.y, telegraph.radius);
      g.strokeCircle(telegraph.x, telegraph.y, telegraph.radius);
      g.lineStyle(highContrast ? 3 : 2, 0xffffff, 0.9);
      g.lineBetween(telegraph.x - 7, telegraph.y, telegraph.x + 7, telegraph.y);
      g.lineBetween(telegraph.x, telegraph.y - 7, telegraph.x, telegraph.y + 7);
    } else {
      g.fillCircle(telegraph.x, telegraph.y, telegraph.radius);
      g.strokeCircle(telegraph.x, telegraph.y, telegraph.radius);
      g.lineStyle(1, highContrast ? 0xffffff : 0xffd0a0, 0.75);
      g.strokeCircle(telegraph.x, telegraph.y, Math.max(4, telegraph.radius * 0.65));
    }
    g.lineStyle(3, 0xffd0a0, 0.5);
    g.beginPath();
    g.arc(telegraph.x, telegraph.y, telegraph.radius - 2, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
    g.strokePath();
  }
  for (const projectile of scene.session.projectiles) {
    drawProjectile(scene, g, projectile);
  }

  const targetFx = scene.interactionFx;
  targetFx.clear();
  const interactable = scene.session.findInteractable();
  if (interactable) {
    let position: { x: number; y: number } | undefined;
    if (interactable.kind === "npc") {
      position = scene.session.npcById(interactable.id);
    } else if (interactable.kind === "portal") {
      const portal = scene.session.portalById(interactable.id);
      if (portal) position = { x: portal.x + portal.w / 2, y: portal.y + portal.h / 2 };
    } else if (interactable.kind === "chest") {
      position = scene.session.chestById(interactable.id);
    } else {
      position = scene.session.gatherById(interactable.id);
    }
    if (position) {
      const { x, y } = position;
      const color = preferences.highContrast ? 0xffffff : 0xffe26b;
      targetFx.setDepth(y + 5);
      targetFx.lineStyle(2, color, 0.95);
      targetFx.strokeCircle(x, y, 18);
      targetFx.lineBetween(x - 24, y, x - 12, y);
      targetFx.lineBetween(x + 12, y, x + 24, y);
      targetFx.lineBetween(x, y - 24, x, y - 12);
      targetFx.lineBetween(x, y + 12, x, y + 24);
    }
  }

  const bars = scene.barFx;
  bars.clear();
  for (const monster of scene.session.monsters) {
    if (monster.state === "dead") continue;
    const def = MONSTERS[monster.defId];
    if (!def || monster.hp >= def.maxHp) continue;
    const boss = def.boss;
    const width = boss ? 64 : 26;
    const y = monster.y - (boss ? 44 : 24);
    bars.fillStyle(0x08060c, 0.95);
    bars.fillRect(monster.x - width / 2 - 1, y - 1, width + 2, boss ? 5 : 4);
    if (preferences.highContrast) {
      bars.lineStyle(1, 0xffffff, 0.95);
      bars.strokeRect(monster.x - width / 2 - 1, y - 1, width + 2, boss ? 5 : 4);
    }
    bars.fillStyle(boss ? 0xd95454 : 0xc04a4a, 1);
    bars.fillRect(monster.x - width / 2, y, width * Math.max(0, monster.hp / def.maxHp), boss ? 3 : 2);
  }
}

/** Short body motion on cast: a lunge for melee classes, a raised-arm pulse for casters. */
export function castMotion(scene: WorldScene, classId: string, y: number, angle: number, preferences: GamePreferences): void {
  if (preferences.reducedMotion || !scene.player) return;
  const sprite = scene.player;
  const casters = ["mage", "priest", "necromancer", "druid", "summoner", "spellblade"];
  scene.tweens.killTweensOf(sprite);
  if (casters.includes(classId)) {
    // Raised-arm pulse: a quick lift and settle, held a little longer.
    scene.tweens.add({
      targets: sprite,
      y: y - 6,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 140,
      yoyo: true,
      hold: 220,
      ease: "Sine.easeOut",
    });
  } else {
    // Melee lunge: a short step toward the target and back.
    const dx = Math.cos(angle) * 6;
    const dy = Math.sin(angle) * 6;
    scene.tweens.add({
      targets: sprite,
      x: sprite.x + dx,
      y: sprite.y + dy,
      duration: 90,
      yoyo: true,
      ease: "Quad.easeOut",
    });
  }
}

export function floatText(scene: WorldScene, x: number, y: number, text: string, color: string, size: number): void {
  const label = scene.floatPool.pop() ?? scene.add
    .text(0, 0, "", {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: `${size}px`,
      color,
      stroke: "#000000",
      strokeThickness: 3,
    })
    .setOrigin(0.5, 1)
    .setDepth(9400);
  scene.tweens.killTweensOf(label);
  label
    .setText(text)
    .setColor(color)
    .setFontSize(size)
    .setPosition(x, y)
    .setAlpha(1)
    .setVisible(true);
  scene.tweens.add({
    targets: label,
    y: y - 20,
    alpha: 0,
    duration: 720,
    ease: "Cubic.easeOut",
    onComplete: () => {
      label.setVisible(false);
      scene.floatPool.push(label);
    },
  });
}

export function playCastVfx(scene: WorldScene, event: Extract<SimEvent, { type: "cast" }>, preferences: GamePreferences): void {
  const session = scene.session;
  const ability =
    event.abilityId === "basic"
      ? session.classInfo.basic
      : session.classInfo.abilities.find((entry) => entry.id === event.abilityId);
  if (!ability) return;
  const vfx: VfxDescriptor = resolveAbilityVfx(session.save.classId, ability, event.color);
  const color = hexColor(vfx.color);
  const accent = hexColor(vfx.accent);
  const angle = Math.atan2(event.targetY - event.y, event.targetX - event.x);
  if (!preferences.reducedMotion && preferences.screenShake && vfx.shake > 0) {
    scene.cameras.main.shake(80, vfx.shake);
  }
  if (session.save.classId === "ranger" && event.abilityId === "basic") {
    bowDrawFx(scene, event.x, event.y, angle, color, vfx.duration);
  }
  castMotion(scene, session.save.classId, event.y, angle, preferences);
  switch (vfx.style) {
    case "slash":
      arcFx(scene, event.x, event.y, angle, color, 34, 4, 0.95, vfx.duration);
      burst(scene, event.targetX, event.targetY, color, 3, 0.6);
      break;
    case "cleave":
      arcFx(scene, event.x, event.y, angle, color, 50, 6, 1.35, vfx.duration);
      arcFx(scene, event.x, event.y, angle, 0xffffff, 42, 2, 1.1, vfx.duration - 40);
      burst(scene, event.targetX, event.targetY, color, 6, 0.9);
      break;
    case "thrust":
      thrustFx(scene, event.x, event.y, event.targetX, event.targetY, color, accent, vfx.duration);
      break;
    case "bash":
      ringFx(scene, event.targetX, event.targetY, 20, color, 3, vfx.duration);
      arcFx(scene, event.x, event.y, angle, accent, 24, 5, 1.1, vfx.duration);
      break;
    case "flurry":
      flurryFx(scene, event.targetX, event.targetY, color, angle, vfx.duration);
      break;
    case "fist":
      ringFx(scene, event.targetX, event.targetY, 14, color, 2, vfx.duration);
      burst(scene, event.targetX, event.targetY, color, 5, 0.8);
      break;
    case "arrow":
      arcFx(scene, event.x, event.y, angle, accent, 20, 3, 1.2, 180);
      burst(scene, event.x + Math.cos(angle) * 14, event.y + Math.sin(angle) * 14, color, 2, 0.3);
      break;
    case "arrowVolley":
      for (let i = -1; i <= 1; i += 1) {
        arcFx(scene, event.x, event.y, angle + i * 0.16, accent, 22, 2, 1.1, 220);
      }
      break;
    case "gun":
    case "gunVolley":
      muzzleFx(scene, event.x, event.y, angle, color, vfx.style === "gunVolley" ? 3 : 1);
      break;
    case "bolt":
      orbFx(scene, event.x, event.y, color, accent, 10);
      burst(scene, event.x + Math.cos(angle) * 16, event.y + Math.sin(angle) * 16, color, 3, 0.35);
      break;
    case "beam":
      beamFx(scene, event.x, event.y, event.targetX, event.targetY, color, vfx.duration);
      break;
    case "nova":
      novaFx(scene, event.x, event.y, vfx.radius, color, accent, vfx.duration);
      break;
    case "rune":
    case "trap":
      runeFx(scene, event.targetX, event.targetY, vfx.radius, color, accent, vfx.duration);
      break;
    case "meteor":
      meteorFx(scene, event.targetX, event.targetY, vfx.radius, color, vfx.duration);
      break;
    case "rain":
      rainFx(scene, event.targetX, event.targetY, vfx.radius, color, vfx.duration);
      break;
    case "summon":
      summonFx(scene, event.x, event.y, color, accent, vfx.duration);
      break;
    case "dash":
      dashFx(scene, event.x, event.y, event.targetX, event.targetY, color, accent, vfx.duration);
      break;
    case "heal":
      healSparkle(scene, event.x, event.y);
      ringFx(scene, event.x, event.y, 24, color, 2, vfx.duration);
      break;
    case "shield":
      bubbleFx(scene, event.x, event.y, color, accent, vfx.duration);
      break;
    case "buff":
      buffFx(scene, event.x, event.y, color, accent, vfx.duration);
      break;
    case "smoke":
      smokeFx(scene, event.x, event.y, color, vfx.duration);
      break;
    case "mark":
      markFx(scene, event.targetX, event.targetY, color, accent, vfx.duration);
      break;
    case "cone":
      coneFx(scene, event.x, event.y, event.targetX, event.targetY, color, vfx.duration);
      break;
    case "chain":
      chainFx(scene, event.x, event.y, event.targetX, event.targetY, color, vfx.duration);
      break;
    default:
      burst(scene, event.x, event.y, color, 5, 0.8);
      break;
  }
  // Extra sparks for ultimates and the six strongest normal skills, in the skill's own colour.
  const sparkSkills = ["dragon_breath", "infernal_strike", "holy_nova", "elemental_burst", "meteor", "ground_slam"];
  if (ability.signature === true || sparkSkills.includes(ability.id)) {
    burst(scene, event.targetX, event.targetY, color, 10, 1.6);
  }
}

export function drawProjectile(scene: WorldScene, g: Phaser.GameObjects.Graphics, projectile: ProjectileInstance): void {
  const style = projectileStyle(projectile.abilityId, scene.session.save.classId);
  const color = hexColor(projectile.color);
  const length = Math.hypot(projectile.dirX, projectile.dirY) || 1;
  const dx = projectile.dirX / length;
  const dy = projectile.dirY / length;
  const tail = 14 + projectile.radius * 1.5;
  const tx = projectile.x - dx * tail;
  const ty = projectile.y - dy * tail;
  if (style === "arrow" || style === "arrowVolley") {
    g.lineStyle(2, color, 0.35);
    g.lineBetween(tx, ty, projectile.x, projectile.y);
    g.lineStyle(1, 0xffffff, 0.9);
    g.lineBetween(tx, ty, projectile.x, projectile.y);
    g.fillStyle(color, 1);
    g.fillTriangle(
      projectile.x + dx * 6,
      projectile.y + dy * 6,
      projectile.x - dy * 3,
      projectile.y + dx * 3,
      projectile.x + dy * 3,
      projectile.y - dx * 3,
    );
  } else if (style === "gun" || style === "gunVolley") {
    g.lineStyle(1, color, 0.55);
    g.lineBetween(projectile.x - dx * 24, projectile.y - dy * 24, projectile.x, projectile.y);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(projectile.x, projectile.y, Math.max(1.5, projectile.radius * 0.5));
  } else if (style === "thrust") {
    g.lineStyle(3, color, 0.8);
    g.lineBetween(tx, ty, projectile.x, projectile.y);
    g.lineStyle(1, 0xffffff, 0.9);
    g.lineBetween(tx, ty, projectile.x, projectile.y);
    g.fillStyle(color, 1);
    g.fillTriangle(
      projectile.x + dx * 7,
      projectile.y + dy * 7,
      projectile.x - dy * 4,
      projectile.y + dx * 4,
      projectile.x + dy * 4,
      projectile.y - dx * 4,
    );
  } else {
    g.fillStyle(color, 0.16);
    g.fillCircle(projectile.x, projectile.y, projectile.radius + 7);
    g.lineStyle(2, color, 0.45);
    g.lineBetween(tx, ty, projectile.x, projectile.y);
    g.fillStyle(color, 1);
    g.fillCircle(projectile.x, projectile.y, projectile.radius);
    g.fillStyle(0xffffff, 0.8);
    g.fillCircle(projectile.x - dx * 2, projectile.y - dy * 2, Math.max(1, projectile.radius * 0.4));
  }
}

export function bowDrawFx(scene: WorldScene, x: number, y: number, angle: number, color: number, duration: number): void {
  // A bow arc in front of the Ranger that bends back as it is drawn,
  // then a thin arrow that flies out along the aim line.
  const bow = scene.add.graphics().setPosition(x, y).setDepth(y + 3);
  bow.rotation = angle;
  bow.lineStyle(3, color, 1);
  bow.beginPath();
  bow.arc(0, 0, 18, -Math.PI / 2.6, Math.PI / 2.6, false);
  bow.strokePath();
  bow.lineStyle(1, 0xffffff, 0.7);
  bow.beginPath();
  bow.moveTo(18 * Math.cos(-Math.PI / 2.6), 18 * Math.sin(-Math.PI / 2.6));
  bow.lineTo(4, 0);
  bow.lineTo(18 * Math.cos(Math.PI / 2.6), 18 * Math.sin(Math.PI / 2.6));
  bow.strokePath();
  scene.tweens.add({
    targets: bow,
    alpha: 0,
    duration: Math.max(120, duration * 0.6),
    onComplete: () => bow.destroy(),
  });

  const arrow = scene.add.graphics().setPosition(x, y).setDepth(y + 4);
  arrow.rotation = angle;
  arrow.lineStyle(2, color, 1);
  arrow.beginPath();
  arrow.moveTo(0, 0);
  arrow.lineTo(26, 0);
  arrow.strokePath();
  scene.tweens.add({
    targets: arrow,
    x: x + Math.cos(angle) * 60,
    y: y + Math.sin(angle) * 60,
    alpha: 0,
    duration: Math.max(160, duration),
    onComplete: () => arrow.destroy(),
  });
}

export function arcFx(scene: WorldScene, x: number, y: number, angle: number, color: number, radius: number, width: number, spread: number, duration: number): void {
  const g = scene.add.graphics().setPosition(x, y).setDepth(y + 3);
  g.rotation = angle;
  g.lineStyle(width, color, 0.9);
  g.beginPath();
  g.arc(0, 0, radius, -spread, spread);
  g.strokePath();
  g.lineStyle(Math.max(1, width - 2), 0xffffff, 0.75);
  g.beginPath();
  g.arc(0, 0, radius - 2, -spread * 0.8, spread * 0.8);
  g.strokePath();
  scene.tweens.add({
    targets: g,
    alpha: 0,
    scaleX: 1.25,
    scaleY: 1.25,
    duration,
    ease: "Cubic.easeOut",
    onComplete: () => g.destroy(),
  });
}

export function lineFx(scene: WorldScene, x1: number, y1: number, x2: number, y2: number, color: number, width: number, alpha: number, duration: number): void {
  const g = scene.add.graphics().setDepth(Math.max(y1, y2) + 3);
  g.lineStyle(width, color, alpha);
  g.lineBetween(x1, y1, x2, y2);
  scene.tweens.add({ targets: g, alpha: 0, duration, ease: "Cubic.easeOut", onComplete: () => g.destroy() });
}

export function ringFx(scene: WorldScene, x: number, y: number, radius: number, color: number, width: number, duration: number): void {
  const ring = scene.add.circle(x, y, radius, color, 0.08).setDepth(y + 3);
  ring.setStrokeStyle(width, color, 0.9);
  scene.tweens.add({
    targets: ring,
    scale: 1.45,
    alpha: 0,
    duration,
    ease: "Cubic.easeOut",
    onComplete: () => ring.destroy(),
  });
}

export function thrustFx(scene: WorldScene, x: number, y: number, tx: number, ty: number, color: number, accent: number, duration: number): void {
  const angle = Math.atan2(ty - y, tx - x);
  const sx = x + Math.cos(angle) * 10;
  const sy = y + Math.sin(angle) * 10;
  lineFx(scene, sx, sy, tx, ty, color, 5, 0.8, duration);
  lineFx(scene, sx, sy, tx, ty, 0xffffff, 2, 0.95, duration - 40);
  burst(scene, tx, ty, accent, 4, 0.6);
}

export function flurryFx(scene: WorldScene, x: number, y: number, color: number, angle: number, duration: number): void {
  for (let i = 0; i < 3; i += 1) {
    scene.time.delayedCall(i * 55, () => {
      arcFx(scene, x, y, angle + i * 2.1, color, 20, 3, 1.2, 180);
    });
  }
  burst(scene, x, y, color, 5, 0.7);
  ringFx(scene, x, y, 18, color, 2, duration);
}

export function muzzleFx(scene: WorldScene, x: number, y: number, angle: number, color: number, count: number): void {
  for (let i = 0; i < count; i += 1) {
    const spread = (i - (count - 1) / 2) * 0.08;
    const a = angle + spread;
    const mx = x + Math.cos(a) * 26;
    const my = y + Math.sin(a) * 26;
    lineFx(scene, x, y, mx, my, color, 2, 0.9, 120);
    burst(scene, mx, my, color, 3, 0.35);
  }
}

export function orbFx(scene: WorldScene, x: number, y: number, color: number, accent: number, radius: number): void {
  const orb = scene.add.circle(x, y, radius, color, 0.35).setDepth(y + 4);
  orb.setStrokeStyle(2, accent, 0.9);
  scene.tweens.add({
    targets: orb,
    scale: 1.7,
    alpha: 0,
    duration: 260,
    ease: "Cubic.easeOut",
    onComplete: () => orb.destroy(),
  });
}

export function beamFx(scene: WorldScene, x1: number, y1: number, x2: number, y2: number, color: number, duration: number): void {
  lineFx(scene, x1, y1, x2, y2, color, 7, 0.25, duration);
  lineFx(scene, x1, y1, x2, y2, color, 3, 0.85, duration);
  lineFx(scene, x1, y1, x2, y2, 0xffffff, 1, 0.9, duration - 60);
  burst(scene, x2, y2, color, 5, 0.7);
}

export function novaFx(scene: WorldScene, x: number, y: number, radius: number, color: number, accent: number, duration: number): void {
  ringFx(scene, x, y, radius, color, 4, duration);
  ringFx(scene, x, y, radius * 0.6, accent, 2, duration - 80);
  const flash = scene.add.circle(x, y, radius * 0.45, color, 0.22).setDepth(y + 2);
  scene.tweens.add({
    targets: flash,
    scale: 2.2,
    alpha: 0,
    duration,
    ease: "Cubic.easeOut",
    onComplete: () => flash.destroy(),
  });
  burst(scene, x, y, color, 10, 1.4);
}

export function runeFx(scene: WorldScene, x: number, y: number, radius: number, color: number, accent: number, duration: number): void {
  const g = scene.add.graphics().setPosition(x, y).setDepth(y + 2);
  g.lineStyle(2, color, 0.8);
  g.strokeCircle(0, 0, radius);
  g.lineStyle(1, accent, 0.7);
  g.strokeCircle(0, 0, radius * 0.68);
  for (let i = 0; i < 4; i += 1) {
    const a = (Math.PI / 2) * i + Math.PI / 4;
    g.lineBetween(Math.cos(a) * radius * 0.25, Math.sin(a) * radius * 0.25, Math.cos(a) * radius * 0.9, Math.sin(a) * radius * 0.9);
  }
  scene.tweens.add({
    targets: g,
    angle: 45,
    alpha: 0,
    scaleX: 1.2,
    scaleY: 1.2,
    duration,
    ease: "Cubic.easeOut",
    onComplete: () => g.destroy(),
  });
  burst(scene, x, y, color, 4, 0.5);
}

export function meteorFx(scene: WorldScene, x: number, y: number, radius: number, color: number, duration: number): void {
  lineFx(scene, x - 16, y - 120, x, y, color, 8, 0.35, 180);
  lineFx(scene, x - 16, y - 120, x, y, 0xffffff, 2, 0.8, 160);
  scene.time.delayedCall(120, () => {
    ringFx(scene, x, y, radius, color, 5, duration);
    burst(scene, x, y, color, 14, 1.6);
  });
}

export function rainFx(scene: WorldScene, x: number, y: number, radius: number, color: number, duration: number): void {
  ringFx(scene, x, y, radius, color, 2, duration);
  for (let i = 0; i < 7; i += 1) {
    const ox = (Math.random() * 2 - 1) * radius * 0.8;
    const oy = (Math.random() * 2 - 1) * radius * 0.6;
    scene.time.delayedCall(i * 60, () => {
      lineFx(scene, x + ox, y + oy - 26, x + ox, y + oy, color, 2, 0.75, 180);
    });
  }
}

export function summonFx(scene: WorldScene, x: number, y: number, color: number, accent: number, duration: number): void {
  runeFx(scene, x, y, 28, color, accent, duration);
  for (let i = 0; i < 8; i += 1) {
    const a = (Math.PI * 2 * i) / 8;
    const dot = scene.add.circle(x + Math.cos(a) * 18, y + Math.sin(a) * 10, 2, color, 0.9).setDepth(y + 4);
    scene.tweens.add({
      targets: dot,
      y: y - 28 - Math.random() * 18,
      alpha: 0,
      duration: 420 + i * 30,
      ease: "Cubic.easeOut",
      onComplete: () => dot.destroy(),
    });
  }
}

export function dashFx(scene: WorldScene, x1: number, y1: number, x2: number, y2: number, color: number, accent: number, duration: number): void {
  lineFx(scene, x1, y1, x2, y2, accent, 6, 0.25, duration);
  for (let i = 1; i <= 3; i += 1) {
    const t = i / 4;
    const ghost = scene.add.circle(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, 7, color, 0.18).setDepth(y1 + 2);
    scene.tweens.add({ targets: ghost, alpha: 0, scale: 1.6, duration: 220 + i * 40, onComplete: () => ghost.destroy() });
  }
  burst(scene, x2, y2, color, 4, 0.5);
}

export function healSparkle(scene: WorldScene, x: number, y: number): void {
  for (let i = 0; i < 6; i += 1) {
    const dot = scene.add.circle(x + (Math.random() * 2 - 1) * 18, y + 6, 1.8, 0x8ef0a0, 0.9).setDepth(y + 5);
    scene.tweens.add({
      targets: dot,
      y: y - 26 - Math.random() * 18,
      alpha: 0,
      duration: 480 + Math.random() * 220,
      ease: "Cubic.easeOut",
      onComplete: () => dot.destroy(),
    });
  }
}

export function bubbleFx(scene: WorldScene, x: number, y: number, color: number, accent: number, duration: number): void {
  const bubble = scene.add.circle(x, y, 26, color, 0.1).setDepth(y + 3);
  bubble.setStrokeStyle(3, accent, 0.8);
  scene.tweens.add({
    targets: bubble,
    scale: 1.25,
    alpha: 0,
    duration,
    ease: "Cubic.easeOut",
    onComplete: () => bubble.destroy(),
  });
  ringFx(scene, x, y, 18, color, 2, duration - 80);
}

export function buffFx(scene: WorldScene, x: number, y: number, color: number, accent: number, duration: number): void {
  ringFx(scene, x, y, 22, color, 3, duration);
  for (let i = 0; i < 5; i += 1) {
    const dot = scene.add.circle(x + (Math.random() * 2 - 1) * 16, y + 8, 2, accent, 0.9).setDepth(y + 4);
    scene.tweens.add({
      targets: dot,
      y: y - 24 - Math.random() * 16,
      alpha: 0,
      duration: 450 + i * 50,
      ease: "Cubic.easeOut",
      onComplete: () => dot.destroy(),
    });
  }
}

export function smokeFx(scene: WorldScene, x: number, y: number, color: number, duration: number): void {
  for (let i = 0; i < 5; i += 1) {
    const puff = scene.add.circle(x + (Math.random() * 2 - 1) * 12, y + (Math.random() * 2 - 1) * 8, 6 + Math.random() * 5, color, 0.28).setDepth(y + 3);
    scene.tweens.add({
      targets: puff,
      scale: 2.4,
      alpha: 0,
      x: puff.x + (Math.random() * 2 - 1) * 20,
      y: puff.y - 12 - Math.random() * 12,
      duration: duration + i * 40,
      ease: "Cubic.easeOut",
      onComplete: () => puff.destroy(),
    });
  }
}

export function markFx(scene: WorldScene, x: number, y: number, color: number, accent: number, duration: number): void {
  const g = scene.add.graphics().setDepth(y + 3);
  g.lineStyle(2, accent, 0.9);
  g.strokeCircle(x, y, 18);
  g.lineBetween(x - 26, y, x - 8, y);
  g.lineBetween(x + 8, y, x + 26, y);
  g.lineBetween(x, y - 26, x, y - 8);
  g.lineBetween(x, y + 8, x, y + 26);
  g.lineStyle(1, color, 0.8);
  g.strokeCircle(x, y, 10);
  scene.tweens.add({
    targets: g,
    angle: 90,
    alpha: 0,
    scaleX: 1.3,
    scaleY: 1.3,
    duration,
    ease: "Cubic.easeOut",
    onComplete: () => g.destroy(),
  });
}

export function coneFx(scene: WorldScene, x1: number, y1: number, x2: number, y2: number, color: number, duration: number): void {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const length = Math.max(60, Math.hypot(x2 - x1, y2 - y1));
  const spread = 0.42;
  const g = scene.add.graphics().setDepth(Math.max(y1, y2) + 2);
  g.fillStyle(color, 0.18);
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x1 + Math.cos(angle - spread) * length, y1 + Math.sin(angle - spread) * length);
  g.lineTo(x1 + Math.cos(angle + spread) * length, y1 + Math.sin(angle + spread) * length);
  g.closePath();
  g.fillPath();
  g.lineStyle(2, color, 0.65);
  g.beginPath();
  g.arc(x1, y1, length, angle - spread, angle + spread);
  g.strokePath();
  scene.tweens.add({ targets: g, alpha: 0, duration, ease: "Cubic.easeOut", onComplete: () => g.destroy() });
  burst(scene, x1 + Math.cos(angle) * length * 0.7, y1 + Math.sin(angle) * length * 0.7, color, 7, 1.1);
}

export function chainFx(scene: WorldScene, x1: number, y1: number, x2: number, y2: number, color: number, duration: number): void {
  const g = scene.add.graphics().setDepth(Math.max(y1, y2) + 3);
  g.lineStyle(3, color, 0.8);
  g.beginPath();
  g.moveTo(x1, y1);
  const steps = 4;
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const jitter = i === steps ? 0 : (i % 2 === 0 ? 1 : -1) * 12;
    g.lineTo(x1 + (x2 - x1) * t + jitter, y1 + (y2 - y1) * t - jitter);
  }
  g.strokePath();
  g.lineStyle(1, 0xffffff, 0.9);
  g.beginPath();
  g.moveTo(x1, y1);
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const jitter = i === steps ? 0 : (i % 2 === 0 ? 1 : -1) * 8;
    g.lineTo(x1 + (x2 - x1) * t + jitter, y1 + (y2 - y1) * t - jitter);
  }
  g.strokePath();
  scene.tweens.add({ targets: g, alpha: 0, duration, ease: "Cubic.easeOut", onComplete: () => g.destroy() });
  burst(scene, x2, y2, color, 5, 0.7);
}

export function hexColor(value: string): number {
  return Phaser.Display.Color.HexStringToColor(value).color;
}

export function burst(scene: WorldScene, x: number, y: number, color: number, count = 7, spread = 1): void {
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const dot = scene.burstPool.pop() ?? scene.add.circle(x, y, 2, color, 0.95).setDepth(9300);
    scene.tweens.killTweensOf(dot);
    dot
      .setPosition(x, y)
      .setRadius(2.6 + Math.random() * 2.2)
      .setFillStyle(color, 0.95)
      .setAlpha(1)
      .setVisible(true);
    scene.tweens.add({
      targets: dot,
      x: x + Math.cos(angle) * (12 + Math.random() * 16) * spread,
      y: y + Math.sin(angle) * (10 + Math.random() * 14) * spread,
      alpha: 0,
      duration: 380 + Math.random() * 160,
      ease: "Cubic.easeOut",
      onComplete: () => {
        dot.setVisible(false);
        scene.burstPool.push(dot);
      },
    });
  }
}

export function flashMonster(scene: WorldScene, x: number, y: number): void {
  let best: Phaser.GameObjects.Sprite | null = null;
  let bestDistance = 22;
  for (const [uid, sprite] of scene.monsterSprites) {
    const monster = scene.session.monsters.find((entry) => entry.uid === uid);
    if (!monster) continue;
    const distance = Math.hypot(monster.x - x, monster.y - y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = sprite;
    }
  }
  if (!best) return;
  const target = best as Phaser.GameObjects.Sprite;
  target.setTintFill(0xffffff);
  scene.time.delayedCall(70, () => {
    if (target.active) target.clearTint();
  });
}
