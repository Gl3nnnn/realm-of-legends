import Phaser from "phaser";
import { loadPreferences } from "../ui/preferences";
import { softGlow } from "./effects";

const ADD = Phaser.BlendModes.ADD;

/** How much decoration the current settings allow. */
function allowed(): { motion: boolean; rich: boolean } {
  const preferences = loadPreferences();
  if (preferences.reducedMotion) return { motion: false, rich: false };
  return { motion: true, rich: !preferences.performanceMode };
}

/**
 * A pool of light laid flat on the floor. Big skills light the ground they land on,
 * and that is the cheapest way to make a flat 2D scene read as a lit room.
 */
export function lightPoolFx(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number,
  radius: number,
  duration: number,
  strength = 0.4,
): void {
  if (!allowed().motion) return;
  const pool = scene.add.ellipse(x, y, radius * 2.4, radius * 1.3, color, strength).setDepth(3).setBlendMode(ADD);
  pool.setScale(0.32);
  scene.tweens.add({
    targets: pool,
    scaleX: 1,
    scaleY: 1,
    alpha: 0,
    duration: Math.max(260, duration * 1.25),
    ease: "Cubic.easeOut",
    onComplete: () => pool.destroy(),
  });
}

/**
 * A flat shockwave: one crisp white leading edge with a wide soft ring trailing it.
 * Squashed onto the floor so it runs across the ground instead of floating.
 */
export function shockwaveFx(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number,
  radius: number,
  duration: number,
  delay = 0,
  width = 2.5,
): void {
  if (!allowed().motion) return;
  const reach = Math.max(24, radius);
  const edge = scene.add.ellipse(x, y, reach * 2, reach * 1.06, color, 0).setDepth(4);
  edge.setStrokeStyle(width, 0xffffff, 0.9).setScale(0.28).setBlendMode(ADD);
  const body = scene.add.ellipse(x, y, reach * 2, reach * 1.06, color, 0).setDepth(4);
  body.setStrokeStyle(width * 4, color, 0.34).setScale(0.28);
  scene.tweens.add({
    targets: edge,
    scaleX: 1.25,
    scaleY: 1.25,
    alpha: 0,
    delay,
    duration: Math.max(260, duration),
    ease: "Quart.easeOut",
    onComplete: () => edge.destroy(),
  });
  scene.tweens.add({
    targets: body,
    scaleX: 1,
    scaleY: 1,
    alpha: 0,
    delay,
    duration: Math.max(300, duration * 1.1),
    ease: "Quart.easeOut",
    onComplete: () => body.destroy(),
  });
}

/**
 * A white-hot core: the tiny gleam at the centre of a hit. Without it a bright effect
 * looks like coloured fog; with it the eye gets a point to land on.
 */
export function coreFlashFx(
  scene: Phaser.Scene,
  x: number,
  y: number,
  size: number,
  duration: number,
  depth: number,
): void {
  if (!allowed().motion) return;
  const core = softGlow(scene, x, y, 0xffffff, size * 2.2, 0.85, depth).setBlendMode(ADD);
  const start = (size * 2.2) / 64;
  core.setScale(start * 0.45);
  scene.tweens.add({
    targets: core,
    scaleX: start * 1.5,
    scaleY: start * 1.5,
    alpha: 0,
    duration: Math.max(140, duration * 0.55),
    ease: "Cubic.easeOut",
    onComplete: () => core.destroy(),
  });
}

/**
 * The solid part of a slash: a tapered band that is thin where the blade enters and
 * thick where it lands. A line has an even thickness everywhere, which is why it reads
 * as a drawn line; a tapered band reads as a blade passing through air.
 */
export function bladeBandFx(
  scene: Phaser.Scene,
  x: number,
  y: number,
  angle: number,
  radius: number,
  width: number,
  spread: number,
  color: number,
  duration: number,
  shoulder = 0,
): void {
  if (!allowed().motion) return;
  const g = scene.add.graphics().setPosition(x, y).setDepth(y + 4);
  g.rotation = angle;
  g.setBlendMode(ADD);
  const off = radius * 0.38 * shoulder;
  const lean = 0.18 * shoulder;
  const from = -spread + lean;
  const to = spread + lean;
  const thin = Math.max(1.5, width * 0.35);
  const thick = width * 1.55;
  // Outer edge of the blade, then back along the inner edge, so the fill is a crescent.
  g.fillStyle(color, 0.55);
  g.beginPath();
  g.arc(0, off, radius + thick, from, to, false);
  g.arc(0, off, radius - thick, to, from, true);
  g.closePath();
  g.fillPath();
  // The white-hot edge sits on the side the blade is heading toward.
  const hotFrom = shoulder < 0 ? from : to - spread * 0.55;
  const hotTo = shoulder < 0 ? from + spread * 0.55 : to;
  g.fillStyle(0xffffff, 0.6);
  g.beginPath();
  g.arc(0, off, radius + thin, hotFrom, hotTo, false);
  g.arc(0, off, radius - thin, hotTo, hotFrom, true);
  g.closePath();
  g.fillPath();
  scene.tweens.add({
    targets: g,
    alpha: 0,
    scaleX: 1.28,
    scaleY: 1.28,
    rotation: angle + shoulder * 0.26,
    duration: Math.max(140, duration),
    ease: "Cubic.easeOut",
    onComplete: () => g.destroy(),
  });
}

/**
 * A soft rim of light hugging a glowing body: wards, buffs and the hero riding a long
 * combo. Drawn as stacked flat rings so it costs nothing and never needs a new texture.
 */
export function rimGlowFx(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number,
  radius: number,
  alpha: number,
  duration: number,
  depth: number,
): void {
  if (!allowed().motion) return;
  const ring = scene.add.ellipse(x, y, radius * 2, radius * 1.1, color, 0).setDepth(depth).setBlendMode(ADD);
  ring.setStrokeStyle(3, color, alpha).setScale(0.7);
  scene.tweens.add({
    targets: ring,
    scaleX: 1.18,
    scaleY: 1.18,
    alpha: 0,
    duration,
    ease: "Sine.easeOut",
    onComplete: () => ring.destroy(),
  });
}
