import Phaser from "phaser";
import { MONSTERS, type ProjectileInstance } from "@realm/core";
import { loadPreferences, type GamePreferences } from "../ui/preferences";
import { projectileStyle } from "./vfx";
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
    if (!def) continue;
    const maxHp = monster.maxHp ?? def.maxHp;
    if (monster.hp >= maxHp) continue;
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
    bars.fillRect(monster.x - width / 2, y, width * Math.max(0, monster.hp / maxHp), boss ? 3 : 2);
  }
}

/** Short body motion on cast: a lunge for melee classes, a raised-arm pulse for casters. */
export function castMotion(scene: WorldScene, classId: string, y: number, angle: number, preferences: GamePreferences): void {
  if (preferences.reducedMotion || !scene.player) return;
  const sprite = scene.player;
  const casters = ["mage", "priest", "necromancer", "druid", "summoner", "spellblade"];
  scene.tweens.killTweensOf(sprite);
  // A soft energy flash around the caster, so every cast reads at a glance.
  glowBurst(scene, sprite.x, sprite.y - 6, casters.includes(classId) ? 0x9bd7ff : 0xffe6a0, 46, 0.45, 260, sprite.depth + 1);
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
    // A bright tracer: a soft wide streak, a sharper streak and a white-hot tip.
    g.lineStyle(4, color, 0.18);
    g.lineBetween(projectile.x - dx * 30, projectile.y - dy * 30, projectile.x, projectile.y);
    g.lineStyle(1.5, color, 0.7);
    g.lineBetween(projectile.x - dx * 22, projectile.y - dy * 22, projectile.x, projectile.y);
    g.fillStyle(color, 0.3);
    g.fillCircle(projectile.x, projectile.y, 5);
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
    // A glowing orb: soft halo rings, a fading tail of dots, then a bright core.
    g.fillStyle(color, 0.07);
    g.fillCircle(projectile.x, projectile.y, projectile.radius + 14);
    g.fillStyle(color, 0.14);
    g.fillCircle(projectile.x, projectile.y, projectile.radius + 8);
    g.fillStyle(color, 0.3);
    g.fillCircle(projectile.x, projectile.y, projectile.radius + 3);
    for (let i = 1; i <= 4; i += 1) {
      g.fillStyle(color, 0.34 - i * 0.07);
      g.fillCircle(projectile.x - dx * i * 4, projectile.y - dy * i * 4, Math.max(1, projectile.radius * (1 - i * 0.15)));
    }
    g.fillStyle(color, 1);
    g.fillCircle(projectile.x, projectile.y, projectile.radius);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(projectile.x - dx * 2, projectile.y - dy * 2, Math.max(1.2, projectile.radius * 0.45));
  }
}

const GLOW_KEY = "fx-glow";

/** Draws the soft round glow picture once, the first time an effect needs it. */
function ensureGlowTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(GLOW_KEY)) return;
  const size = 64;
  const texture = scene.textures.createCanvas(GLOW_KEY, size, size);
  if (!texture) return;
  const ctx = texture.getContext();
  const half = size / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.3, "rgba(255,255,255,0.7)");
  gradient.addColorStop(0.65, "rgba(255,255,255,0.2)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  texture.refresh();
}

/** A soft round glow in one colour. The size is its width in pixels. */
export function softGlow(scene: Phaser.Scene, x: number, y: number, color: number, size: number, alpha: number, depth: number): Phaser.GameObjects.Image {
  ensureGlowTexture(scene);
  return scene.add.image(x, y, GLOW_KEY).setTint(color).setAlpha(alpha).setScale(size / 64).setDepth(depth);
}

/** A bright flash that swells and fades away at one spot. Skipped under reduced motion. */
export function glowBurst(scene: Phaser.Scene, x: number, y: number, color: number, size: number, alpha: number, duration: number, depth = y + 4): void {
  if (loadPreferences().reducedMotion) return;
  const glow = softGlow(scene, x, y, color, size, alpha, depth).setBlendMode(Phaser.BlendModes.ADD);
  scene.tweens.add({
    targets: glow,
    scaleX: (size / 64) * 1.6,
    scaleY: (size / 64) * 1.6,
    alpha: 0,
    duration,
    ease: "Cubic.easeOut",
    onComplete: () => glow.destroy(),
  });
}

export function hexColor(value: string): number {
  return Phaser.Display.Color.HexStringToColor(value).color;
}
