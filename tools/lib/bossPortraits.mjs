import { makeImage, ellipse, px, rect, shade, upscale, line } from "./pixels.mjs";

// Four boss portraits, drawn as 64x64 pixel cells in the same style as the class portraits.
export const BOSS_ORDER = ["boneWarden", "miremother", "frostRevenant", "hollowKing"];

const BOSS_STYLES = {
  boneWarden: { base: "#c9c9b4", skin: "#d8d2bf", eye: "#7fd0ff", accent: "#8a8a7a", trim: "#4a4a40" },
  miremother: { base: "#4f7a3a", skin: "#9ab07a", eye: "#e8f08a", accent: "#6a8a3a", trim: "#2a3a1a" },
  frostRevenant: { base: "#7fb8e8", skin: "#c8dff0", eye: "#e8fbff", accent: "#b8e0ff", trim: "#2a4a6a" },
  hollowKing: { base: "#d9a03a", skin: "#e0d0b0", eye: "#ff7a3a", accent: "#f2d46a", trim: "#5c3d24" },
};

function drawBackground(im, ox, oy, base) {
  for (let y = 0; y < 64; y += 1) {
    const t = y / 63;
    const c = shade(base, -40 + t * 20);
    rect(im, ox + 1, oy + y, 62, 1, shade(c, -60));
  }
  rect(im, ox, oy, 64, 2, base);
  rect(im, ox, oy + 62, 64, 2, shade(base, -30));
  rect(im, ox, oy, 2, 64, shade(base, 20));
  rect(im, ox + 62, oy, 2, 64, shade(base, -20));
}

// Each boss is a 16x18 pixel head-and-shoulders, drawn into a scratch image then scaled 3x.
function drawBoss(id, s) {
  const tmp = makeImage(16, 18);
  const cx = 8;
  const cy = 9;

  // Shoulders and body
  ellipse(tmp, cx, 17, 7, 3, s.trim);

  if (id === "boneWarden") {
    // Skull-like head, dark hood
    ellipse(tmp, cx, cy, 4, 5, s.skin);
    rect(tmp, cx - 5, cy - 6, 10, 4, s.trim);
    px(tmp, cx - 2, cy - 1, s.eye);
    px(tmp, cx + 2, cy - 1, s.eye);
    rect(tmp, cx - 2, cy + 3, 4, 1, s.trim);
  } else if (id === "miremother") {
    // Long hair, glowing eyes
    rect(tmp, cx - 6, cy - 5, 12, 5, s.trim);
    rect(tmp, cx - 6, cy, 2, 8, s.trim);
    rect(tmp, cx + 4, cy, 2, 8, s.trim);
    ellipse(tmp, cx, cy, 3, 4, s.skin);
    px(tmp, cx - 1, cy - 1, s.eye);
    px(tmp, cx + 1, cy - 1, s.eye);
  } else if (id === "frostRevenant") {
    // Frozen face with an icy crown
    ellipse(tmp, cx, cy, 4, 5, s.skin);
    line(tmp, cx - 5, cy - 6, cx - 3, cy - 3, s.accent);
    line(tmp, cx + 5, cy - 6, cx + 3, cy - 3, s.accent);
    line(tmp, cx, cy - 7, cx, cy - 4, s.accent);
    px(tmp, cx - 2, cy - 1, s.eye);
    px(tmp, cx + 2, cy - 1, s.eye);
  } else {
    // Hollow King: crown with a dark face
    ellipse(tmp, cx, cy, 4, 5, s.skin);
    rect(tmp, cx - 5, cy - 6, 10, 2, s.accent);
    px(tmp, cx - 4, cy - 8, s.accent);
    px(tmp, cx, cy - 8, s.accent);
    px(tmp, cx + 4, cy - 8, s.accent);
    px(tmp, cx - 2, cy - 1, s.eye);
    px(tmp, cx + 2, cy - 1, s.eye);
  }
  return tmp;
}

export function drawBossPortraits() {
  const im = makeImage(4 * 64, 64);
  BOSS_ORDER.forEach((id, index) => {
    const s = BOSS_STYLES[id];
    const ox = index * 64;
    drawBackground(im, ox, 0, s.base);
    const boss = drawBoss(id, s);
    upscale(im, ox + 8, 8, boss, 0, 0, boss.w, boss.h, 3);
  });
  return im;
}
