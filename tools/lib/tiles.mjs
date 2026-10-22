import { makeImage, mulberry, px, rect, rectOutline, ellipse, line, shade } from "./pixels.mjs";

export const TILE = {
  grass: 0,
  grass2: 1,
  grassFlowerWhite: 2,
  grassFlowerRed: 3,
  dirt: 4,
  path: 5,
  stone: 6,
  stone2: 7,
  water: 8,
  water2: 9,
  sand: 10,
  stoneWall: 11,
  brick: 12,
  woodWall: 13,
  roofRed: 14,
  roofBlue: 15,
  door: 16,
  fenceH: 17,
  fenceV: 18,
  tree: 19,
  pine: 20,
  bush: 21,
  rock: 22,
  lamp: 23,
  flowers: 24,
  chest: 25,
  barrel: 26,
  crate: 27,
  torch: 28,
  stairs: 29,
  void: 30,
  darkGrass: 31,
  dirt2: 32,
  path2: 33,
  darkWall: 34,
  darkWater: 35,
  bridge: 36,
  well: 37,
  sign: 38,
  table: 39,
  rug: 40,
  caveFloor: 41,
  caveFloor2: 42,
};

const COLS = 16;
const ROWS = 3;
const COUNT = COLS * ROWS;

function speckle(im, ox, oy, base, amount = 14, density = 26, seed = 1) {
  const r = mulberry(seed);
  for (let y = 0; y < 16; y += 1) {
    for (let x = 0; x < 16; x += 1) {
      const v = r();
      if (v < density / 256) px(im, ox + x, oy + y, shade(base, v < density / 512 ? amount : -amount));
    }
  }
}

export function drawTileset() {
  const im = makeImage(COLS * 16, ROWS * 16);
  const at = (index) => [(index % COLS) * 16, Math.floor(index / COLS) * 16];
  const tile = (index, fn) => {
    const [ox, oy] = at(index);
    const t = (x, y, w, h, c, a) => rect(im, ox + x, oy + y, w, h, c, a);
    fn(t, ox, oy);
  };

  tile(TILE.grass, (t) => {
    t(0, 0, 16, 16, "#4f7a3a");
    speckle(im, at(0)[0], at(0)[1], "#4f7a3a", 12, 34, 2);
    t(3, 4, 1, 2, "#5f8f48");
    t(11, 10, 1, 2, "#5f8f48");
  });
  tile(TILE.grass2, (t) => {
    t(0, 0, 16, 16, "#557f3d");
    speckle(im, at(1)[0], at(1)[1], "#557f3d", 10, 30, 3);
    t(6, 3, 2, 1, "#6a9a50");
    t(9, 12, 2, 1, "#446a32");
  });
  tile(TILE.grassFlowerWhite, (t) => {
    t(0, 0, 16, 16, "#4f7a3a");
    speckle(im, at(2)[0], at(2)[1], "#4f7a3a", 10, 28, 4);
    for (const [fx, fy] of [[5, 6], [11, 9]]) {
      t(fx, fy, 2, 2, "#e8eef2");
      t(fx + 1, fy - 1, 1, 1, "#f7fbfd");
      t(fx, fy + 2, 1, 1, "#6a9a50");
    }
  });
  tile(TILE.grassFlowerRed, (t) => {
    t(0, 0, 16, 16, "#4f7a3a");
    speckle(im, at(3)[0], at(3)[1], "#4f7a3a", 10, 28, 5);
    for (const [fx, fy] of [[7, 5], [12, 11]]) {
      t(fx, fy, 2, 2, "#c94a4a");
      t(fx + 1, fy - 1, 1, 1, "#e86a6a");
    }
  });
  tile(TILE.dirt, (t) => {
    t(0, 0, 16, 16, "#8a6a45");
    speckle(im, at(4)[0], at(4)[1], "#8a6a45", 12, 32, 6);
    t(4, 10, 3, 2, "#7a5c3b");
    t(10, 5, 2, 2, "#9a7950");
  });
  tile(TILE.path, (t) => {
    t(0, 0, 16, 16, "#b09a6a");
    speckle(im, at(5)[0], at(5)[1], "#b09a6a", 10, 26, 7);
    t(2, 3, 2, 2, "#c4b184");
    t(10, 9, 3, 2, "#9a8558");
    t(6, 12, 1, 1, "#8d7a51");
  });
  tile(TILE.path2, (t) => {
    t(0, 0, 16, 16, "#a89264");
    speckle(im, at(33)[0], at(33)[1], "#a89264", 8, 22, 8);
    t(5, 6, 2, 2, "#bba678");
  });
  tile(TILE.dirt2, (t) => {
    t(0, 0, 16, 16, "#7f603e");
    speckle(im, at(32)[0], at(32)[1], "#7f603e", 10, 28, 9);
  });
  tile(TILE.stone, (t) => {
    t(0, 0, 16, 16, "#6b6b78");
    for (let i = 0; i < 4; i += 1) t(0, i * 4 + 3, 16, 1, "#5a5a66");
    t(7, 0, 1, 4, "#5a5a66");
    t(12, 4, 1, 4, "#5a5a66");
    t(3, 8, 1, 4, "#5a5a66");
    t(9, 12, 1, 4, "#5a5a66");
    speckle(im, at(6)[0], at(6)[1], "#6b6b78", 6, 14, 10);
  });
  tile(TILE.stone2, (t) => {
    t(0, 0, 16, 16, "#74747f");
    speckle(im, at(7)[0], at(7)[1], "#74747f", 8, 18, 11);
    t(2, 8, 5, 1, "#62626d");
    t(10, 3, 4, 1, "#62626d");
  });
  tile(TILE.water, (t) => {
    t(0, 0, 16, 16, "#2f5f8a");
    t(0, 0, 16, 2, "#3f739e");
    for (const [wx, wy] of [[2, 5], [9, 9], [5, 13]]) {
      t(wx, wy, 4, 1, "#5f93be");
      t(wx + 1, wy + 1, 2, 1, "#3c6f99");
    }
  });
  tile(TILE.water2, (t) => {
    t(0, 0, 16, 16, "#286084");
    for (const [wx, wy] of [[1, 4], [8, 7], [3, 12]]) {
      t(wx, wy, 5, 1, "#4b88b3");
      t(wx + 2, wy + 1, 2, 1, "#35739e");
    }
  });
  tile(TILE.sand, (t) => {
    t(0, 0, 16, 16, "#c2a76a");
    speckle(im, at(10)[0], at(10)[1], "#c2a76a", 10, 28, 12);
    t(4, 9, 2, 1, "#ad9157");
  });
  tile(TILE.stoneWall, (t) => {
    t(0, 0, 16, 16, "#5a5a66");
    t(0, 0, 16, 1, "#484852");
    t(0, 15, 16, 1, "#3d3d46");
    for (let i = 0; i < 3; i += 1) {
      t(0, 5 + i * 5, 16, 1, "#484852");
      t(i % 2 === 0 ? 5 : 11, i * 5, 1, 5, "#484852");
    }
    t(2, 2, 4, 2, "#666672");
  });
  tile(TILE.darkWall, (t) => {
    t(0, 0, 16, 16, "#3b3947");
    t(0, 0, 16, 1, "#2d2b36");
    t(0, 15, 16, 1, "#24222c");
    for (let i = 0; i < 3; i += 1) t(0, 5 + i * 5, 16, 1, "#312f3c");
    t(3, 2, 3, 2, "#474455");
  });
  tile(TILE.brick, (t) => {
    t(0, 0, 16, 16, "#7a4a3a");
    for (let row = 0; row < 4; row += 1) {
      t(0, row * 4, 16, 1, "#5f382c");
      const off = row % 2 === 0 ? 0 : 4;
      for (let col = off; col < 16; col += 8) t(col, row * 4, 1, 4, "#5f382c");
    }
  });
  tile(TILE.woodWall, (t) => {
    t(0, 0, 16, 16, "#6b4a2f");
    for (let i = 0; i < 4; i += 1) t(i * 4, 0, 1, 16, "#543824");
    t(0, 7, 16, 1, "#7d5a3a");
  });
  tile(TILE.roofRed, (t) => {
    t(0, 0, 16, 16, "#8f3b32");
    for (let row = 0; row < 4; row += 1) {
      t(0, row * 4, 16, 1, "#6d2a24");
      const off = row % 2 === 0 ? 0 : 3;
      for (let col = off; col < 16; col += 6) t(col, row * 4, 1, 4, "#6d2a24");
    }
    t(3, 6, 3, 1, "#a55045");
  });
  tile(TILE.roofBlue, (t) => {
    t(0, 0, 16, 16, "#37506e");
    for (let row = 0; row < 4; row += 1) {
      t(0, row * 4, 16, 1, "#293c54");
      const off = row % 2 === 0 ? 0 : 3;
      for (let col = off; col < 16; col += 6) t(col, row * 4, 1, 4, "#293c54");
    }
    t(8, 9, 3, 1, "#4a6688");
  });
  tile(TILE.door, (t) => {
    t(0, 0, 16, 16, "#4a2f1f");
    t(3, 3, 10, 1, "#5a3a26");
    t(8, 8, 1, 1, "#e0b84a");
  });
  tile(TILE.fenceH, (t) => {
    t(0, 6, 16, 2, "#8a6238");
    t(0, 11, 16, 2, "#8a6238");
    for (const fx of [2, 10]) {
      t(fx, 4, 2, 10, "#6f4c2a");
      t(fx, 3, 2, 1, "#a37a4a");
    }
  });
  tile(TILE.fenceV, (t) => {
    t(6, 0, 2, 16, "#8a6238");
    t(11, 0, 2, 16, "#8a6238");
    for (const fy of [2, 10]) {
      t(4, fy, 10, 2, "#6f4c2a");
      t(3, fy, 1, 2, "#a37a4a");
    }
  });
  tile(TILE.tree, (_t, ox, oy) => {
    rect(im, ox + 7, oy + 11, 3, 5, "#5c3d24");
    ellipse(im, ox + 8, oy + 7, 7, 6, "#2f5a2e");
    ellipse(im, ox + 6, oy + 5, 4, 3, "#3d7438");
    ellipse(im, ox + 10, oy + 8, 4, 3, "#284d28");
    rect(im, ox + 5, oy + 3, 2, 2, "#4f8c46");
  });
  tile(TILE.pine, (_t, ox, oy) => {
    rect(im, ox + 7, oy + 11, 2, 5, "#4a3320");
    for (let row = 0; row < 4; row += 1) {
      const w = 12 - row * 2;
      rect(im, ox + (16 - w) / 2, oy + 2 + row * 3, w, 3, row % 2 === 0 ? "#24492b" : "#2e5a34");
    }
    rect(im, ox + 7, oy + 2, 2, 10, "#3c6b3f");
  });
  tile(TILE.bush, (_t, ox, oy) => {
    ellipse(im, ox + 8, oy + 10, 6, 4, "#2f5a2e");
    ellipse(im, ox + 5, oy + 8, 3, 3, "#3d7438");
    ellipse(im, ox + 11, oy + 9, 3, 2, "#284d28");
  });
  tile(TILE.rock, (_t, ox, oy) => {
    ellipse(im, ox + 8, oy + 10, 6, 4, "#77777f");
    ellipse(im, ox + 7, oy + 9, 4, 3, "#8b8b94");
    rect(im, ox + 10, oy + 11, 2, 1, "#5f5f68");
  });
  tile(TILE.lamp, (t) => {
    t(7, 8, 2, 8, "#3f3f47");
    t(5, 13, 6, 2, "#2f2f36");
    t(5, 2, 6, 6, "#f2c14e");
    t(6, 3, 4, 4, "#ffe08a");
    t(4, 1, 8, 1, "#6a5a2a");
  });
  tile(TILE.flowers, (t) => {
    for (const [fx, fy, c] of [[4, 6, "#e86a9a"], [9, 4, "#f2d46a"], [12, 10, "#8ab4e8"]]) {
      t(fx, fy, 2, 2, c);
      t(fx, fy + 2, 1, 2, "#5f8f48");
    }
  });
  tile(TILE.chest, (t) => {
    t(3, 6, 10, 7, "#7a4a2a");
    t(3, 6, 10, 2, "#9a6238");
    t(7, 8, 2, 3, "#e0b84a");
    t(3, 11, 10, 1, "#5f3820");
    t(2, 5, 1, 9, "#4f2f1a");
    t(13, 5, 1, 9, "#4f2f1a");
  });
  tile(TILE.barrel, (t) => {
    t(4, 5, 8, 9, "#7a5232");
    t(4, 7, 8, 1, "#4f3420");
    t(4, 11, 8, 1, "#4f3420");
    t(3, 5, 1, 9, "#5f3f27");
    t(12, 5, 1, 9, "#5f3f27");
  });
  tile(TILE.crate, (t) => {
    t(3, 5, 10, 9, "#8a6238");
    t(2, 4, 12, 1, "#543824");
    t(2, 13, 12, 1, "#543824");
    t(2, 4, 1, 10, "#543824");
    t(13, 4, 1, 10, "#543824");
    line(im, at(27)[0] + 3, at(27)[1] + 5, at(27)[0] + 12, at(27)[1] + 13, "#6f4c2a");
    line(im, at(27)[0] + 12, at(27)[1] + 5, at(27)[0] + 3, at(27)[1] + 13, "#6f4c2a");
  });
  tile(TILE.torch, (_t, ox, oy) => {
    rect(im, ox + 7, oy + 6, 2, 8, "#5c3d24");
    ellipse(im, ox + 8, oy + 4, 3, 4, "#f28c28");
    ellipse(im, ox + 8, oy + 4, 2, 2, "#ffe08a");
  });
  tile(TILE.stairs, (t) => {
    t(0, 0, 16, 16, "#5a5a66");
    for (let i = 0; i < 4; i += 1) t(i * 4, i * 2, 16 - i * 4, 4, shade("#5a5a66", -8 - i * 4));
  });
  tile(TILE.void, (t) => {
    t(0, 0, 16, 16, "#14121a");
    speckle(im, at(30)[0], at(30)[1], "#14121a", 6, 18, 13);
  });
  tile(TILE.darkGrass, (t) => {
    t(0, 0, 16, 16, "#3d5f33");
    speckle(im, at(31)[0], at(31)[1], "#3d5f33", 8, 24, 14);
  });
  tile(TILE.darkWater, (t) => {
    t(0, 0, 16, 16, "#243f5c");
    t(2, 5, 5, 1, "#3a5f80");
    t(9, 11, 4, 1, "#3a5f80");
  });
  tile(TILE.bridge, (t) => {
    t(0, 0, 16, 16, "#8a6238");
    for (let i = 0; i < 4; i += 1) t(0, i * 4, 16, 1, "#6f4c2a");
    t(0, 7, 16, 1, "#a37a4a");
  });
  tile(TILE.well, (_t, ox, oy) => {
    ellipse(im, ox + 8, oy + 9, 6, 5, "#6b6b78");
    ellipse(im, ox + 8, oy + 9, 4, 3, "#1f2f46");
    rect(im, ox + 6, oy + 2, 4, 2, "#8a6238");
    rect(im, ox + 7, oy + 4, 2, 3, "#5c3d24");
  });
  tile(TILE.sign, (t) => {
    t(7, 8, 2, 7, "#5c3d24");
    t(2, 3, 12, 6, "#8a6238");
    t(4, 5, 8, 1, "#d9c2a3");
    t(4, 7, 5, 1, "#d9c2a3");
  });
  tile(TILE.table, (t) => {
    t(2, 5, 12, 6, "#8a6238");
    t(2, 5, 12, 1, "#a37a4a");
    t(3, 11, 2, 4, "#5c3d24");
    t(11, 11, 2, 4, "#5c3d24");
  });
  tile(TILE.rug, (t) => {
    t(0, 0, 16, 16, "#7a2f3a");
    t(1, 1, 14, 1, "#a34a56");
    t(1, 14, 14, 1, "#a34a56");
    t(6, 6, 4, 4, "#c9a24a");
  });
  tile(TILE.caveFloor, (t) => {
    t(0, 0, 16, 16, "#3f3b4a");
    speckle(im, at(41)[0], at(41)[1], "#3f3b4a", 8, 20, 15);
    t(4, 11, 3, 1, "#332f3d");
  });
  tile(TILE.caveFloor2, (t) => {
    t(0, 0, 16, 16, "#474252");
    speckle(im, at(42)[0], at(42)[1], "#474252", 8, 18, 16);
    t(9, 5, 3, 1, "#393444");
  });

  return { image: im, cols: COLS, rows: ROWS, count: COUNT };
}
