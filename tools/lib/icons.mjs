import { makeImage, px, rect, ellipse, line, hex, shade } from "./pixels.mjs";

const COLORS = {
  fire: "#f2762e", ice: "#6ab4e8", arcane: "#a96ad9", meteor: "#d95f2e",
  lightning: "#f2d44a", holy: "#f2e6a0", shadow: "#6a4a8a", poison: "#6aa03a",
  nature: "#5fae4a", wind: "#a8d9c9", earth: "#a37a4a", water: "#4a8ad9",
  blood: "#a32f3a", void: "#5f3a7a", dragon: "#c94a3a", physical: "#c9c9d4",
  rage: "#d94a3a", heal: "#6ad98a", gold: "#e8c05a", steel: "#c9c9d4",
  // Skill icons below the generic set: each one needs its own readable colour.
  flurry: "#c9c9d4", combo: "#c9c9d4", bullet: "#c9c9d4", roll: "#c9c9d4",
  mark: "#e8c05a", command: "#e8c05a", ricochet: "#e8c05a",
  dash: "#a8d9c9", gust: "#a8d9c9", storm: "#f2d44a",
  burst: "#a96ad9", familiar: "#a96ad9",
  breath: "#f2762e", infernal: "#f2762e",
  scale: "#c94a3a", leap: "#c94a3a",
  roots: "#5fae4a", beast: "#5fae4a", camouflage: "#5fae4a", link: "#5fae4a",
  kick: "#d9a06f", slam: "#a37a4a", rock: "#a37a4a",
  frenzy: "#d94a3a", explosion: "#d95f2e",
  smoke: "#8a8a99", moon: "#6a4a8a", veil: "#6a4a8a",
  judgment: "#f2e6a0", divine: "#f2e6a0", nova: "#f2e6a0",
  frost: "#6ab4e8", multiarrow: "#c9c9d4", eye: "#c9c9d4",
};

export function iconColor(name) {
  for (const key of Object.keys(COLORS)) if (name.includes(key)) return COLORS[key];
  if (name.includes("potion_red") || name.includes("blood")) return COLORS.blood;
  if (name.includes("potion_blue")) return COLORS.water;
  if (name.includes("shield") || name.includes("armor") || name.includes("helm")) return COLORS.steel;
  return "#d9c2a3";
}

function blade(im, c) {
  rect(im, 7, 2, 2, 9, c);
  rect(im, 7, 2, 1, 9, shade(c, 40));
  rect(im, 5, 11, 6, 1, "#e8c05a");
  rect(im, 7, 12, 2, 3, "#7a5232");
  px(im, 8, 1, shade(c, 60));
}

function staff(im, c) {
  rect(im, 7, 6, 2, 9, "#7a5232");
  ellipse(im, 8, 4, 3, 3, c);
  ellipse(im, 8, 3, 1, 1, shade(c, 70));
}

function bow(im, c) {
  rect(im, 5, 3, 1, 10, c);
  rect(im, 6, 2, 1, 1, c);
  rect(im, 6, 13, 1, 1, c);
  rect(im, 6, 3, 1, 9, "#e8e0d0");
  line(im, 7, 7, 14, 7, "#d9c2a3");
  px(im, 14, 7, "#e8c05a");
}

function dagger(im, c) {
  rect(im, 7, 4, 2, 6, c);
  rect(im, 7, 4, 1, 6, shade(c, 40));
  rect(im, 5, 10, 6, 1, "#e8c05a");
  rect(im, 7, 11, 2, 3, "#7a5232");
}

function mace(im, c) {
  rect(im, 7, 7, 2, 8, "#7a5232");
  ellipse(im, 8, 5, 4, 3, c);
  px(im, 8, 1, "#e8c05a");
  px(im, 3, 5, "#e8c05a");
  px(im, 13, 5, "#e8c05a");
}

function axe(im, c) {
  rect(im, 7, 2, 2, 13, "#7a5232");
  rect(im, 9, 3, 4, 5, c);
  rect(im, 12, 4, 2, 3, shade(c, -20));
  rect(im, 3, 3, 4, 5, shade(c, 20));
}

function lance(im, c) {
  line(im, 5, 13, 12, 4, "#7a5232");
  rect(im, 11, 2, 3, 3, c);
  px(im, 13, 1, shade(c, 40));
}

function shield(im, c) {
  rect(im, 3, 3, 10, 8, c);
  rect(im, 4, 11, 8, 2, shade(c, -25));
  rect(im, 6, 13, 4, 2, shade(c, -35));
  rect(im, 4, 4, 2, 6, shade(c, 40));
  rect(im, 7, 6, 2, 4, "#e8c05a");
}

function flask(im, c) {
  rect(im, 6, 1, 4, 3, "#d9e2e8");
  rect(im, 6, 4, 4, 2, "#b8c2c9");
  ellipse(im, 8, 10, 5, 4, c);
  ellipse(im, 7, 8, 2, 2, shade(c, 40));
  px(im, 8, 2, "#f7fbfd");
}

function armor(im, c) {
  rect(im, 4, 4, 8, 6, c);
  rect(im, 3, 5, 2, 4, c);
  rect(im, 11, 5, 2, 4, c);
  rect(im, 5, 10, 6, 4, shade(c, -20));
  rect(im, 7, 5, 2, 5, shade(c, -30));
  px(im, 5, 5, shade(c, 40));
}

function helm(im, c) {
  ellipse(im, 8, 7, 5, 5, c);
  rect(im, 3, 7, 10, 3, c);
  rect(im, 4, 9, 8, 3, shade(c, -20));
  rect(im, 7, 8, 2, 3, "#2f2f3a");
  quad(im, 5, 5, 2, "#e8e8f0");
}

function boots(im, c) {
  rect(im, 3, 6, 4, 6, c);
  rect(im, 3, 11, 6, 2, shade(c, -25));
  rect(im, 9, 4, 4, 8, shade(c, 10));
  rect(im, 9, 11, 6, 2, shade(c, -20));
  rect(im, 3, 5, 4, 1, shade(c, 30));
}

function ring(im, c) {
  ellipse(im, 8, 10, 5, 4, "#e8c05a");
  ellipse(im, 8, 10, 3, 2, "#000000", 0);
  for (let y = -2; y <= 2; y += 1) for (let x = -2; x <= 2; x += 1) if (Math.abs(x) + Math.abs(y) <= 2) px(im, 8 + x, 4 + y, c);
  px(im, 7, 3, shade(c, 60));
}

function potion(im, c) {
  rect(im, 6, 1, 4, 2, "#a37a4a");
  rect(im, 7, 3, 2, 2, "#d9e2e8");
  ellipse(im, 8, 10, 5, 4, c);
  ellipse(im, 7, 8, 2, 2, shade(c, 50));
}

function herb(im, c) {
  line(im, 8, 13, 8, 6, "#5f7a3a");
  ellipse(im, 5, 6, 3, 2, c);
  ellipse(im, 11, 8, 3, 2, shade(c, 20));
  ellipse(im, 6, 10, 2, 1, shade(c, -20));
}

function bone(im, c) {
  line(im, 4, 11, 12, 4, c);
  ellipse(im, 4, 12, 2, 2, c);
  ellipse(im, 12, 3, 2, 2, c);
  px(im, 5, 10, "#f7f7fb");
}

function gem(im, c) {
  for (let y = 0; y < 7; y += 1) {
    const w = y < 3 ? 2 + y * 2 : 9 - (y - 3);
    rect(im, 8 - Math.floor(w / 2), 4 + y, w, 1, y < 2 ? shade(c, 50) : c);
  }
  rect(im, 5, 8, 6, 1, shade(c, -30));
}

function coin(im, c) {
  ellipse(im, 8, 8, 6, 6, c);
  ellipse(im, 8, 8, 4, 4, shade(c, -20));
  rect(im, 7, 5, 2, 6, shade(c, 40));
  px(im, 5, 5, "#fff2b8");
}

function skull(im, c) {
  ellipse(im, 8, 7, 5, 5, c);
  rect(im, 4, 10, 8, 3, c);
  rect(im, 5, 6, 2, 2, "#2f2f3a");
  rect(im, 9, 6, 2, 2, "#2f2f3a");
  px(im, 7, 10, "#2f2f3a");
  px(im, 9, 10, "#2f2f3a");
}

function bolt(im, c) {
  for (let i = 0; i < 8; i += 1) rect(im, 8 - Math.floor(i / 2), 2 + i, 2, 1, c);
  rect(im, 4, 2, 4, 1, c);
  rect(im, 9, 9, 4, 1, c);
}

function flame(im, c) {
  ellipse(im, 8, 10, 4, 4, c);
  rect(im, 6, 3, 4, 7, c);
  rect(im, 7, 1, 2, 5, c);
  ellipse(im, 8, 10, 2, 2, shade(c, 60));
  px(im, 8, 6, "#ffe08a");
}

function drop(im, c) {
  rect(im, 7, 3, 2, 4, c);
  ellipse(im, 8, 9, 4, 4, c);
  px(im, 6, 8, shade(c, 60));
}

function star(im, c) {
  for (let y = 0; y < 12; y += 1) for (let x = 0; x < 12; x += 1) {
    const dx = Math.abs(x - 6);
    const dy = Math.abs(y - 6);
    if (dx + dy < 4 || (dx < 1 && dy < 6) || (dy < 1 && dx < 6)) px(im, 2 + x, 2 + y, c);
  }
  px(im, 7, 6, shade(c, 70));
}

function swirl(im, c) {
  ellipse(im, 8, 8, 5, 5, c);
  ellipse(im, 8, 8, 3, 3, [0, 0, 0], 0);
  rect(im, 8, 8, 5, 2, c);
  px(im, 4, 5, shade(c, 40));
}

function quad(im, x, y, w, c) {
  rect(im, x, y, w, 1, c);
}

function arrow(im, c) {
  line(im, 3, 12, 11, 4, "#8a6238");
  rect(im, 9, 3, 3, 1, c);
  rect(im, 11, 2, 1, 3, c);
  px(im, 12, 2, shade(c, 30));
  quad(im, 4, 13, 2, "#e8e0d0");
  quad(im, 6, 11, 2, "#e8e0d0");
}

function book(im, c) {
  rect(im, 3, 3, 10, 10, c);
  rect(im, 3, 3, 2, 10, shade(c, -25));
  rect(im, 5, 5, 7, 6, "#e8e0d0");
  rect(im, 7, 5, 1, 6, "#b8a888");
  rect(im, 9, 7, 2, 1, "#b8a888");
}

function trap(im, c) {
  rect(im, 2, 11, 12, 2, "#5f5f68");
  for (let i = 0; i < 4; i += 1) {
    for (let y = 0; y < 5; y += 1) {
      const w = Math.max(1, 4 - y);
      rect(im, 3 + i * 3, 7 + y, w, 1, i % 2 === 0 ? c : shade(c, -20));
    }
  }
}

function mask(im, c) {
  ellipse(im, 8, 8, 5, 4, c);
  rect(im, 3, 8, 10, 2, c);
  rect(im, 5, 6, 2, 2, "#1f1f28");
  rect(im, 9, 6, 2, 2, "#1f1f28");
  px(im, 8, 10, "#1f1f28");
}

function note(im, c) {
  ellipse(im, 6, 12, 3, 2, c);
  rect(im, 8, 3, 2, 9, c);
  rect(im, 10, 3, 3, 2, c);
  px(im, 5, 10, "#f7f7fb");
}

function eye(im, c) {
  ellipse(im, 8, 8, 6, 4, "#e8e0d0");
  ellipse(im, 8, 8, 3, 3, c);
  ellipse(im, 8, 8, 1, 1, "#1f1f28");
}

function rune(im, c) {
  rect(im, 3, 3, 10, 10, "#2f2f3a");
  rect(im, 4, 4, 8, 8, shade(c, -40));
  rect(im, 7, 5, 2, 6, c);
  rect(im, 5, 7, 6, 1, c);
  rect(im, 5, 10, 6, 1, c);
}

export function drawIcon(name) {
  const im = makeImage(16, 16);
  const c = iconColor(name);
  // Specific skills come first: a flameblade is still a blade, but it must look
  // different from a plain sword, so the narrowest name wins.
  if (name.includes("flameblade")) blade(im, "#ff7a2e");
  else if (name.includes("frostblade")) blade(im, "#8fe6ff");
  else if (name.includes("flurry")) flurryIcon(im, c);
  else if (name.includes("judgment")) judgmentIcon(im, c);
  else if (name.includes("nova")) novaIcon(im, c);
  else if (name.includes("combo")) comboIcon(im, c);
  else if (name.includes("dragon")) dragonIcon(im, c);
  else if (name.includes("ricochet")) ricochetIcon(im, c);
  else if (name.includes("bullet")) bulletIcon(im, c);
  else if (name.includes("roll")) rollIcon(im, c);
  else if (name.includes("familiar")) familiarIcon(im, c);
  else if (name.includes("link")) linkIcon(im, c);
  else if (name.includes("command")) commandIcon(im, c);
  else if (name.includes("camouflage")) camouflageIcon(im, c);
  else if (name.includes("mark")) markIcon(im, c);
  else if (name.includes("dash")) dashIcon(im, c);
  else if (name.includes("burst")) burstIcon(im, c);
  else if (name.includes("breath")) breathIcon(im, c);
  else if (name.includes("scale")) scaleIcon(im, c);
  else if (name.includes("leap")) leapIcon(im, c);
  else if (name.includes("infernal")) infernalIcon(im, c);
  else if (name.includes("roots")) rootsIcon(im, c);
  else if (name.includes("beast")) beastIcon(im, c);
  else if (name.includes("kick")) kickIcon(im, c);
  else if (name.includes("smoke")) smokeIcon(im, c);
  else if (name.includes("slam")) slamIcon(im, c);
  else if (name.includes("frenzy")) frenzyIcon(im, c);
  else if (name.includes("explosion")) explosionIcon(im, c);
  else if (name.includes("multiarrow")) multiArrow(im, c);
  else if (name.includes("rain")) rainArrows(im, c);
  else if (name.includes("shadow")) moonIcon(im, "#9a5cf0");
  else if (["sword", "blade", "slash", "cleave"].some((k) => name.includes(k))) blade(im, c);
  else if (name.includes("staff") || name.includes("wand")) staff(im, c);
  else if (name.includes("bow") && !name.includes("rain")) bow(im, c);
  else if (name.includes("dagger") || name.includes("stab")) dagger(im, c);
  else if (name.includes("mace") || name.includes("hammer")) mace(im, c);
  else if (name.includes("axe")) axe(im, c);
  else if (name.includes("lance") || name.includes("spear")) lance(im, c);
  else if (name.includes("shield")) shield(im, c);
  else if (name.includes("whirlwind")) swirl(im, c);
  else if (name.includes("fire") || name.includes("flame") || name.includes("burn") || name.includes("meteor")) flame(im, c);
  else if (name.includes("ice") || name.includes("frost") || name.includes("freeze")) snowflakeIcon(im, c);
  else if (name.includes("arcane") || name.includes("magic")) arcDiamond(im, c);
  else if (name.includes("lightning") || name.includes("bolt") || name.includes("storm")) bolt(im, c);
  else if (name.includes("holy") || name.includes("smite") || name.includes("divine")) radiantIcon(im, c);
  else if (name.includes("shadow") || name.includes("dark") || name.includes("curse") || name.includes("void")) swirl(im, "#6a4a8a");
  else if (name.includes("poison") || name.includes("venom") || name.includes("toxic")) drop(im, c);
  else if (name.includes("nature") || name.includes("thorn") || name.includes("vine") || name.includes("herb")) herb(im, c);
  else if (name.includes("wind") || name.includes("gale")) gustIcon(im, c);
  else if (name.includes("earth") || name.includes("rock")) rockIcon(im, c);
  else if (name.includes("ore")) gem(im, c);
  else if (name.includes("water") || name.includes("tide")) drop(im, c);
  else if (name.includes("blood") || name.includes("drain")) drop(im, "#a32f3a");
  else if (name.includes("heal") || name.includes("mend") || name.includes("renew")) {
    rect(im, 7, 3, 2, 10, c);
    rect(im, 3, 7, 10, 2, c);
  } else if (name.includes("potion_red")) potion(im, "#d94a4a");
  else if (name.includes("potion_blue")) potion(im, "#4a8ad9");
  else if (name.includes("gel")) drop(im, "#6ac96f");
  else if (name.includes("pelt") || name.includes("hide")) armor(im, "#8a6238");
  else if (name.includes("bone")) bone(im, "#e2e4ea");
  else if (name.includes("gem")) gem(im, "#6ad9c9");
  else if (name.includes("coin")) coin(im, "#e8c05a");
  else if (name.includes("armor") || name.includes("robe")) armor(im, c);
  else if (name.includes("helm") || name.includes("hood")) helm(im, c);
  else if (name.includes("boots")) boots(im, c);
  else if (name.includes("ring")) ring(im, c);
  else if (name.includes("book")) book(im, c);
  else if (name.includes("trap") || name.includes("spike")) trap(im, c);
  else if (name.includes("stealth")) mask(im, c);
  else if (name.includes("eye")) eye(im, c);
  else if (name.includes("summon")) rune(im, c);
  else if (name.includes("skull") || name.includes("curse")) skull(im, c);
  else if (name.includes("music") || name.includes("song")) note(im, c);
  else if (name.includes("arrow")) arrow(im, c);
  else if (name.includes("fist") || name.includes("punch") || name.includes("kick")) {
    ellipse(im, 8, 9, 5, 4, "#d9a06f");
    rect(im, 4, 6, 2, 3, "#d9a06f");
    rect(im, 7, 5, 2, 3, "#d9a06f");
    rect(im, 10, 6, 2, 3, "#d9a06f");
    rect(im, 4, 11, 8, 2, "#b8895f");
  }
  else if (name.includes("gun")) {
    rect(im, 3, 7, 10, 3, "#5f5f6c");
    rect(im, 3, 10, 3, 4, "#7a5232");
    rect(im, 11, 6, 2, 2, c);
  }
  else if (name.includes("shield")) shield(im, c);
  else if (name.includes("rage") || name.includes("berserk")) flame(im, "#d94a3a");
  else if (name.includes("taunt") || name.includes("shout")) {
    ellipse(im, 6, 8, 3, 4, "#d9a06f");
    for (let i = 0; i < 3; i += 1) line(im, 10 + i * 2, 5 + i, 10 + i * 2, 11 - i, c);
  } else if (name.includes("barrier")) {
    for (let y = 0; y < 12; y += 1) for (let x = 0; x < 12; x += 1) {
      const dx = Math.abs(x - 6);
      const dy = Math.abs(y - 6);
      if (dx + dy >= 4 && dx + dy <= 6) px(im, 2 + x, 2 + y, c);
    }
  } else rune(im, c);

  rect(im, 0, 0, 16, 1, "#2f2f3a", 90);
  rect(im, 0, 15, 16, 1, "#14121a", 110);
  return im;
}

// --- Skill icons with a silhouette of their own -------------------------------------
// Everything below used to fall through to a shared star or rune, which is why a
// flurry, a judgement and a nova all looked like the same glowing orb.

const R = Math.round;

function snowflakeIcon(im, c) {
  for (let i = 0; i < 3; i += 1) {
    const a = (Math.PI / 3) * i;
    const dx = R(Math.cos(a) * 6);
    const dy = R(Math.sin(a) * 6);
    line(im, 8 - dx, 8 - dy, 8 + dx, 8 + dy, c);
    const sx = R(Math.cos(a + Math.PI / 2) * 2);
    const sy = R(Math.sin(a + Math.PI / 2) * 2);
    for (const s of [-1, 1]) px(im, 8 + R(dx * 0.5) + s * sx, 8 + R(dy * 0.5) + s * sy, shade(c, 40));
  }
  px(im, 8, 8, "#ffffff");
}

function arcDiamond(im, c) {
  for (let y = -5; y <= 5; y += 1) {
    const w = 5 - Math.abs(y);
    rect(im, 8 - w, 8 + y, w * 2 + 1, 1, y < 0 ? shade(c, 35) : c);
  }
  for (let y = -2; y <= 2; y += 1) {
    const w = 2 - Math.abs(y);
    rect(im, 8 - w, 8 + y, w * 2 + 1, 1, shade(c, 75));
  }
  px(im, 8, 5, "#ffffff");
}

function radiantIcon(im, c) {
  rect(im, 7, 2, 2, 12, c);
  rect(im, 2, 7, 12, 2, c);
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    line(im, 8 + dx * 5, 8 + dy * 5, 8 + dx * 7, 8 + dy * 7, shade(c, -25));
  }
  rect(im, 7, 7, 2, 2, "#ffffff");
}

function multiArrow(im, c) {
  for (const off of [-3, 0, 3]) {
    line(im, 2 + off, 13, 8 + off, 5, "#8a6238");
    rect(im, 8 + off, 4, 3, 1, c);
    px(im, 10 + off, 3, shade(c, 30));
  }
}

function rainArrows(im, c) {
  for (let i = 0; i < 3; i += 1) {
    const x = 3 + i * 4;
    line(im, x + 4, 2, x, 12, "#8a6238");
    rect(im, x - 1, 11, 3, 1, c);
    px(im, x, 13, shade(c, 30));
  }
}

function flurryIcon(im, c) {
  line(im, 2, 12, 12, 3, c);
  line(im, 4, 3, 13, 12, shade(c, 30));
  line(im, 2, 6, 9, 13, shade(c, -20));
  px(im, 12, 3, "#ffffff");
  px(im, 13, 12, "#ffffff");
}

function judgmentIcon(im, c) {
  rect(im, 7, 5, 2, 9, shade(c, 10));
  rect(im, 7, 5, 1, 8, "#ffffff");
  rect(im, 5, 13, 6, 1, "#e8c05a");
  for (const x of [1, 4, 11, 14]) line(im, x, 0, x, 3, shade(c, 45));
  px(im, 8, 2, "#ffffff");
}

function novaIcon(im, c) {
  for (let i = 0; i < 8; i += 1) {
    const a = (Math.PI / 4) * i;
    const dx = R(Math.cos(a));
    const dy = R(Math.sin(a));
    line(im, 8 + dx * 3, 8 + dy * 3, 8 + dx * 7, 8 + dy * 7, i % 2 ? shade(c, 40) : c);
  }
  ellipse(im, 8, 8, 2, 2, "#ffffff");
}

function comboIcon(im, c) {
  for (let i = 0; i < 3; i += 1) {
    const y = 3 + i * 4;
    line(im, 3, y + 3, 8, y, c);
    line(im, 8, y, 13, y + 3, shade(c, i === 1 ? -15 : 20));
  }
}

function dragonIcon(im, c) {
  ellipse(im, 9, 9, 5, 4, c);
  rect(im, 11, 8, 4, 3, shade(c, -10));
  px(im, 13, 9, "#1f1f28");
  px(im, 8, 8, "#ffe08a");
  line(im, 5, 5, 2, 2, shade(c, 45));
  line(im, 7, 4, 6, 1, shade(c, 45));
  rect(im, 12, 11, 3, 1, "#1f1f28");
}

function ricochetIcon(im, c) {
  rect(im, 3, 9, 5, 3, "#c9c9d4");
  px(im, 8, 9, c);
  px(im, 9, 9, c);
  line(im, 9, 8, 13, 3, c);
  line(im, 13, 3, 9, 1, shade(c, 40));
  line(im, 9, 12, 13, 14, shade(c, -20));
}

function bulletIcon(im, c) {
  rect(im, 6, 5, 4, 7, c);
  ellipse(im, 8, 5, 2, 2, shade(c, 45));
  rect(im, 5, 12, 6, 2, "#e8c05a");
  px(im, 7, 7, "#ffffff");
}

function rollIcon(im, c) {
  let prev = null;
  for (let i = 0; i <= 9; i += 1) {
    const a = (Math.PI / 4.5) * i;
    const p = [R(8 + Math.cos(a) * 5), R(8 + Math.sin(a) * 5)];
    if (prev) line(im, prev[0], prev[1], p[0], p[1], c);
    prev = p;
  }
  rect(im, 11, 9, 3, 3, shade(c, 40));
  px(im, 3, 4, shade(c, 60));
}

function smokeIcon(im, c) {
  ellipse(im, 6, 10, 4, 3, shade(c, -10));
  ellipse(im, 10, 8, 4, 3, c);
  ellipse(im, 7, 5, 3, 2, shade(c, 25));
  ellipse(im, 11, 4, 2, 2, shade(c, 40));
  px(im, 9, 7, "#ffffff");
}

function rootsIcon(im, c) {
  line(im, 8, 14, 8, 8, "#7a5232");
  line(im, 8, 10, 4, 6, c);
  line(im, 8, 9, 12, 5, shade(c, 25));
  line(im, 8, 8, 5, 3, shade(c, -20));
  line(im, 8, 8, 11, 2, c);
  px(im, 8, 12, shade(c, 50));
}

function beastIcon(im, c) {
  for (let i = 0; i < 3; i += 1) {
    const x = 3 + i * 4;
    line(im, x, 3, x + 2, 13, i === 1 ? shade(c, 35) : c);
    px(im, x + 2, 13, "#ffffff");
  }
}

function kickIcon(im, c) {
  rect(im, 5, 4, 3, 8, "#b8895f");
  rect(im, 8, 9, 6, 3, "#d9a06f");
  rect(im, 8, 12, 6, 2, "#8a6238");
  line(im, 2, 6, 5, 3, shade(c, 30));
}

function slamIcon(im, c) {
  rect(im, 4, 2, 8, 7, "#d9a06f");
  rect(im, 3, 9, 3, 3, "#b8895f");
  rect(im, 10, 9, 3, 3, "#b8895f");
  line(im, 2, 14, 6, 12, c);
  line(im, 14, 14, 10, 12, shade(c, 30));
  px(im, 8, 13, c);
}

function burstIcon(im, c) {
  for (let i = 0; i < 6; i += 1) {
    const a = (Math.PI / 3) * i;
    const dx = R(Math.cos(a));
    const dy = R(Math.sin(a));
    line(im, 8 + dx * 2, 8 + dy * 2, 8 + dx * 6, 8 + dy * 6, i % 2 ? shade(c, 45) : c);
  }
  ellipse(im, 8, 8, 3, 3, shade(c, 70));
}

function explosionIcon(im, c) {
  for (let i = 0; i < 10; i += 1) {
    const a = (Math.PI / 5) * i;
    const reach = i % 2 ? 4 : 7;
    line(im, 8, 8, 8 + R(Math.cos(a) * reach), 8 + R(Math.sin(a) * reach), i % 2 ? shade(c, 50) : c);
  }
  ellipse(im, 8, 8, 2, 2, "#fff0d0");
}

function dashIcon(im, c) {
  for (let i = 0; i < 3; i += 1) {
    const x = 2 + i * 3;
    line(im, x, 4 + i, x + 4, 8 + i, i === 1 ? shade(c, 40) : c);
    line(im, x + 4, 8 + i, x, 12 + i, i === 1 ? shade(c, 40) : c);
  }
}

function breathIcon(im, c) {
  for (let i = 0; i < 3; i += 1) {
    const y = 3 + i * 5;
    rect(im, 2, y, 8, 3, i === 1 ? c : shade(c, i === 0 ? 40 : -20));
    ellipse(im, 11, y + 1, 2, 3, shade(c, 55));
  }
}

function scaleIcon(im, c) {
  for (let row = 0; row < 3; row += 1) {
    const y = 4 + row * 4;
    for (let i = 0; i < 3; i += 1) {
      const x = 3 + i * 4 + (row % 2 ? 2 : 0);
      rect(im, x, y, 4, 3, i % 2 ? shade(c, 25) : c);
      rect(im, x, y + 2, 4, 1, shade(c, -25));
    }
  }
}

function leapIcon(im, c) {
  for (let t = 0; t <= 12; t += 1) {
    const p = t / 12;
    px(im, R(2 + p * 11), R(13 - Math.sin(p * Math.PI) * 9), c);
  }
  px(im, 13, 13, shade(c, 45));
  rect(im, 11, 12, 4, 1, "#ffffff");
}

function infernalIcon(im, c) {
  rect(im, 5, 10, 6, 5, shade(c, -30));
  for (let i = 0; i < 3; i += 1) {
    const x = 5 + i * 2;
    rect(im, x, 4 + i, 2, 7 - i, i === 1 ? shade(c, 50) : c);
    px(im, x, 3 + i, "#ffe08a");
  }
}

function markIcon(im, c) {
  for (const [x, y] of [[8, 2], [8, 3], [8, 12], [8, 13], [2, 8], [3, 8], [12, 8], [13, 8]]) px(im, x, y, c);
  px(im, 8, 8, shade(c, 65));
  px(im, 7, 8, c);
  px(im, 9, 8, c);
  px(im, 8, 7, c);
  px(im, 8, 9, c);
}

function linkIcon(im, c) {
  ellipse(im, 5, 9, 3, 3, c);
  ellipse(im, 11, 7, 3, 3, shade(c, 35));
  px(im, 5, 9, [0, 0, 0], 0);
  px(im, 11, 7, [0, 0, 0], 0);
  line(im, 6, 8, 10, 8, "#ffffff");
}

function familiarIcon(im, c) {
  ellipse(im, 8, 8, 3, 3, c);
  px(im, 8, 8, "#ffffff");
  for (const s of [-1, 1]) {
    line(im, 8 + s * 3, 8, 8 + s * 6, 5, shade(c, 35));
    line(im, 8 + s * 3, 8, 8 + s * 6, 11, shade(c, -15));
  }
  px(im, 6, 6, shade(c, 60));
  px(im, 10, 6, shade(c, 60));
}

function commandIcon(im, c) {
  rect(im, 3, 2, 1, 13, "#7a5232");
  for (let y = 0; y < 5; y += 1) rect(im, 4, 3 + y, 7 - y, 1, y === 0 ? shade(c, 40) : c);
  px(im, 12, 3, "#e8c05a");
}

function camouflageIcon(im, c) {
  ellipse(im, 6, 7, 3, 2, c);
  ellipse(im, 11, 10, 3, 2, shade(c, 30));
  ellipse(im, 9, 4, 2, 2, shade(c, -20));
  px(im, 5, 12, shade(c, 50));
  px(im, 12, 5, shade(c, 50));
}

function frenzyIcon(im, c) {
  for (let i = 0; i < 4; i += 1) {
    const a = (Math.PI / 2) * i + Math.PI / 4;
    line(im, 8 + R(Math.cos(a) * 2), 8 + R(Math.sin(a) * 2), 8 + R(Math.cos(a) * 6), 8 + R(Math.sin(a) * 6), c);
    px(im, 8 + R(Math.cos(a) * 7), 8 + R(Math.sin(a) * 7), "#ffffff");
  }
  ellipse(im, 8, 8, 2, 2, shade(c, -20));
}

function gustIcon(im, c) {
  for (let i = 0; i < 3; i += 1) {
    const y = 4 + i * 4;
    line(im, 2, y, 11 - i, y, i === 1 ? shade(c, 40) : c);
    line(im, 11 - i, y, 9 - i, y - 2, shade(c, 20));
  }
}

function rockIcon(im, c) {
  for (let y = 0; y < 7; y += 1) {
    const w = 6 - Math.abs(y - 3);
    rect(im, 8 - w, 4 + y, w * 2 + 1, 1, y < 3 ? shade(c, 30) : c);
  }
  rect(im, 4, 11, 8, 2, shade(c, -25));
  px(im, 6, 6, shade(c, 60));
}

function moonIcon(im, c) {
  ellipse(im, 8, 8, 6, 6, c);
  ellipse(im, 6, 7, 5, 5, [0, 0, 0], 0);
  px(im, 12, 4, "#ffffff");
  px(im, 11, 11, shade(c, 50));
}

export function drawAtlas(names) {
  const cols = 8;
  const rows = Math.max(1, Math.ceil(names.length / cols));
  const im = makeImage(cols * 16, rows * 16);
  names.forEach((name, i) => {
    const icon = drawIcon(name);
    const ox = (i % cols) * 16;
    const oy = Math.floor(i / cols) * 16;
    for (let y = 0; y < 16; y += 1) {
      for (let x = 0; x < 16; x += 1) {
        const j = (y * 16 + x) * 4;
        if (icon.data[j + 3] === 0) continue;
        const k = ((oy + y) * im.w + (ox + x)) * 4;
        im.data[k] = icon.data[j];
        im.data[k + 1] = icon.data[j + 1];
        im.data[k + 2] = icon.data[j + 2];
        im.data[k + 3] = icon.data[j + 3];
      }
    }
  });
  return { image: im, cols, rows, names };
}
