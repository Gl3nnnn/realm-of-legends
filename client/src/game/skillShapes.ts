import Phaser from "phaser";
import { loadPreferences } from "../ui/preferences";
import { bloomFx, debrisFx, groundWaveFx, scarFx, streakFx } from "./skillVisuals";

const ADD = Phaser.BlendModes.ADD;

/** What these functions need from the world scene, so the shapes stay self-contained. */
export interface ShapeArgs {
  scene: Phaser.Scene;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  color: number;
  accent: number;
  duration: number;
  radius: number;
}

function busy(): boolean {
  return loadPreferences().reducedMotion;
}

function angleTo(a: ShapeArgs): number {
  return Math.atan2(a.targetY - a.y, a.targetX - a.x);
}

/** A pool of light on the floor, so every one of these shapes lights the ground it hits. */
function pool(a: ShapeArgs, size: number, alpha = 0.3): void {
  bloomFx(a.scene, a.targetX, a.targetY, a.color, size * 2.2, alpha, Math.max(240, a.duration), a.targetY + 2, 1.6);
}

/** Small bright dots thrown outward along a ring, the cheap way to suggest an amount. */
function scatter(a: ShapeArgs, count: number, reach: number, tint: number, dotCount = 5): void {
  if (busy()) return;
  for (let i = 0; i < dotCount; i += 1) {
    const at = (Math.PI * 2 * i) / dotCount + Math.random() * 0.4;
    const dot = a.scene.add.circle(a.targetX, a.targetY, 2, tint, 0.9).setDepth(a.targetY + 5).setBlendMode(ADD);
    a.scene.tweens.add({
      targets: dot,
      x: a.targetX + Math.cos(at) * reach * count,
      y: a.targetY + Math.sin(at) * reach * count * 0.7,
      alpha: 0,
      duration: Math.max(200, a.duration * 0.9),
      ease: "Cubic.easeOut",
      onComplete: () => dot.destroy(),
    });
  }
}

/**
 * Fireball: a fireball is not a beam. A hot core flies from the caster, lands as a
 * burst, and leaves burning embers on the floor behind it.
 */
export function fireballShape(a: ShapeArgs): void {
  const scene = a.scene;
  const travel = Math.max(220, a.duration * 0.7);
  const core = scene.add.circle(a.x, a.y, 9, a.color, 0.75).setDepth(a.y + 8).setBlendMode(ADD);
  core.setStrokeStyle(2, 0xffffff, 0.65);
  const halo = scene.add.circle(a.x, a.y, 16, a.color, 0.25).setDepth(a.y + 7).setBlendMode(ADD);
  for (const dot of [core, halo]) {
    scene.tweens.add({
      targets: dot,
      x: a.targetX,
      y: a.targetY,
      scale: dot === core ? 1.5 : 1.8,
      duration: travel,
      ease: "Sine.easeIn",
      onComplete: () => {
        dot.destroy();
        bloomFx(scene, a.targetX, a.targetY, a.color, 96, 0.55, Math.max(280, a.duration), a.targetY + 6, 2.1);
        groundWaveFx(scene, a.targetX, a.targetY, a.accent, a.radius * 0.9, 3, Math.max(320, a.duration));
        streakFx(scene, a.targetX, a.targetY, a.color, 8, 8, a.radius * 0.6, a.targetY + 9, Math.max(200, a.duration));
        scarFx(scene, a.targetX, a.targetY, a.color, a.radius * 0.55);
        scatter(a, 1, a.radius * 0.7, a.color, 8);
      },
    });
  }
  // The trail behind the ball.
  if (!busy()) {
    for (let i = 0; i < 6; i += 1) {
      const p = (i + 1) / 7;
      const ember = scene.add
        .circle(a.x + (a.targetX - a.x) * p, a.y + (a.targetY - a.y) * p, 3, a.color, 0.7)
        .setDepth(a.y + 7)
        .setBlendMode(ADD);
      scene.tweens.add({
        targets: ember,
        alpha: 0,
        y: ember.y - 14,
        delay: travel * p * 0.6,
        duration: 320,
        onComplete: () => ember.destroy(),
      });
    }
  }
}

/**
 * Ice shard: sharp darts of ice fly in a fan, land cold and leave frost cracks.
 * Nothing about this should look warm or round.
 */
export function iceShardShape(a: ShapeArgs): void {
  const scene = a.scene;
  const angle = angleTo(a);
  const g = scene.add.graphics().setPosition(a.x, a.y).setDepth(a.y + 6).setBlendMode(ADD);
  for (let i = 0; i < 5; i += 1) {
    const spread = (i - 2) * 0.16;
    const from = 10;
    const to = Math.max(40, Math.min(a.radius * 1.4, Math.hypot(a.targetX - a.x, a.targetY - a.y)));
    g.lineStyle(i === 2 ? 3 : 1.6, i % 2 === 0 ? 0xffffff : a.color, 0.9);
    g.lineBetween(
      Math.cos(angle + spread) * from,
      Math.sin(angle + spread) * from,
      Math.cos(angle + spread) * to,
      Math.sin(angle + spread) * to,
    );
  }
  scene.tweens.add({
    targets: g,
    alpha: 0,
    scaleX: 1.15,
    scaleY: 1.15,
    duration: Math.max(220, a.duration * 0.8),
    ease: "Cubic.easeOut",
    onComplete: () => g.destroy(),
  });
  pool(a, 40, 0.22);
  bloomFx(scene, a.targetX, a.targetY, a.color, 70, 0.4, Math.max(240, a.duration), a.targetY + 4, 1.7);
  // Frost cracks: a few straight shards standing in the landing spot.
  if (busy()) return;
  const cracks = scene.add.graphics().setDepth(a.targetY + 3).setBlendMode(ADD);
  for (let i = 0; i < 6; i += 1) {
    const at = (Math.PI / 3) * i + 0.2;
    const len = 10 + Math.random() * a.radius * 0.5;
    cracks.lineStyle(2, i % 2 === 0 ? a.accent : 0xffffff, 0.8);
    cracks.lineBetween(a.targetX, a.targetY, a.targetX + Math.cos(at) * len, a.targetY + Math.sin(at) * len * 0.6);
  }
  scene.tweens.add({
    targets: cracks,
    alpha: 0,
    duration: Math.max(300, a.duration),
    delay: 90,
    onComplete: () => cracks.destroy(),
  });
  scatter(a, 1, a.radius * 0.8, a.accent, 4);
}

/**
 * Arcane blast: raw magic detonating at a chosen point. A sharp diamond burst, no
 * fire and no arrows - which is what the text says it is.
 */
export function arcaneBlastShape(a: ShapeArgs): void {
  const scene = a.scene;
  pool(a, a.radius * 0.8, 0.3);
  for (let i = 0; i < 3; i += 1) {
    const ring = scene.add.circle(a.targetX, a.targetY, 8, 0, 0).setDepth(a.targetY + 6).setBlendMode(ADD);
    ring.setStrokeStyle(i === 1 ? 2 : 3, i === 1 ? 0xffffff : a.color, 0.9).setScale(0.4);
    scene.tweens.add({
      targets: ring,
      scale: 3 + i * 1.4,
      alpha: 0,
      delay: i * 70,
      duration: Math.max(260, a.duration),
      ease: "Quart.easeOut",
      onComplete: () => ring.destroy(),
    });
  }
  if (busy()) return;
  // Angular shards, drawn as short diamond spokes so the blast reads as magic, not fire.
  const spokes = scene.add.graphics().setPosition(a.targetX, a.targetY).setDepth(a.targetY + 7).setBlendMode(ADD);
  for (let i = 0; i < 8; i += 1) {
    const at = (Math.PI / 4) * i;
    const near = a.radius * 0.3;
    const far = a.radius * 0.85;
    spokes.lineStyle(2, i % 2 === 0 ? 0xffffff : a.accent, 0.85);
    spokes.lineBetween(Math.cos(at) * near, Math.sin(at) * near, Math.cos(at) * far, Math.sin(at) * far);
  }
  scene.tweens.add({
    targets: spokes,
    scaleX: 1.4,
    scaleY: 1.4,
    alpha: 0,
    duration: Math.max(240, a.duration),
    onComplete: () => spokes.destroy(),
  });
  scatter(a, 1, a.radius * 0.9, a.accent, 6);
}

/**
 * Soul drain: a tether from the victim back to the caster with motes travelling home.
 * This is the one shape that has to read as "taken from them, given to you".
 */
export function drainShape(a: ShapeArgs): void {
  const scene = a.scene;
  const g = scene.add.graphics().setDepth(Math.max(a.y, a.targetY) + 4).setBlendMode(ADD);
  g.lineStyle(6, a.color, 0.25);
  g.lineBetween(a.targetX, a.targetY, a.x, a.y);
  g.lineStyle(2, 0xffffff, 0.5);
  g.lineBetween(a.targetX, a.targetY, a.x, a.y);
  scene.tweens.add({
    targets: g,
    alpha: 0,
    duration: Math.max(320, a.duration),
    ease: "Sine.easeIn",
    onComplete: () => g.destroy(),
  });
  if (busy()) return;
  for (let i = 0; i < 7; i += 1) {
    const mote = scene.add.circle(a.targetX, a.targetY, 2.5, i % 2 === 0 ? a.accent : 0xffffff, 0.9).setDepth(a.targetY + 5);
    scene.tweens.add({
      targets: mote,
      x: a.x + (Math.random() * 14 - 7),
      y: a.y + (Math.random() * 14 - 7),
      alpha: 0.2,
      delay: i * 55,
      duration: Math.max(280, a.duration * 0.7),
      ease: "Sine.easeIn",
      onComplete: () => mote.destroy(),
    });
  }
  bloomFx(scene, a.x, a.y, a.color, 60, 0.3, Math.max(240, a.duration), a.y + 3, 1.4);
}

/** Roots: spikes bursting out of the ground in a ring, then holding the area. */
export function rootsShape(a: ShapeArgs): void {
  const scene = a.scene;
  groundWaveFx(scene, a.targetX, a.targetY, a.color, a.radius, 3, Math.max(340, a.duration));
  if (!busy()) {
    for (let i = 0; i < 10; i += 1) {
      const at = (Math.PI * 2 * i) / 10 + 0.3;
      const reach = a.radius * (0.45 + Math.random() * 0.5);
      const height = 16 + Math.random() * 18;
      const spike = scene.add
        .triangle(a.targetX + Math.cos(at) * reach, a.targetY + Math.sin(at) * reach * 0.6, -4, height / 2, 4, height / 2, 0, -height / 2, i % 3 === 0 ? a.accent : a.color, 0.9)
        .setDepth(a.targetY + 3)
        .setScale(0.3);
      spike.setStrokeStyle(1, 0xffffff, 0.5);
      scene.tweens.add({
        targets: spike,
        scaleX: 1,
        scaleY: 1,
        duration: 220,
        delay: i * 22,
        ease: "Back.easeOut",
      });
      scene.tweens.add({
        targets: spike,
        alpha: 0,
        delay: Math.max(260, a.duration),
        duration: 320,
        onComplete: () => spike.destroy(),
      });
    }
  }
  pool(a, a.radius * 0.8, 0.26);
  scatter(a, 1, a.radius * 0.7, a.color, 5);
}

/**
 * Quake / leap: the floor breaks. Two ground waves, cracks left behind and rock chips
 * thrown upward, so a slam reads as earth and not as a glowing circle.
 */
export function quakeShape(a: ShapeArgs): void {
  const scene = a.scene;
  const cx = a.radius > 0 ? a.targetX : a.x;
  const cy = a.radius > 0 ? a.targetY : a.y;
  groundWaveFx(scene, cx, cy, a.color, a.radius, 4, Math.max(380, a.duration));
  groundWaveFx(scene, cx, cy, a.accent, a.radius * 0.7, 2, Math.max(320, a.duration), 110);
  groundWaveFx(scene, cx, cy, 0xffffff, a.radius * 0.4, 1, Math.max(280, a.duration), 200);
  bloomFx(scene, cx, cy, a.color, a.radius * 2, 0.35, Math.max(300, a.duration), cy + 3, 1.8);
  debrisFx(scene, cx, cy, a.color, a.accent, 12, 1.6, cy + 8, Math.max(520, a.duration));
  scarFx(scene, cx, cy, a.color, a.radius * 0.7);
  if (busy()) return;
  const cracks = scene.add.graphics().setDepth(cy + 2).setBlendMode(ADD);
  for (let i = 0; i < 8; i += 1) {
    const at = (Math.PI / 4) * i + 0.15;
    const len = a.radius * (0.4 + Math.random() * 0.6);
    cracks.lineStyle(2, i % 2 === 0 ? a.color : a.accent, 0.8);
    cracks.lineBetween(cx, cy, cx + Math.cos(at) * len, cy + Math.sin(at) * len * 0.55);
  }
  scene.tweens.add({
    targets: cracks,
    alpha: 0,
    delay: 220,
    duration: Math.max(400, a.duration * 1.4),
    onComplete: () => cracks.destroy(),
  });
}

/**
 * Smash: one heavy overhead blow. A vertical shock streak, a flat ring and a heavy
 * debris throw, all on the target rather than around the caster.
 */
export function smashShape(a: ShapeArgs): void {
  const scene = a.scene;
  const fall = scene.add.rectangle(a.targetX, a.targetY - 60, 8, 70, 0xffffff, 0.35).setDepth(a.targetY + 6).setBlendMode(ADD);
  scene.tweens.add({
    targets: fall,
    y: a.targetY,
    scaleY: 0.3,
    alpha: 0.9,
    duration: 120,
    ease: "Quad.easeIn",
    onComplete: () => fall.destroy(),
  });
  bloomFx(scene, a.targetX, a.targetY, a.color, 92, 0.5, Math.max(260, a.duration), a.targetY + 5, 2);
  groundWaveFx(scene, a.targetX, a.targetY, a.accent, 40, 3, Math.max(300, a.duration));
  debrisFx(scene, a.targetX, a.targetY, a.color, a.accent, 10, 1.5, a.targetY + 6, Math.max(460, a.duration));
  streakFx(scene, a.targetX, a.targetY, a.color, 7, 8, 34, a.targetY + 8, Math.max(180, a.duration));
  scarFx(scene, a.targetX, a.targetY, a.color, 26);
}

/** Smite / judgment: a pillar of light falls straight down on the target. */
export function smiteShape(a: ShapeArgs): void {
  const scene = a.scene;
  const { width } = scene.scale;
  const beam = scene.add.rectangle(a.targetX, a.targetY - 120, 26 + a.radius * 0.4, 240, a.color, 0.28).setDepth(a.targetY + 6).setBlendMode(ADD);
  const core = scene.add.rectangle(a.targetX, a.targetY - 120, 10, 240, 0xffffff, 0.3).setDepth(a.targetY + 7).setBlendMode(ADD);
  for (const beamPart of [beam, core]) {
    scene.tweens.add({
      targets: beamPart,
      scaleX: beamPart === beam ? 2.2 : 1.6,
      alpha: 0,
      duration: Math.max(280, a.duration),
      ease: "Cubic.easeOut",
      onComplete: () => beamPart.destroy(),
    });
  }
  bloomFx(scene, a.targetX, a.targetY, a.color, Math.min(width * 0.3, 160), 0.45, Math.max(320, a.duration), a.targetY + 4, 2);
  groundWaveFx(scene, a.targetX, a.targetY, a.accent, a.radius * 0.9, 3, Math.max(360, a.duration));
  pool(a, a.radius * 0.7, 0.34);
  scatter(a, 1, a.radius * 0.6, 0xffffff, 5);
}

/** Poison arrow: a green bolt that leaves a bubbling puddle where it lands. */
export function venomShape(a: ShapeArgs): void {
  const scene = a.scene;
  const angle = angleTo(a);
  const bolt = scene.add.graphics().setPosition(a.x, a.y).setDepth(a.y + 6).setBlendMode(ADD);
  bolt.lineStyle(3, a.color, 0.9);
  bolt.lineBetween(0, 0, Math.cos(angle) * 26, Math.sin(angle) * 26);
  bolt.lineStyle(1, 0xffffff, 0.7);
  bolt.lineBetween(Math.cos(angle) * 8, Math.sin(angle) * 8, Math.cos(angle) * 24, Math.sin(angle) * 24);
  scene.tweens.add({
    targets: bolt,
    alpha: 0,
    duration: Math.max(180, a.duration * 0.6),
    onComplete: () => bolt.destroy(),
  });
  bloomFx(scene, a.targetX, a.targetY, a.color, 70, 0.4, Math.max(240, a.duration), a.targetY + 4, 1.7);
  if (busy()) return;
  // The puddle: slow bubbling circles that outlive the shot itself.
  for (let i = 0; i < 5; i += 1) {
    const px2 = a.targetX + (Math.random() * a.radius - a.radius / 2) * 0.7;
    const py2 = a.targetY + (Math.random() * a.radius - a.radius / 2) * 0.5;
    const bubble = scene.add.circle(px2, py2, 3 + Math.random() * 4, a.color, 0.4).setDepth(a.targetY + 2).setBlendMode(ADD);
    scene.tweens.add({
      targets: bubble,
      scale: 1.8,
      alpha: 0,
      delay: i * 90,
      duration: Math.max(420, a.duration * 1.6),
      ease: "Sine.easeOut",
      onComplete: () => bubble.destroy(),
    });
  }
  scatter(a, 1, a.radius * 0.4, a.color, 4);
}

/** Whirlwind: a full turn around the caster, with two blades sweeping the whole circle. */
export function spinShape(a: ShapeArgs): void {
  const scene = a.scene;
  const radius = Math.max(46, a.radius || 46);
  const spin = scene.add.graphics().setPosition(a.x, a.y).setDepth(a.y + 4).setBlendMode(ADD);
  spin.lineStyle(4, a.color, 0.85);
  spin.beginPath();
  spin.arc(0, 0, radius, 0, Math.PI * 1.5);
  spin.strokePath();
  spin.lineStyle(2, 0xffffff, 0.7);
  spin.beginPath();
  spin.arc(0, 0, radius * 0.8, Math.PI, Math.PI * 2.4);
  spin.strokePath();
  scene.tweens.add({
    targets: spin,
    angle: 320 * (Math.random() < 0.5 ? 1 : -1),
    scaleX: 1.15,
    scaleY: 1.15,
    alpha: 0,
    duration: Math.max(300, a.duration),
    ease: "Cubic.easeOut",
    onComplete: () => spin.destroy(),
  });
  groundWaveFx(scene, a.x, a.y, a.accent, radius, 3, Math.max(300, a.duration));
  bloomFx(scene, a.x, a.y, a.color, radius * 2.2, 0.3, Math.max(300, a.duration), a.y + 3, 1.7);
  debrisFx(scene, a.x, a.y, a.color, a.accent, 8, 1.2, a.y + 6, Math.max(420, a.duration));
}

/** Spear / lance throw: one long shaft of light along the aim line with a bright head. */
export function spearShape(a: ShapeArgs): void {
  const scene = a.scene;
  const angle = angleTo(a);
  const length = Math.max(60, Math.hypot(a.targetX - a.x, a.targetY - a.y));
  const g = scene.add.graphics().setPosition(a.x, a.y).setDepth(a.y + 7).setBlendMode(ADD);
  g.lineStyle(8, a.color, 0.25);
  g.lineBetween(0, 0, Math.cos(angle) * length, Math.sin(angle) * length);
  g.lineStyle(3, a.color, 0.95);
  g.lineBetween(0, 0, Math.cos(angle) * length, Math.sin(angle) * length);
  g.lineStyle(1.5, 0xffffff, 0.9);
  g.lineBetween(6 * Math.cos(angle), 6 * Math.sin(angle), Math.cos(angle) * length, Math.sin(angle) * length);
  scene.tweens.add({
    targets: g,
    alpha: 0,
    scaleX: 1.08,
    scaleY: 1.08,
    duration: Math.max(200, a.duration * 0.8),
    ease: "Cubic.easeOut",
    onComplete: () => g.destroy(),
  });
  bloomFx(scene, a.targetX, a.targetY, a.color, 84, 0.45, Math.max(240, a.duration), a.targetY + 5, 1.9);
  streakFx(scene, a.targetX, a.targetY, a.accent, 7, 8, 30, a.targetY + 8, Math.max(180, a.duration));
  scatter(a, 1, 26, a.accent, 4);
}

/**
 * Explosion: a thrown charge, not something falling from the sky. A bright core that
 * grows at the landing point, three walls of fire racing outward and debris thrown flat.
 */
export function explosionShape(a: ShapeArgs): void {
  const scene = a.scene;
  const core = scene.add.circle(a.targetX, a.targetY, 10, 0xffffff, 0.9).setDepth(a.targetY + 7).setBlendMode(ADD);
  scene.tweens.add({
    targets: core,
    scale: Math.max(1.6, a.radius / 26),
    alpha: 0,
    duration: Math.max(200, a.duration * 0.6),
    ease: "Quad.easeOut",
    onComplete: () => core.destroy(),
  });
  for (let i = 0; i < 3; i += 1) {
    groundWaveFx(scene, a.targetX, a.targetY, i === 0 ? 0xffffff : a.color, a.radius * (1 - i * 0.2), 4 - i, Math.max(320, a.duration), i * 80);
  }
  bloomFx(scene, a.targetX, a.targetY, a.color, a.radius * 2.4, 0.5, Math.max(280, a.duration), a.targetY + 4, 2.2);
  debrisFx(scene, a.targetX, a.targetY, a.color, 0xfff0d0, 12, 1.9, a.targetY + 7, Math.max(520, a.duration));
  streakFx(scene, a.targetX, a.targetY, a.accent, 9, 10, a.radius * 0.9, a.targetY + 9, Math.max(220, a.duration));
  scarFx(scene, a.targetX, a.targetY, a.color, a.radius * 0.6);
}

/**
 * Roar: a rallying shout. Rings of sound leave the caster in time with a widening
 * fan of spokes, so it reads as noise rather than as a quiet glow on the ground.
 */
export function roarShape(a: ShapeArgs): void {
  const scene = a.scene;
  const reach = Math.max(44, a.radius || 52);
  for (let i = 0; i < 3; i += 1) {
    const ring = scene.add.circle(a.x, a.y, 12, 0, 0).setDepth(a.y + 5).setBlendMode(ADD);
    ring.setStrokeStyle(i === 1 ? 3 : 2, i === 1 ? 0xffffff : a.color, 0.9).setScale(0.4);
    scene.tweens.add({
      targets: ring,
      scale: (reach / 12) * (1 - i * 0.18),
      alpha: 0,
      delay: i * 90,
      duration: Math.max(300, a.duration),
      ease: "Quart.easeOut",
      onComplete: () => ring.destroy(),
    });
  }
  if (!busy()) {
    // Pressure spokes, thin near the hero and opening outward like a shout.
    const g = scene.add.graphics().setPosition(a.x, a.y).setDepth(a.y + 6).setBlendMode(ADD);
    for (let i = 0; i < 10; i += 1) {
      const at = (Math.PI / 5) * i;
      g.lineStyle(2, i % 2 === 0 ? a.accent : a.color, 0.7);
      g.lineBetween(Math.cos(at) * 16, Math.sin(at) * 16 * 0.7, Math.cos(at) * reach, Math.sin(at) * reach * 0.7);
    }
    scene.tweens.add({
      targets: g,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0,
      duration: Math.max(300, a.duration),
      ease: "Cubic.easeOut",
      onComplete: () => g.destroy(),
    });
  }
  groundWaveFx(scene, a.x, a.y, a.accent, reach * 0.9, 2, Math.max(320, a.duration), 60);
  bloomFx(scene, a.x, a.y, a.color, reach * 1.6, 0.28, Math.max(280, a.duration), a.y + 3, 1.6);
}

/**
 * Stone ring: slabs of rock pushed up out of the floor in a circle. Flat-topped
 * blocks, deliberately boxy, so nothing about it reads as a plant or a spike of thorn.
 */
export function stoneRingShape(a: ShapeArgs): void {
  const scene = a.scene;
  const reach = Math.max(50, a.radius || 60);
  groundWaveFx(scene, a.targetX, a.targetY, a.color, reach, 3, Math.max(340, a.duration));
  if (!busy()) {
    for (let i = 0; i < 10; i += 1) {
      const at = (Math.PI * 2 * i) / 10 + 0.2;
      const sx = a.targetX + Math.cos(at) * reach * 0.82;
      const sy = a.targetY + Math.sin(at) * reach * 0.5;
      const w = 8 + Math.random() * 6;
      const h = 12 + Math.random() * 14;
      const slab = scene.add
        .rectangle(sx, sy, w, h, i % 3 === 0 ? a.accent : a.color, 0.85)
        .setDepth(sy + 2)
        .setStrokeStyle(1, 0xffffff, 0.35)
        .setScale(1, 0.15)
        .setOrigin(0.5, 1);
      slab.setAngle(Math.random() * 16 - 8);
      scene.tweens.add({
        targets: slab,
        scaleY: 1,
        duration: 240,
        delay: i * 30,
        ease: "Back.easeOut",
      });
      scene.tweens.add({
        targets: slab,
        alpha: 0,
        delay: Math.max(320, a.duration),
        duration: 300,
        onComplete: () => slab.destroy(),
      });
    }
  }
  pool(a, reach * 0.75, 0.24);
  debrisFx(scene, a.targetX, a.targetY, a.color, a.accent, 8, 1.1, a.targetY + 6, Math.max(420, a.duration));
}

/**
 * Tide: water pushed outward. A wide flat wave travels along the aim line, then two
 * arcs wash back, so the skill sweeps away from the caster instead of ringing him.
 */
export function tideShape(a: ShapeArgs): void {
  const scene = a.scene;
  const angle = angleTo(a);
  const spread = 1.15;
  for (let i = 0; i < 3; i += 1) {
    const wave = scene.add.graphics().setPosition(a.x, a.y).setDepth(a.y + 4).setBlendMode(ADD);
    const size = Math.max(50, a.radius || 70) * (1 - i * 0.18);
    wave.lineStyle(i === 0 ? 5 : 2, i === 1 ? 0xffffff : a.color, 0.85);
    wave.beginPath();
    wave.arc(0, 0, size, angle - spread, angle + spread, false);
    wave.strokePath();
    wave.lineStyle(1, a.accent, 0.7);
    wave.beginPath();
    wave.arc(0, 0, size * 0.7, angle - spread * 0.8, angle + spread * 0.8, false);
    wave.strokePath();
    scene.tweens.add({
      targets: wave,
      scaleX: 1.35,
      scaleY: 1.15,
      alpha: 0,
      delay: i * 110,
      duration: Math.max(320, a.duration),
      ease: "Cubic.easeOut",
      onComplete: () => wave.destroy(),
    });
  }
  if (!busy()) {
    // Spray: droplets thrown along the direction of the surge.
    for (let i = 0; i < 8; i += 1) {
      const at = angle + (Math.random() * spread * 2 - spread);
      const drop = scene.add.circle(a.x, a.y, 2 + Math.random() * 2, 0xffffff, 0.8).setDepth(a.y + 6).setBlendMode(ADD);
      scene.tweens.add({
        targets: drop,
        x: a.x + Math.cos(at) * a.radius * 1.2,
        y: a.y + Math.sin(at) * a.radius * 1.2 * 0.6,
        alpha: 0,
        duration: Math.max(280, a.duration),
        delay: i * 40,
        ease: "Sine.easeOut",
        onComplete: () => drop.destroy(),
      });
    }
  }
  bloomFx(scene, a.targetX, a.targetY, a.color, a.radius * 1.8, 0.32, Math.max(280, a.duration), a.targetY + 3, 1.8);
  groundWaveFx(scene, a.targetX, a.targetY, a.accent, a.radius * 0.9, 2, Math.max(320, a.duration), 90);
  scarFx(scene, a.targetX, a.targetY, a.color, a.radius * 0.5);
}
