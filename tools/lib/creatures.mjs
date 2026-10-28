import { makeImage, px, rect, ellipse, line, shade, upscale, hex } from "./pixels.mjs";
import { CHAR_ORDER, CHAR_STYLES, CLASS_ORDER } from "./characters.mjs";

export const MONSTER_ORDER = ["slime", "wolf", "skeleton", "bone_warden", "familiar"];

function shadow(im, cx, cy, rx = 7) {
  ellipse(im, cx, cy, rx, 2, [0, 0, 0], 70);
}

function drawSlime(im, f) {
  const squish = [0, 2, 0, 1][f];
  const lift = [0, 1, 0, -1][f];
  shadow(im, 16, 29, 7 + squish);
  const cy = 23 - Math.max(0, lift) - Math.floor(squish / 2);
  ellipse(im, 16, cy, 8 + squish, 6 - Math.floor(squish / 2), "#4fae5a");
  ellipse(im, 16, cy - 1, 6 + squish, 4, "#66c96f");
  ellipse(im, 13, cy - 3, 2, 1, "#9fe8a6");
  px(im, 12, cy - 1, "#1f3a24");
  px(im, 20, cy - 1, "#1f3a24");
  rect(im, 14, cy + 2, 4, 1, "#2f6a38");
  px(im, 12, cy + 4, "#3d8a48");
  px(im, 20, cy + 4, "#3d8a48");
}

function drawWolf(im, f) {
  const bob = f === 2 ? 1 : 0;
  const leg = [0, 1, 0, -1][f];
  shadow(im, 16, 29, 8);
  rect(im, 8, 19 + bob, 14, 6, "#6b6b78");
  ellipse(im, 14, 19 + bob, 7, 4, "#777784");
  ellipse(im, 22, 17 + bob, 4, 3, "#8b8b98");
  rect(im, 24, 16 + bob, 4, 3, "#8b8b98");
  px(im, 27, 17 + bob, "#2f2f3a");
  rect(im, 24, 15 + bob, 2, 2, "#5f5f6c");
  rect(im, 6, 16 + bob, 3, 3, "#5f5f6c");
  line(im, 6, 18 + bob, 2, 14 + bob, "#6b6b78");
  rect(im, 9, 24, 2, 5 + leg, "#5f5f6c");
  rect(im, 13, 24, 2, 5 - leg, "#777784");
  rect(im, 18, 24, 2, 5 + leg, "#5f5f6c");
  rect(im, 21, 24, 2, 5 - leg, "#777784");
  px(im, 8, 25, "#d9d9e2");
  px(im, 22, 25, "#d9d9e2");
  px(im, 22, 19 + bob, "#e8c05a");
}

function drawSkeleton(im, f) {
  const step = f === 1 ? 1 : f === 3 ? -1 : 0;
  shadow(im, 16, 29, 6);
  rect(im, 14, 7, 4, 4, "#dfe2e8");
  rect(im, 13, 8, 1, 2, "#dfe2e8");
  rect(im, 19, 8, 1, 2, "#dfe2e8");
  px(im, 15, 9, "#4a8a6a");
  px(im, 18, 9, "#4a8a6a");
  rect(im, 15, 11, 2, 2, "#c9ccd4");
  rect(im, 14, 13, 4, 1, "#c9ccd4");
  for (let i = 0; i < 3; i += 1) rect(im, 14, 14 + i * 2, 4, 1, "#dfe2e8");
  rect(im, 15, 13, 2, 7, "#b8bcc6");
  rect(im, 12, 14, 2, 6, "#c9ccd4");
  rect(im, 19, 14, 2, 6, "#c9ccd4");
  rect(im, 14, 20, 2, 5 + step, "#c9ccd4");
  rect(im, 17, 20, 2, 5 - step, "#c9ccd4");
  rect(im, 13, 25 + step, 3, 2, "#a8acb6");
  rect(im, 17, 25 - step, 3, 2, "#a8acb6");
  rect(im, 22, 12, 2, 12, "#b8bcc6");
  rect(im, 21, 11, 4, 1, "#8b8b94");
  px(im, 22, 13, "#e8e8f0");
}

function drawWarden(im, f) {
  const bob = f === 2 ? 1 : 0;
  shadow(im, 16, 30, 9);
  rect(im, 8, 13 + bob, 16, 14, "#3a2447");
  rect(im, 9, 11 + bob, 14, 4, "#4a2f5c");
  rect(im, 12, 6 + bob, 8, 6, "#e2e4ea");
  rect(im, 13, 8 + bob, 2, 2, "#8a2f3a");
  rect(im, 18, 8 + bob, 2, 2, "#8a2f3a");
  for (let i = 0; i < 4; i += 1) rect(im, 13, 12 + i * 2 + bob, 6, 1, "#c9ccd4");
  rect(im, 15, 12 + bob, 2, 9, "#b8bcc6");
  rect(im, 10, 14 + bob, 3, 8, "#dfe2e8");
  rect(im, 20, 14 + bob, 3, 8, "#dfe2e8");
  rect(im, 13, 24, 2, 5, "#c9ccd4");
  rect(im, 18, 24, 2, 5, "#c9ccd4");
  rect(im, 8, 2 + bob, 2, 6, "#8b8b94");
  rect(im, 22, 2 + bob, 2, 6, "#8b8b94");
  px(im, 9, 1 + bob, "#d9a03a");
  px(im, 22, 1 + bob, "#d9a03a");
  px(im, 12, 3 + bob, "#d9a03a");
  px(im, 19, 3 + bob, "#d9a03a");
  rect(im, 25, 8, 2, 20, "#4a2f5c");
  ellipse(im, 26, 7, 3, 4, "#6a3a7a");
  ellipse(im, 26, 7, 1, 2, "#c96aff");
  px(im, 10, 17 + bob, "#8a6aa0");
  px(im, 21, 21 + bob, "#8a6aa0");
}

function drawFamiliar(im, f) {
  const bob = [0, 1, 0, -1][f];
  ellipse(im, 16, 29, 5, 1, [0, 0, 0], 60);
  ellipse(im, 16, 16 + bob, 5, 5, "#6a3a8a");
  ellipse(im, 16, 15 + bob, 3, 3, "#a96ad9");
  px(im, 14, 15 + bob, "#f2d46a");
  px(im, 18, 15 + bob, "#f2d46a");
  rect(im, 15, 19 + bob, 3, 1, "#4a2f5c");
  const wing = f % 2 === 0 ? 1 : 0;
  ellipse(im, 9, 15 + bob - wing, 3, 4, "#8a5aa0");
  ellipse(im, 23, 15 + bob - wing, 3, 4, "#8a5aa0");
  line(im, 15, 21 + bob, 12, 26 + bob, "#a96ad9");
  line(im, 18, 21 + bob, 21, 26 + bob, "#a96ad9");
}

export function drawMonsters() {
  const im = makeImage(4 * 32, MONSTER_ORDER.length * 32);
  const draw = { slime: drawSlime, wolf: drawWolf, skeleton: drawSkeleton, bone_warden: drawWarden, familiar: drawFamiliar };
  MONSTER_ORDER.forEach((id, row) => {
    for (let f = 0; f < 4; f += 1) {
      const temp = makeImage(32, 32);
      draw[id](temp, f);
      for (let y = 0; y < 32; y += 1) {
        for (let x = 0; x < 32; x += 1) {
          const i = (y * 32 + x) * 4;
          if (temp.data[i + 3] === 0) continue;
          const j = ((row * 32 + y) * im.w + (f * 32 + x)) * 4;
          im.data[j] = temp.data[i];
          im.data[j + 1] = temp.data[i + 1];
          im.data[j + 2] = temp.data[i + 2];
          im.data[j + 3] = temp.data[i + 3];
        }
      }
    }
  });
  return im;
}

export function drawPortraits(charSheet) {
  const im = makeImage(5 * 64, Math.ceil(CLASS_ORDER.length / 5) * 64);
  CLASS_ORDER.forEach((id, index) => {
    const col = index % 5;
    const row = Math.floor(index / 5);
    const ox = col * 64;
    const oy = row * 64;
    const base = CHAR_STYLES[id].color || CHAR_STYLES[id].shirt;
    const [r, g, b] = hex(base);
    for (let y = 0; y < 64; y += 1) {
      const t = y / 63;
      const bg = `#${[r * 0.22 + (1 - t) * 30, g * 0.22 + (1 - t) * 28, b * 0.3 + (1 - t) * 38].map((v) => Math.round(Math.min(255, v + 8)).toString(16).padStart(2, "0")).join("")}`;
      rect(im, ox + 1, oy + y, 62, 1, bg);
    }
    rect(im, ox, oy, 64, 2, base);
    rect(im, ox, oy + 62, 64, 2, shade(base, -30));
    rect(im, ox, oy, 2, 64, shade(base, 20));
    rect(im, ox + 62, oy, 2, 64, shade(base, -20));
    const entity = index;
    upscale(im, ox + 8, oy + 7, charSheet, 8, (entity * 4) * 32 + 2, 16, 18, 3);
  });
  return im;
}
