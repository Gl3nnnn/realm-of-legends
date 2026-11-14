import Phaser from "phaser";
import { loadPreferences } from "../ui/preferences";
import { bloomFx, debrisFx, groundWaveFx, scarFx, streakFx, zoomPunch } from "./skillVisuals";

const ADD = Phaser.BlendModes.ADD;

/** How much decoration is allowed right now. Reduced motion drops the extras. */
interface Budget {
  motion: boolean;
  particles: number;
}

function budget(): Budget {
  const preferences = loadPreferences();
  if (preferences.reducedMotion) return { motion: false, particles: 0 };
  return { motion: true, particles: preferences.performanceMode ? 3 : 8 };
}

/**
 * The wind-up: a small orb swells at the caster and motes fall inward to meet it,
 * so a skill reads as something gathering before it lands. Ultimates gather bigger.
 */
export function chargeFx(scene: Phaser.Scene, x: number, y: number, color: number, accent: number, ultimate: boolean): void {
  const allowed = budget();
  const size = ultimate ? 30 : 18;
  // The glow grows before the orb does, so the wind-up starts as light, not a dot.
  bloomFx(scene, x, y, color, ultimate ? 92 : 56, 0.22, ultimate ? 520 : 340, y + 5, 1.1);
  if (!allowed.motion) return;
  const orb = scene.add.circle(x, y, size, color, 0.42).setDepth(y + 5).setScale(0.2).setBlendMode(ADD);
  orb.setStrokeStyle(2, accent, 0.9);
  scene.tweens.add({
    targets: orb,
    scaleX: 1,
    scaleY: 1,
    alpha: 0,
    y: y - size * 0.7,
    duration: ultimate ? 360 : 240,
    ease: "Cubic.easeOut",
    onComplete: () => orb.destroy(),
  });
  for (let i = 0; i < allowed.particles; i += 1) {
    const a = (Math.PI * 2 * i) / Math.max(1, allowed.particles);
    const r = size * 1.7;
    const dot = scene.add
      .circle(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.6, 2, accent, 0.9)
      .setDepth(y + 5);
    scene.tweens.add({
      targets: dot,
      x,
      y: y - size * 0.4,
      alpha: 0,
      duration: 220 + i * 14,
      ease: "Sine.easeIn",
      onComplete: () => dot.destroy(),
    });
  }
}

/**
 * The landing: a soft flash, a wide colour ring, a tight white ring and a fan of
 * shards. Every damaging skill ends on this, so a hit always has a shape.
 */
export function impactFx(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number,
  accent: number,
  scale: number,
  duration: number,
): void {
  const allowed = budget();
  // Light first, then shape: a bloom under everything else is what stops a hit
  // from looking like a flat sticker pasted on the floor.
  bloomFx(scene, x, y, color, 40 * scale + 18, 0.5, Math.max(220, duration * 0.9), y + 6, 2.2);
  const flash = scene.add.circle(x, y, 14 * scale, color, 0.3).setDepth(y + 6).setBlendMode(ADD);
  scene.tweens.add({
    targets: flash,
    scale: 2.6,
    alpha: 0,
    duration: Math.max(160, duration * 0.8),
    ease: "Cubic.easeOut",
    onComplete: () => flash.destroy(),
  });

  const outer = scene.add.circle(x, y, 12 * scale, 0, 0).setDepth(y + 7);
  outer.setStrokeStyle(3, color, 0.9);
  scene.tweens.add({
    targets: outer,
    scale: 2.2,
    alpha: 0,
    duration: Math.max(180, duration),
    ease: "Quart.easeOut",
    onComplete: () => outer.destroy(),
  });

  const inner = scene.add.circle(x, y, 8 * scale, 0, 0).setDepth(y + 7);
  inner.setStrokeStyle(2, 0xffffff, 0.95);
  scene.tweens.add({
    targets: inner,
    scale: 1.8,
    alpha: 0,
    duration: Math.max(140, duration * 0.6),
    ease: "Cubic.easeOut",
    onComplete: () => inner.destroy(),
  });

  // Speed lines and flying chips read as force, and the scorch mark keeps the hit
  // visible for a moment after the sparks have gone.
  streakFx(scene, x, y, accent, Math.round(6 * scale) + 2, 8 * scale, 30 * scale, y + 9, Math.max(180, duration * 0.9));
  debrisFx(scene, x, y, color, accent, Math.round(4 * scale) + 2, scale * 0.8, y + 9);
  if (scale > 1) scarFx(scene, x, y, color, 10 * scale);
  if (!allowed.motion) return;
  const shards = scene.add.graphics().setPosition(x, y).setDepth(y + 8).setScale(0.7);
  const count = Math.max(4, Math.round(6 * scale));
  for (let i = 0; i < count; i += 1) {
    const a = (Math.PI * 2 * i) / count + 0.25;
    const near = 10 * scale;
    const far = (18 + (i % 3) * 6) * scale;
    shards.lineStyle(2, i % 2 === 0 ? 0xffffff : accent, 0.85);
    shards.lineBetween(Math.cos(a) * near, Math.sin(a) * near, Math.cos(a) * far, Math.sin(a) * far);
  }
  scene.tweens.add({
    targets: shards,
    scaleX: 1.35,
    scaleY: 1.35,
    alpha: 0,
    duration: Math.max(200, duration * 1.1),
    ease: "Cubic.easeOut",
    onComplete: () => shards.destroy(),
  });
}

/**
 * A proper magic circle: two rings, tick marks, an inner star, turning slowly as it
 * fades. Used under area skills and under the caster for an ultimate.
 */
export function sigilFx(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number,
  accent: number,
  radius: number,
  duration: number,
  spin = 90,
): void {
  if (!budget().motion) return;
  // A pool of light under the circle: a magic circle should light the floor it sits on.
  bloomFx(scene, x, y, color, radius * 2.6, 0.18, duration, y + 1, 1.25);
  groundWaveFx(scene, x, y, accent, radius, 2, Math.max(320, duration));
  const g = scene.add.graphics().setPosition(x, y).setDepth(y + 2).setBlendMode(ADD);
  g.lineStyle(2, color, 0.85);
  g.strokeCircle(0, 0, radius);
  g.lineStyle(1, accent, 0.7);
  g.strokeCircle(0, 0, radius * 0.78);
  g.strokeCircle(0, 0, radius * 0.46);
  for (let i = 0; i < 12; i += 1) {
    const a = (Math.PI * 2 * i) / 12;
    g.lineBetween(
      Math.cos(a) * radius * 0.86,
      Math.sin(a) * radius * 0.86,
      Math.cos(a) * radius * 0.97,
      Math.sin(a) * radius * 0.97,
    );
  }
  // A five-point star inside, drawn as one closed path.
  const points: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 5; i += 1) {
    const a = -Math.PI / 2 + (i * Math.PI * 4) / 5;
    points.push(new Phaser.Math.Vector2(Math.cos(a) * radius * 0.62, Math.sin(a) * radius * 0.62));
  }
  g.lineStyle(1, accent, 0.5);
  g.strokePoints(points, true);
  scene.tweens.add({
    targets: g,
    angle: spin,
    scaleX: 1.12,
    scaleY: 1.12,
    alpha: 0,
    duration,
    ease: "Cubic.easeOut",
    onComplete: () => g.destroy(),
  });
}

/** A soft column of light with motes rising through it: heals, buffs and summons. */
export function pillarFx(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number,
  accent: number,
  height: number,
  duration: number,
): void {
  const allowed = budget();
  const column = scene.add
    .rectangle(x, y - height / 2, 30, height, color, 0.2)
    .setDepth(y + 2)
    .setBlendMode(ADD);
  scene.tweens.add({
    targets: column,
    scaleX: 1.5,
    alpha: 0,
    duration: Math.max(240, duration),
    ease: "Cubic.easeOut",
    onComplete: () => column.destroy(),
  });
  bloomFx(scene, x, y - height * 0.35, color, height * 1.1, 0.2, Math.max(280, duration), y + 1, 1.2);
  groundWaveFx(scene, x, y, accent, 28, 2, Math.max(260, duration));
  const core = scene.add
    .rectangle(x, y - height / 2, 10, height, 0xffffff, 0.22)
    .setDepth(y + 3)
    .setBlendMode(ADD);
  scene.tweens.add({
    targets: core,
    scaleX: 1.2,
    alpha: 0,
    duration: Math.max(200, duration * 0.8),
    ease: "Cubic.easeOut",
    onComplete: () => core.destroy(),
  });
  if (!allowed.motion) return;
  for (let i = 0; i < allowed.particles; i += 1) {
    const ox = (Math.random() * 2 - 1) * 14;
    const dot = scene.add.circle(x + ox, y + 4, 1.8, accent, 0.9).setDepth(y + 4);
    scene.tweens.add({
      targets: dot,
      y: y - height + Math.random() * 12,
      alpha: 0,
      duration: 420 + Math.random() * 240,
      ease: "Cubic.easeOut",
      onComplete: () => dot.destroy(),
    });
  }
}

/** A hexagonal shield shell instead of a plain bubble, so a ward looks like a ward. */
export function bubbleShellFx(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number,
  accent: number,
  radius: number,
  duration: number,
): void {
  const shell = scene.add.graphics().setPosition(x, y).setDepth(y + 3);
  const hex = (r: number): Phaser.Math.Vector2[] => {
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 6; i += 1) {
      const a = (Math.PI / 3) * i + Math.PI / 6;
      pts.push(new Phaser.Math.Vector2(Math.cos(a) * r, Math.sin(a) * r * 0.92));
    }
    return pts;
  };
  shell.fillStyle(color, 0.12);
  shell.fillPoints(hex(radius), true);
  shell.lineStyle(3, accent, 0.85);
  shell.strokePoints(hex(radius), true);
  shell.lineStyle(1, 0xffffff, 0.55);
  shell.strokePoints(hex(radius * 0.62), true);
  shell.setBlendMode(ADD);
  bloomFx(scene, x, y, accent, radius * 2.4, 0.24, duration, y + 1, 1.3);
  scene.tweens.add({
    targets: shell,
    scaleX: 1.2,
    scaleY: 1.2,
    alpha: 0,
    duration,
    ease: "Cubic.easeOut",
    onComplete: () => shell.destroy(),
  });
}

/** A jagged bolt with two forked branches and a white-hot core. */
export function lightningFx(
  scene: Phaser.Scene,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: number,
  duration: number,
): void {
  const allowed = budget();
  const g = scene.add.graphics().setDepth(Math.max(y1, y2) + 3).setBlendMode(ADD);
  // A glow at both ends of the bolt, so the strike lights the caster and the target.
  bloomFx(scene, x1, y1, color, 54, 0.3, Math.max(160, duration), Math.max(y1, y2) + 2, 1.4);
  bloomFx(scene, x2, y2, color, 80, 0.45, Math.max(200, duration * 1.2), Math.max(y1, y2) + 4, 1.6);
  const path = (jitter: number): { x: number; y: number }[] => {
    const steps = 5;
    const points: { x: number; y: number }[] = [{ x: x1, y: y1 }];
    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps;
      const side = i === steps ? 0 : (i % 2 === 0 ? 1 : -1) * jitter;
      points.push({ x: x1 + (x2 - x1) * t + side, y: y1 + (y2 - y1) * t - side });
    }
    return points;
  };
  const main = path(12);
  g.lineStyle(6, color, 0.22);
  for (let i = 1; i < main.length; i += 1) g.lineBetween(main[i - 1].x, main[i - 1].y, main[i].x, main[i].y);
  g.lineStyle(2.5, color, 0.9);
  for (let i = 1; i < main.length; i += 1) g.lineBetween(main[i - 1].x, main[i - 1].y, main[i].x, main[i].y);
  g.lineStyle(1, 0xffffff, 0.95);
  for (let i = 1; i < main.length; i += 1) g.lineBetween(main[i - 1].x, main[i - 1].y, main[i].x, main[i].y);
  if (allowed.motion) {
    // Two short forks peeling off the middle of the bolt.
    for (const at of [2, 3]) {
      if (at >= main.length - 1) continue;
      const base = main[at];
      const direction = at % 2 === 0 ? 1 : -1;
      const fork = scene.add.graphics().setDepth(Math.max(y1, y2) + 3);
      fork.lineStyle(1.5, color, 0.7);
      const fx = base.x + direction * 16;
      const fy = base.y - 10;
      fork.lineBetween(base.x, base.y, fx, fy);
      fork.lineBetween(fx, fy, fx + direction * 9, fy - 12);
      scene.tweens.add({
        targets: fork,
        alpha: 0,
        duration: Math.max(120, duration * 0.7),
        onComplete: () => fork.destroy(),
      });
    }
  }
  scene.tweens.add({
    targets: g,
    alpha: 0,
    duration,
    ease: "Cubic.easeOut",
    onComplete: () => g.destroy(),
  });
}

/** Three nested cones - deep outer, mid body, hot white inner - plus rising embers. */
export function coneSkillFx(
  scene: Phaser.Scene,
  x: number,
  y: number,
  angle: number,
  length: number,
  spread: number,
  color: number,
  duration: number,
): void {
  const allowed = budget();
  const g = scene.add.graphics().setDepth(y + 2);
  const layer = (reach: number, half: number, tint: number, alpha: number, lineAlpha: number): void => {
    g.fillStyle(tint, alpha);
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(angle - half) * reach, y + Math.sin(angle - half) * reach);
    g.lineTo(x + Math.cos(angle + half) * reach, y + Math.sin(angle + half) * reach);
    g.closePath();
    g.fillPath();
    g.lineStyle(2, tint, lineAlpha);
    g.beginPath();
    g.arc(x, y, reach, angle - half, angle + half);
    g.strokePath();
  };
  layer(length, spread, color, 0.16, 0.6);
  layer(length * 0.78, spread * 0.82, color, 0.24, 0.75);
  layer(length * 0.5, spread * 0.6, 0xfff0d0, 0.3, 0.5);
  g.setBlendMode(ADD);
  // The cone lights the ground along its length, and debris flies from its tip.
  for (let step = 1; step <= 3; step += 1) {
    const reach = (length * step) / 3.4;
    bloomFx(scene, x + Math.cos(angle) * reach, y + Math.sin(angle) * reach, color, 52 + step * 10, 0.2, Math.max(260, duration), y + 1, 1.2);
  }
  debrisFx(scene, x + Math.cos(angle) * length * 0.85, y + Math.sin(angle) * length * 0.85, color, 0xfff0d0, 8, 1.2, y + 4, 620);
  scene.tweens.add({
    targets: g,
    alpha: 0,
    duration,
    ease: "Cubic.easeOut",
    onComplete: () => g.destroy(),
  });
  if (!allowed.motion) return;
  for (let i = 0; i < allowed.particles; i += 1) {
    const t = 0.35 + Math.random() * 0.6;
    const a = angle + (Math.random() * 2 - 1) * spread * 0.8;
    const ember = scene.add
      .circle(x + Math.cos(a) * length * t, y + Math.sin(a) * length * t, 2, color, 0.9)
      .setDepth(y + 3);
    scene.tweens.add({
      targets: ember,
      y: ember.y - 16 - Math.random() * 18,
      alpha: 0,
      duration: 340 + i * 40,
      ease: "Cubic.easeOut",
      onComplete: () => ember.destroy(),
    });
  }
}

/**
 * An ultimate announces itself: a turning sigil under the caster, two shock rings
 * racing outward and a short screen flash in the skill's own colour.
 */
export function ultimateFx(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number,
  accent: number,
  radius: number,
  duration: number,
): void {
  sigilFx(scene, x, y, color, accent, Math.max(48, radius * 0.8), duration, 140);
  const allowed = budget();
  // The camera leans in as the ultimate lands and the floor keeps its mark afterwards.
  zoomPunch(scene, 0.05, 220);
  scarFx(scene, x, y, color, Math.max(44, radius * 0.9));
  groundWaveFx(scene, x, y, accent, Math.max(60, radius), 3, Math.max(420, duration * 1.2), 80);
  const ring = (delay: number, reach: number): void => {
    const shock = scene.add.circle(x, y, 20, 0, 0).setDepth(y + 4).setBlendMode(ADD);
    shock.setStrokeStyle(4, color, 0.9);
    scene.tweens.add({
      targets: shock,
      scale: reach / 20,
      alpha: 0,
      delay,
      duration: Math.max(280, duration * 1.1),
      ease: "Quart.easeOut",
      onComplete: () => shock.destroy(),
    });
  };
  ring(0, Math.max(90, radius * 1.4));
  ring(110, Math.max(120, radius * 1.9));
  if (!allowed.motion) return;
  streakFx(scene, x, y, accent, 12, 18, Math.max(70, radius * 1.1), y + 5, 420);
  const camera = scene.cameras.main;
  const tint = Phaser.Display.Color.IntegerToColor(color);
  camera.flash(110, tint.red, tint.green, tint.blue, false);
}
