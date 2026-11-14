import Phaser from "phaser";
import { loadPreferences } from "../ui/preferences";
import { softGlow } from "./effects";

const ADD = Phaser.BlendModes.ADD;

/** How much decoration the current settings allow. */
function allowance(): { motion: boolean; count: number } {
  const preferences = loadPreferences();
  if (preferences.reducedMotion) return { motion: false, count: 0 };
  return { motion: true, count: preferences.performanceMode ? 4 : 10 };
}

/**
 * A soft additive glow. Flat shapes look like paper; a glow on top is what makes a
 * skill read as light rather than paint. This is the layer every big effect sits on.
 */
export function bloomFx(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number,
  size: number,
  alpha: number,
  duration: number,
  depth: number,
  grow = 1.7,
): Phaser.GameObjects.Image | null {
  if (loadPreferences().reducedMotion) return null;
  const glow = softGlow(scene, x, y, color, size, alpha, depth).setBlendMode(ADD);
  const start = size / 64;
  scene.tweens.add({
    targets: glow,
    scaleX: start * grow,
    scaleY: start * grow,
    alpha: 0,
    duration,
    ease: "Cubic.easeOut",
    onComplete: () => glow.destroy(),
  });
  return glow;
}

/**
 * A ring pressed flat on the ground. Squashed vertically so it reads as a wave running
 * across the floor instead of a circle floating in the air.
 */
export function groundWaveFx(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number,
  radius: number,
  width: number,
  duration: number,
  delay = 0,
): void {
  if (!allowance().motion) return;
  const ring = scene.add.ellipse(x, y, radius * 2, radius * 1.05, color, 0).setDepth(3);
  ring.setStrokeStyle(width, color, 0.85).setScale(0.3).setBlendMode(ADD);
  const faint = scene.add.ellipse(x, y, radius * 2, radius * 1.05, color, 0).setDepth(3);
  faint.setStrokeStyle(width * 3.5, color, 0.22).setScale(0.3);
  for (const wave of [ring, faint]) {
    scene.tweens.add({
      targets: wave,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      delay,
      duration,
      ease: "Quart.easeOut",
      onComplete: () => wave.destroy(),
    });
  }
}

/** Straight streaks fanning out from one point: the speed lines every big hit needs. */
export function streakFx(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number,
  count: number,
  inner: number,
  outer: number,
  depth: number,
  duration = 260,
): void {
  const allowed = allowance();
  if (!allowed.motion) return;
  const shown = Math.min(count, allowed.count);
  const g = scene.add.graphics().setPosition(x, y).setDepth(depth).setBlendMode(ADD).setScale(0.7);
  for (let i = 0; i < shown; i += 1) {
    const angle = (Math.PI * 2 * i) / shown + Math.random() * 0.3;
    const reach = outer * (0.75 + Math.random() * 0.4);
    g.lineStyle(i % 2 === 0 ? 2.5 : 1.5, i % 2 === 0 ? 0xffffff : color, 0.85);
    g.lineBetween(Math.cos(angle) * inner, Math.sin(angle) * inner, Math.cos(angle) * reach, Math.sin(angle) * reach);
  }
  scene.tweens.add({
    targets: g,
    scaleX: 1.6,
    scaleY: 1.6,
    alpha: 0,
    duration,
    ease: "Cubic.easeOut",
    onComplete: () => g.destroy(),
  });
}

/** Small chips thrown up in an arc and falling back down, like real debris on a hit. */
export function debrisFx(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number,
  accent: number,
  count: number,
  power: number,
  depth: number,
  duration = 520,
): void {
  const allowed = allowance();
  if (!allowed.motion) return;
  const shown = Math.min(count, allowed.count);
  for (let i = 0; i < shown; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (22 + Math.random() * 46) * power;
    const lift = (26 + Math.random() * 40) * power;
    const size = 2 + Math.random() * 2.5;
    const piece = scene.add
      .rectangle(x, y, size, size, i % 3 === 0 ? 0xffffff : i % 2 === 0 ? accent : color, 0.95)
      .setDepth(depth)
      .setBlendMode(ADD);
    const travel = { p: 0 };
    scene.tweens.add({
      targets: travel,
      p: 1,
      duration: duration * (0.8 + Math.random() * 0.4),
      ease: "Linear",
      onUpdate: () => {
        const p = travel.p;
        piece.x = x + Math.cos(angle) * speed * p;
        // A simple arc: straight out, then pulled down by gravity.
        piece.y = y + Math.sin(angle) * speed * p - lift * p + 96 * p * p;
        piece.rotation = p * 6;
        if (p > 0.65) piece.setAlpha(1 - (p - 0.65) / 0.35);
      },
      onComplete: () => piece.destroy(),
    });
  }
}

/** A scorch ring left on the floor after a big skill, fading slowly so the hit lingers. */
export function scarFx(scene: Phaser.Scene, x: number, y: number, color: number, radius: number): void {
  if (!allowance().motion) return;
  const scar = scene.add.ellipse(x, y, radius * 1.7, radius * 0.95, color, 0.16).setDepth(3).setBlendMode(ADD);
  scene.tweens.add({
    targets: scar,
    alpha: 0,
    delay: 180,
    duration: 1500,
    ease: "Sine.easeIn",
    onComplete: () => scar.destroy(),
  });
}

// One punch at a time per scene, or two punches fight each other and look jittery.
const punching = new WeakSet<Phaser.Scene>();

/**
 * A short camera punch: the view pushes in and springs back. This is the trick that
 * makes a heavy hit feel like it landed instead of just drew a picture.
 */
export function zoomPunch(scene: Phaser.Scene, amount: number, duration: number): void {
  const preferences = loadPreferences();
  if (preferences.reducedMotion || !preferences.screenShake) return;
  const camera = scene.cameras.main;
  // One punch at a time: two overlapping punches fight each other and look jittery.
  if (punching.has(scene)) return;
  punching.add(scene);
  const start = camera.zoom;
  const state = { z: start };
  scene.tweens.add({
    targets: state,
    z: start * (1 + amount),
    duration,
    yoyo: true,
    ease: "Sine.easeOut",
    onUpdate: () => camera.setZoom(state.z),
    onComplete: () => {
      camera.setZoom(start);
      punching.delete(scene);
    },
  });
}
