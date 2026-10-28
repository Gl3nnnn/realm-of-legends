import { makeImage, ellipse, px, rect, shade, blit } from "./pixels.mjs";

export const CLASS_ORDER = [
  "warrior", "mage", "archer", "assassin", "paladin",
  "priest", "necromancer", "druid", "monk", "gunslinger",
  "berserker", "summoner", "ranger", "spellblade", "dragonknight",
  "warden", "oracle", "battlemage", "shadowdancer", "artificer",
  "beastmaster", "duelist", "elementalist", "sentinel", "stormcaller",
];

export const CHAR_ORDER = [...CLASS_ORDER, "guard", "merchant", "blacksmith", "healer", "trainer"];

export const CHAR_STYLES = {
  warrior: { skin: "#e8b48b", hair: "#8a5a2b", hairStyle: "short", shirt: "#8a3b3b", pants: "#3f3f4a", accent: "#c9a24a", weapon: "sword", shield: true, cape: "#7a2f2f" },
  mage: { skin: "#e8b48b", hair: "#e8e8f0", hairStyle: "long", shirt: "#3b4f8a", pants: "#2f3f6a", accent: "#6a8ad9", weapon: "staff", hat: "#35507a" },
  archer: { skin: "#d9a06f", hair: "#c9a24a", hairStyle: "short", shirt: "#3f7a3a", pants: "#4a3f2a", accent: "#c9e8a5", weapon: "bow", hood: "#2f5f2f" },
  assassin: { skin: "#c9a0a0", hair: "#1f1f28", hairStyle: "long", shirt: "#2f2f3a", pants: "#1f1f28", accent: "#8a2f3a", weapon: "dagger", hood: "#26262f" },
  paladin: { skin: "#d9a06f", hair: "#d9c26a", hairStyle: "short", shirt: "#d9d4c4", pants: "#8b8b94", accent: "#e8c05a", weapon: "mace", shield: true, cape: "#e8e8f0" },
  priest: { skin: "#e8b48b", hair: "#d9c26a", hairStyle: "long", shirt: "#e8e8f0", pants: "#c9c9d4", accent: "#f2d46a", weapon: "staff", cape: "#f7f7fb" },
  necromancer: { skin: "#b0a0a0", hair: "#1f1f28", hairStyle: "long", shirt: "#2f3a3a", pants: "#1f2828", accent: "#4a8a6a", weapon: "staff", hood: "#232d2d" },
  druid: { skin: "#d9a06f", hair: "#5c3d24", hairStyle: "long", shirt: "#5c7a3a", pants: "#4f5c2a", accent: "#8a6238", weapon: "staff", hat: "#4f6a32" },
  monk: { skin: "#d9a06f", hair: "#2f2f3a", hairStyle: "bald", shirt: "#c96a2a", pants: "#8a4a2a", accent: "#f2d46a", weapon: "none" },
  gunslinger: { skin: "#d9a06f", hair: "#5c3d24", hairStyle: "short", shirt: "#5a3a5a", pants: "#3f3f4a", accent: "#c9a24a", weapon: "gun", hat: "#3a2a3a", cape: "#4a2f4a" },
  berserker: { skin: "#d9a06f", hair: "#c94a4a", hairStyle: "mohawk", shirt: "#6a4a3a", pants: "#3f3f4a", accent: "#c9a24a", weapon: "axe", cape: "#5c3d24" },
  summoner: { skin: "#c9a0c9", hair: "#e8e8f0", hairStyle: "long", shirt: "#4a2f6a", pants: "#2f1f3a", accent: "#a96ad9", weapon: "staff", hood: "#3a2450" },
  ranger: { skin: "#d9a06f", hair: "#4f7a3a", hairStyle: "long", shirt: "#4f7a3a", pants: "#5c3d24", accent: "#8a6238", weapon: "bow", hood: "#3d5f33" },
  spellblade: { skin: "#e8b48b", hair: "#4a6a9a", hairStyle: "long", shirt: "#3b4f8a", pants: "#2f2f3a", accent: "#6a8ad9", weapon: "sword", cape: "#35507a" },
  dragonknight: { skin: "#c9a06f", hair: "#2f2f3a", hairStyle: "short", shirt: "#7a2f2f", pants: "#3f2f2f", accent: "#d9a03a", weapon: "spear", shield: true, cape: "#7a2f2f", helm: "#8b8b94" },
  warden: { skin: "#d9a06f", hair: "#5c3d24", hairStyle: "short", shirt: "#54736a", pants: "#3f4a45", accent: "#b9d1a6", weapon: "mace", shield: true, cape: "#3e5b54" },
  oracle: { skin: "#e8b48b", hair: "#d9c26a", hairStyle: "long", shirt: "#8a7640", pants: "#5c4d2a", accent: "#fff0a8", weapon: "staff", cape: "#d9c26a" },
  battlemage: { skin: "#e8b48b", hair: "#4a6a9a", hairStyle: "short", shirt: "#5869a8", pants: "#30374f", accent: "#b8a9ff", weapon: "sword", cape: "#414e85" },
  shadowdancer: { skin: "#c9a0a0", hair: "#1f1f28", hairStyle: "long", shirt: "#473c68", pants: "#262331", accent: "#c08bda", weapon: "dagger", hood: "#302844", cape: "#382f50" },
  artificer: { skin: "#d9a06f", hair: "#5c3d24", hairStyle: "short", shirt: "#a16d43", pants: "#4a3f3a", accent: "#f0c46b", weapon: "gun", hat: "#735032", helm: "#8b8b94" },
  beastmaster: { skin: "#d9a06f", hair: "#4f7a3a", hairStyle: "ponytail", shirt: "#63834a", pants: "#4f5c2a", accent: "#d0b779", weapon: "bow", hood: "#47663c" },
  duelist: { skin: "#e8b48b", hair: "#6a4230", hairStyle: "ponytail", shirt: "#387f86", pants: "#303b45", accent: "#c1e3d5", weapon: "sword", cape: "#285f68" },
  elementalist: { skin: "#e8b48b", hair: "#e8e8f0", hairStyle: "long", shirt: "#4b8c9d", pants: "#34485b", accent: "#a6eef0", weapon: "staff", hat: "#367283" },
  sentinel: { skin: "#d9a06f", hair: "#8a5a2b", hairStyle: "short", shirt: "#447b84", pants: "#3f454a", accent: "#d1e4d7", weapon: "spear", shield: true, cape: "#355f66", helm: "#8b8b94" },
  stormcaller: { skin: "#c9a0a0", hair: "#1f1f28", hairStyle: "long", shirt: "#4877a6", pants: "#2f3f5a", accent: "#f1df7a", weapon: "staff", cape: "#365b83" },
  guard: { skin: "#d9a06f", hair: "#5c3d24", hairStyle: "short", shirt: "#3b4f7a", pants: "#3f3f4a", accent: "#a9b4c4", weapon: "spear", helm: "#8b8b94" },
  merchant: { skin: "#e8b48b", hair: "#8a5a2b", hairStyle: "short", shirt: "#7a5a2a", pants: "#5c3d24", accent: "#d9b45a", weapon: "none", hat: "#6a4a22" },
  blacksmith: { skin: "#c9a06f", hair: "#2f2f3a", hairStyle: "short", shirt: "#5f4a3a", pants: "#3f3f4a", accent: "#8b8b94", weapon: "mace" },
  healer: { skin: "#e8b48b", hair: "#d9c26a", hairStyle: "long", shirt: "#e8e8f0", pants: "#c9c9d4", accent: "#f2d46a", weapon: "staff", hood: "#e8e8f0" },
  trainer: { skin: "#d9a06f", hair: "#8a5a2b", hairStyle: "short", shirt: "#6a5a3a", pants: "#4a3f2a", accent: "#8a6238", weapon: "sword", cape: "#4f6a32" },
};

function drawWeapon(im, x, y, w, accent, metal) {
  if (w === "sword") {
    rect(im, x, y + 2, 2, 9, metal);
    rect(im, x, y + 2, 1, 9, shade(metal, 30));
    rect(im, x - 2, y + 11, 6, 1, accent);
    rect(im, x, y + 12, 2, 3, "#5c3d24");
  } else if (w === "staff") {
    rect(im, x, y, 2, 15, "#5c3d24");
    ellipse(im, x + 1, y - 2, 3, 3, accent);
    ellipse(im, x + 1, y - 2, 1, 1, shade(accent, 60));
  } else if (w === "bow") {
    rect(im, x, y + 2, 1, 10, "#8a6238");
    rect(im, x + 1, y + 1, 1, 1, "#8a6238");
    rect(im, x + 1, y + 12, 1, 1, "#8a6238");
    rect(im, x, y + 3, 1, 8, "#d9c2a3");
  } else if (w === "dagger") {
    rect(im, x, y + 7, 2, 5, metal);
    rect(im, x - 1, y + 12, 4, 1, accent);
    rect(im, x, y + 13, 2, 2, "#5c3d24");
  } else if (w === "axe") {
    rect(im, x, y, 2, 15, "#5c3d24");
    rect(im, x - 3, y + 2, 4, 5, metal);
    rect(im, x + 2, y + 2, 3, 5, shade(metal, -20));
  } else if (w === "mace") {
    rect(im, x, y + 4, 2, 11, "#5c3d24");
    ellipse(im, x + 1, y + 3, 3, 3, metal);
    px(im, x + 1, y, accent);
    px(im, x - 2, y + 3, accent);
    px(im, x + 4, y + 3, accent);
  } else if (w === "spear") {
    rect(im, x, y - 2, 2, 18, "#7a5232");
    rect(im, x - 1, y - 5, 4, 4, metal);
    rect(im, x, y - 7, 2, 2, shade(metal, 40));
  } else if (w === "gun") {
    rect(im, x - 1, y + 7, 6, 2, "#4f4f58");
    rect(im, x - 1, y + 9, 2, 4, "#7a5232");
    rect(im, x + 4, y + 7, 2, 2, metal);
  } else if (w === "shield" || w === "fire" || w === "ice" || w === "arcane") {
    rect(im, x, y + 10, 1, 5, accent);
  }
}

function drawShield(im, x, y, accent) {
  rect(im, x, y, 4, 8, "#6b6b78");
  rect(im, x, y, 4, 1, "#8b8b94");
  rect(im, x + 1, y + 2, 2, 4, accent);
  rect(im, x + 1, y + 7, 2, 1, "#4f4f58");
}

function drawHair(im, cx, top, o) {
  const style = o.hairStyle;
  if (style === "short") {
    rect(im, cx - 5, top, 10, 3, o.hair);
    rect(im, cx - 5, top + 3, 2, 3, o.hair);
    rect(im, cx + 3, top + 3, 2, 3, o.hair);
  } else if (style === "long") {
    rect(im, cx - 5, top, 10, 3, o.hair);
    rect(im, cx - 6, top + 3, 2, 7, o.hair);
    rect(im, cx + 4, top + 3, 2, 7, o.hair);
  } else if (style === "mohawk") {
    rect(im, cx - 1, top - 2, 3, 7, o.hair);
    px(im, cx, top + 1, shade(o.hair, 30));
  } else if (style === "bald") {
    px(im, cx - 2, top + 1, shade(o.skin, 25));
  } else if (style === "ponytail") {
    rect(im, cx - 5, top, 10, 3, o.hair);
    rect(im, cx - 7, top + 2, 2, 6, o.hair);
  }
}

function drawFrame(im, ox, oy, dir, frame, o) {
  const metal = "#c9c9d4";
  const step = frame === 1 ? 1 : frame === 3 ? -1 : 0;
  const bob = frame === 2 ? 1 : 0;
  const baseY = 15 + bob;
  const eye = "#2f2f3a";

  ellipse(im, ox + 16, oy + 29, 7, 2, [0, 0, 0], 70);

  if (dir === "up" && o.cape) rect(im, ox + 10, oy + baseY + 2, 12, 10, o.cape);
  else if (o.cape) {
    rect(im, ox + 9, oy + baseY + 2, 2, 9, o.cape);
    rect(im, ox + 21, oy + baseY + 2, 2, 9, o.cape);
  }

  if (dir === "left") {
    rect(im, ox + 13 - step, oy + 23, 3, 6, o.pants);
    rect(im, ox + 17 + step, oy + 23, 3, 6, shade(o.pants, -15));
    rect(im, ox + 12 - step, oy + 28, 4, 2, "#3f2f22");
    rect(im, ox + 17 + step, oy + 28, 4, 2, "#3f2f22");
  } else {
    rect(im, ox + 12, oy + 23 + Math.max(0, step), 3, 6 - Math.abs(step), o.pants);
    rect(im, ox + 17, oy + 23 + Math.max(0, -step), 3, 6 - Math.abs(step), shade(o.pants, -15));
    rect(im, ox + 12, oy + 28, 4, 2, "#3f2f22");
    rect(im, ox + 17, oy + 28, 4, 2, "#3f2f22");
  }

  if (dir === "left") {
    rect(im, ox + 12, oy + baseY, 8, 9, o.shirt);
    rect(im, ox + 12, oy + baseY + 7, 8, 2, o.accent);
    rect(im, ox + 10, oy + baseY + 2, 2, 5, o.shirt);
    rect(im, ox + 11, oy + baseY + 6, 2, 2, o.skin);
  } else {
    rect(im, ox + 11, oy + baseY, 10, 9, o.shirt);
    rect(im, ox + 11, oy + baseY + 7, 10, 2, o.accent);
    rect(im, ox + 9, oy + baseY + 2, 2, 6, o.shirt);
    rect(im, ox + 21, oy + baseY + 2, 2, 6, shade(o.shirt, -15));
    px(im, ox + 9, oy + baseY + 8, o.skin);
    px(im, ox + 22, oy + baseY + 8, o.skin);
  }

  const cx = dir === "left" ? ox + 14 : ox + 16;
  ellipse(im, cx, oy + 10 + bob, 5, 5, o.skin);
  if (dir === "up") {
    drawHair(im, cx, oy + 6 + bob, o);
  } else if (dir === "left") {
    drawHair(im, cx, oy + 6 + bob, o);
    px(im, cx - 2, oy + 11 + bob, eye);
    px(im, cx + 1, oy + 13 + bob, shade(o.skin, -25));
  } else {
    drawHair(im, cx, oy + 6 + bob, o);
    px(im, cx - 3, oy + 11 + bob, eye);
    px(im, cx + 2, oy + 11 + bob, eye);
    px(im, cx - 1, oy + 13 + bob, shade(o.skin, -25));
  }

  if (o.helm) {
    rect(im, cx - 5, oy + 5 + bob, 10, 4, o.helm);
    rect(im, cx - 5, oy + 5 + bob, 10, 1, shade(o.helm, 25));
    if (o.sprite === "dragonknight") {
      rect(im, cx - 7, oy + 3 + bob, 2, 3, "#e8e0d0");
      rect(im, cx + 5, oy + 3 + bob, 2, 3, "#e8e0d0");
    }
  }
  if (o.hood) {
    ellipse(im, cx, oy + 9 + bob, 7, 7, o.hood);
    ellipse(im, cx, oy + 10 + bob, 4, 4, o.skin);
    if (dir === "up") ellipse(im, cx, oy + 9 + bob, 5, 5, o.hood);
  }
  if (o.hat) {
    rect(im, cx - 6, oy + 5 + bob, 12, 2, o.hat);
    rect(im, cx - 4, oy + 3 + bob, 8, 2, o.hat);
    rect(im, cx - 2, oy + 1 + bob, 4, 2, shade(o.hat, 15));
  }

  if (dir !== "up") {
    const ey = oy + 11 + bob;
    if (dir === "left") {
      px(im, cx - 2, ey, eye);
      px(im, cx + 1, ey + 2, shade(o.skin, -25));
    } else {
      px(im, cx - 3, ey, eye);
      px(im, cx + 2, ey, eye);
      px(im, cx, ey + 2, shade(o.skin, -25));
    }
  }

  if (o.weapon !== "none") {
    if (dir === "left") drawWeapon(im, ox + 4, oy + baseY - 3, o.weapon, o.accent, metal);
    else drawWeapon(im, ox + 23, oy + baseY - 3, o.weapon, o.accent, metal);
  }
  if (o.shield) {
    if (dir === "left") drawShield(im, ox + 18, oy + baseY + 1, o.accent);
    else drawShield(im, ox + 6, oy + baseY + 1, o.accent);
  }
}

function mirror(image) {
  const out = makeImage(image.w, image.h);
  for (let y = 0; y < image.h; y += 1) {
    for (let x = 0; x < image.w; x += 1) {
      const i = (y * image.w + (image.w - 1 - x)) * 4;
      const j = (y * image.w + x) * 4;
      out.data[j] = image.data[i];
      out.data[j + 1] = image.data[i + 1];
      out.data[j + 2] = image.data[i + 2];
      out.data[j + 3] = image.data[i + 3];
    }
  }
  return out;
}

export function drawCharacters() {
  const im = makeImage(4 * 32, CHAR_ORDER.length * 4 * 32);
  CHAR_ORDER.forEach((id, entity) => {
    const o = { ...CHAR_STYLES[id], sprite: id };
    const dirs = ["down", "left", "right", "up"];
    dirs.forEach((dir, d) => {
      for (let f = 0; f < 4; f += 1) {
        const temp = makeImage(32, 32);
        drawFrame(temp, 0, 0, dir, f, o);
        blit(im, temp, f * 32, (entity * 4 + d) * 32);
      }
    });
  });
  return im;
}
