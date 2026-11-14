import Phaser from "phaser";
import { loadPreferences } from "../ui/preferences";
import { softGlow } from "./effects";
import { streakFx } from "./skillVisuals";

/**
 * The small reactions that make a fight read: a swing that missed, a body shoved by a
 * blow, a reaction waking with its own colour and word, and the hero heating up as the
 * hit chain climbs. Nothing here changes balance - it is all what the player sees.
 */

const REACTION_COLORS: Record<string, number> = {
  steam: 0xd8f0ff,
  shatter: 0x8fe6ff,
  wildfire: 0xff9a3a,
  ashfall: 0x9a6af0,
  holyfire: 0xffe27a,
  frostbind: 0x9ecbff,
  overload: 0xff7a4a,
  corrode: 0xb8f04a,
};

export function reactionColor(id: string): number {
  return REACTION_COLORS[id] ?? 0xffe27a;
}

/** The glow behind the hero when a chain is building: gold, warming to hot orange. */
export function comboHeatColor(combo: number): number {
  if (combo >= 50) return 0xff5a2a;
  if (combo >= 25) return 0xff8a3a;
  if (combo >= 10) return 0xffc256;
  return 0xffe9a0;
}

/** How bright the chain makes the hero: nothing below three hits, then slowly hotter. */
export function comboHeatAlpha(combo: number): number {
  if (combo < 3) return 0;
  return Math.min(0.5, 0.12 + combo * 0.02);
}

/**
 * A swing that cut only air. A thin arc where the weapon travelled and a short puff of
 * dust, so a miss is something the player sees and hears rather than a line in the log.
 */
export function whiffFx(scene: Phaser.Scene, x: number, y: number, angle: number, color: number): void {
  const preferences = loadPreferences();
  if (preferences.reducedMotion) return;
  const g = scene.add.graphics().setPosition(x, y).setDepth(y + 3);
  g.rotation = angle;
  g.lineStyle(3, color, 0.35);
  g.beginPath();
  g.arc(0, 0, 16, -0.7, 0.7);
  g.strokePath();
  g.lineStyle(1, 0xffffff, 0.5);
  g.beginPath();
  g.arc(0, 0, 13, -0.55, 0.55);
  g.strokePath();
  scene.tweens.add({
    targets: g,
    scaleX: 1.5,
    scaleY: 1.5,
    alpha: 0,
    duration: 260,
    ease: "Cubic.easeOut",
    onComplete: () => g.destroy(),
  });
  const puff = softGlow(scene, x, y, 0xd8cfb0, 26, 0.16, y + 2);
  scene.tweens.add({
    targets: puff,
    alpha: 0,
    scaleX: 0.9,
    scaleY: 0.9,
    duration: 320,
    onComplete: () => puff.destroy(),
  });
}

/**
 * The offset a shoved body sits at. `progress` runs 0 to 1 over the whole flinch: it
 * snaps back fast then springs home, which is what a hit looks like on a real body.
 */
export function flinchOffset(dx: number, dy: number, power: number, progress: number): { x: number; y: number } {
  const ease = progress < 0.25 ? progress / 0.25 : 1 - Math.pow((progress - 0.25) / 0.75, 1.6);
  return { x: dx * power * ease, y: dy * power * ease };
}

/**
 * An elemental reaction waking: its own colour in a burst, two racing rings and a fan of
 * sparks. The word itself is drawn by the scene's float text, on top of this.
 */
export function reactionFx(scene: Phaser.Scene, x: number, y: number, color: number): void {
  const preferences = loadPreferences();
  if (preferences.reducedMotion) return;
  const flash = softGlow(scene, x, y - 6, color, 60, 0.5, y + 4).setBlendMode(Phaser.BlendModes.ADD);
  scene.tweens.add({
    targets: flash,
    scaleX: 2.4,
    scaleY: 2.4,
    alpha: 0,
    duration: 380,
    ease: "Cubic.easeOut",
    onComplete: () => flash.destroy(),
  });
  for (const [radius, width, delay] of [
    [18, 3, 0],
    [12, 1.5, 90],
  ] as const) {
    const ring = scene.add.ellipse(x, y, radius * 2, radius * 1.05, color, 0).setDepth(3).setBlendMode(Phaser.BlendModes.ADD);
    ring.setStrokeStyle(width, color, 0.9).setScale(0.4);
    scene.tweens.add({
      targets: ring,
      scaleX: 2.6,
      scaleY: 2.6,
      alpha: 0,
      delay,
      duration: 460,
      ease: "Quart.easeOut",
      onComplete: () => ring.destroy(),
    });
  }
  if (!preferences.performanceMode) {
    streakFx(scene, x, y - 4, color, 8, 4, 30, y + 4, 300);
  }
}
