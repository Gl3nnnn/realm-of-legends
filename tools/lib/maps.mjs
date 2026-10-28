import fs from "node:fs";
import path from "node:path";
import { TILE } from "./tiles.mjs";
import { mulberry } from "./pixels.mjs";

const BLOCKING = new Set([
  TILE.water, TILE.water2, TILE.stoneWall, TILE.darkWall, TILE.brick, TILE.woodWall,
  TILE.roofRed, TILE.roofBlue, TILE.door, TILE.fenceH, TILE.fenceV, TILE.tree,
  TILE.pine, TILE.rock, TILE.chest, TILE.barrel, TILE.crate, TILE.well,
  TILE.table, TILE.void,
]);

class MapBuilder {
  constructor(id, w, h) {
    this.id = id;
    this.w = w;
    this.h = h;
    this.ground = new Array(w * h).fill(TILE.grass);
    this.decor = new Array(w * h).fill(0);
    this.blocked = new Set();
    this.rand = mulberry(1337);
  }

  inside(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  setGround(x, y, tile) {
    if (this.inside(x, y)) this.ground[y * this.w + x] = tile;
  }

  setDecor(x, y, tile, block = BLOCKING.has(tile)) {
    if (!this.inside(x, y)) return;
    const i = y * this.w + x;
    this.decor[i] = tile;
    if (block) this.blocked.add(i);
    else this.blocked.delete(i);
  }

  fillGround(tile) {
    this.ground.fill(tile);
  }

  fillDecor(tile, block = BLOCKING.has(tile)) {
    for (let y = 0; y < this.h; y += 1) for (let x = 0; x < this.w; x += 1) this.setDecor(x, y, tile, block);
  }

  rectGround(x, y, w, h, tile) {
    for (let yy = y; yy < y + h; yy += 1) for (let xx = x; xx < x + w; xx += 1) this.setGround(xx, yy, tile);
  }

  clearRect(x, y, w, h, ground = TILE.grass) {
    for (let yy = y; yy < y + h; yy += 1) {
      for (let xx = x; xx < x + w; xx += 1) {
        if (!this.inside(xx, yy)) continue;
        const i = yy * this.w + xx;
        this.decor[i] = 0;
        this.blocked.delete(i);
        this.ground[i] = ground;
      }
    }
  }

  clearTile(x, y, ground) {
    this.clearRect(x, y, 1, 1, ground);
  }

  scatter(tile, density, avoid = [], seed = 7) {
    const r = mulberry(seed);
    const count = Math.floor(this.w * this.h * density);
    for (let n = 0; n < count; n += 1) {
      const x = Math.floor(r() * this.w);
      const y = Math.floor(r() * this.h);
      if (this.blocked.has(y * this.w + x)) continue;
      if (avoid.some(([ax, ay, aw, ah]) => x >= ax && y >= ay && x < ax + aw && y < ay + ah)) continue;
      this.setDecor(x, y, tile, true);
    }
  }

  pathLine(points, width = 1, tile = TILE.path) {
    for (let p = 0; p < points.length - 1; p += 1) {
      const [x0, y0] = points[p];
      const [x1, y1] = points[p + 1];
      let dx = Math.abs(x1 - x0);
      let dy = -Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1;
      const sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      let x = x0;
      let y = y0;
      for (;;) {
        for (let oy = -width; oy <= width; oy += 1) {
          for (let ox = -width; ox <= width; ox += 1) {
            if (Math.abs(ox) + Math.abs(oy) > width) continue;
            this.setGround(x + ox, y + oy, tile);
            this.setDecor(x + ox, y + oy, 0, false);
          }
        }
        if (x === x1 && y === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x += sx; }
        if (e2 <= dx) { err += dx; y += sy; }
      }
    }
  }

  blob(cx, cy, rx, ry, tile, depth = 1) {
    for (let y = -ry; y <= ry; y += 1) {
      for (let x = -rx; x <= rx; x += 1) {
        if ((x * x) / (rx * rx) + (y * y) / (ry * ry) > 1) continue;
        this.setGround(cx + x, cy + y, tile);
        this.setDecor(cx + x, cy + y, 0, false);
      }
    }
    for (let r = 1; r <= depth; r += 1) {
      for (let y = -ry - r; y <= ry + r; y += 1) {
        for (let x = -rx - r; x <= rx + r; x += 1) {
          const d = (x * x) / ((rx + r) * (rx + r)) + (y * y) / ((ry + r) * (ry + r));
          if (d > 1 || ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1)) continue;
          if (!this.inside(cx + x, cy + y)) continue;
          this.setDecor(cx + x, cy + y, TILE.sand, false);
        }
      }
    }
  }

  roomWalls(x, y, w, h, wall = TILE.darkWall) {
    for (let xx = x; xx < x + w; xx += 1) {
      this.setDecor(xx, y, wall, true);
      this.setDecor(xx, y + h - 1, wall, true);
    }
    for (let yy = y; yy < y + h; yy += 1) {
      this.setDecor(x, yy, wall, true);
      this.setDecor(x + w - 1, yy, wall, true);
    }
    for (let yy = y + 1; yy < y + h - 1; yy += 1) {
      for (let xx = x + 1; xx < x + w - 1; xx += 1) {
        this.setGround(xx, yy, TILE.caveFloor);
        this.setDecor(xx, yy, 0, false);
      }
    }
  }

  house(x, y, w, h, roof) {
    for (let yy = y; yy < y + h; yy += 1) {
      for (let xx = x; xx < x + w; xx += 1) {
        const edge = xx === x || yy === y || xx === x + w - 1 || yy === y + h - 1;
        this.setGround(xx, yy, TILE.stone);
        if (edge) this.setDecor(xx, yy, TILE.woodWall, true);
        else this.setDecor(xx, yy, roof, true);
      }
    }
    for (let xx = x + 1; xx < x + w - 1; xx += 1) this.setDecor(xx, y, roof, true);
    const doorX = x + Math.floor(w / 2);
    this.setGround(doorX, y + h - 1, TILE.stone);
    this.setDecor(doorX, y + h - 1, TILE.door, true);
    this.setDecor(x, y + h - 1, TILE.door, true);
    this.setDecor(x + w - 1, y + h - 1, TILE.door, true);
  }

  borderTrees(gaps = [], thick = 2) {
    for (let y = 0; y < this.h; y += 1) {
      for (let x = 0; x < this.w; x += 1) {
        const edge = x < thick || y < thick || x >= this.w - thick || y >= this.h - thick;
        if (!edge) continue;
        if (gaps.some(([gx, gy, gw, gh]) => x >= gx && y >= gy && x < gx + gw && y < gy + gh)) continue;
        this.setDecor(x, y, (x + y) % 3 === 0 ? TILE.pine : TILE.tree, true);
      }
    }
  }

  ensureFree(x, y, ground) {
    this.clearTile(x, y, ground ?? this.ground[y * this.w + x]);
    return this.blocked.has(y * this.w + x) === false;
  }

  blockedRows() {
    const rows = [];
    for (let y = 0; y < this.h; y += 1) {
      let line = "";
      for (let x = 0; x < this.w; x += 1) line += this.blocked.has(y * this.w + x) ? "#" : ".";
      rows.push(line);
    }
    return rows;
  }

  emit(name, tilesetName = "eldoria") {
    const ground = this.ground.map((t) => t + 1);
    const decor = this.decor.map((t) => (t === 0 ? 0 : t + 1));
    return {
      compressionlevel: -1,
      height: this.h,
      width: this.w,
      infinite: false,
      orientation: "orthogonal",
      renderorder: "right-down",
      tiledversion: "1.11.0",
      tileheight: 16,
      tilewidth: 16,
      type: "map",
      version: "1.10",
      nextlayerid: 3,
      nextobjectid: 1,
      properties: [{ name: "name", type: "string", value: name }],
      layers: [
        { id: 1, name: "ground", type: "tilelayer", width: this.w, height: this.h, x: 0, y: 0, opacity: 1, visible: true, data: ground },
        { id: 2, name: "decor", type: "tilelayer", width: this.w, height: this.h, x: 0, y: 0, opacity: 1, visible: true, data: decor },
      ],
      tilesets: [{
        firstgid: 1,
        name: tilesetName,
        image: `../tilesets/${tilesetName}.png`,
        imagewidth: 256,
        imageheight: 48,
        tilewidth: 16,
        tileheight: 16,
        tilecount: 48,
        columns: 16,
        margin: 0,
        spacing: 0,
      }],
    };
  }
}

const center = (t) => t * 16 + 8;

function portal(x, y, w, h, targetZone, targetX, targetY, label, id) {
  return { id, x: x * 16, y: y * 16, w: w * 16, h: h * 16, targetZone, targetX: center(targetX), targetY: center(targetY), label };
}

function villageMap() {
  const m = new MapBuilder("village", 52, 38);
  m.fillGround(TILE.grass);
  const r = mulberry(11);
  for (let y = 0; y < m.h; y += 1) for (let x = 0; x < m.w; x += 1) {
    const v = r();
    if (v < 0.12) m.setGround(x, y, TILE.grass2);
    else if (v > 0.96) m.setGround(x, y, TILE.darkGrass);
    else if (v > 0.9 && v <= 0.93) m.setGround(x, y, TILE.dirt);
    else if (v > 0.93 && v <= 0.945) m.setGround(x, y, TILE.grassFlowerRed);
    else if (v > 0.945 && v <= 0.96) m.setGround(x, y, TILE.grassFlowerWhite);
  }
  m.pathLine([[0, 19], [51, 19]], 1, TILE.path);
  m.pathLine([[25, 0], [25, 37]], 1, TILE.path);
  m.rectGround(16, 12, 20, 14, TILE.stone);
  for (let y = 12; y < 26; y += 1) for (let x = 16; x < 36; x += 1) if ((x + y) % 7 === 0) m.setGround(x, y, TILE.stone2);
  m.blob(5, 17, 4, 3, TILE.water, 1);
  m.house(5, 4, 9, 6, TILE.roofRed);
  m.house(38, 4, 9, 6, TILE.roofBlue);
  m.house(29, 3, 7, 5, TILE.roofBlue);
  m.house(5, 27, 9, 6, TILE.roofRed);
  m.house(38, 27, 10, 6, TILE.roofRed);
  m.setDecor(30, 22, TILE.well, true);
  m.setDecor(19, 14, TILE.rug, false);
  m.setDecor(21, 30, TILE.sign, true);
  m.setDecor(31, 30, TILE.torch, false);
  m.setDecor(9, 11, TILE.sign, true);
  m.setDecor(42, 11, TILE.sign, true);
  m.setDecor(32, 9, TILE.sign, true);
  m.setDecor(9, 34, TILE.sign, true);
  m.setDecor(43, 34, TILE.sign, true);
  // Plaza: lamp posts at the corners and a flower bed on each side of the well.
  for (const [x, y] of [[17, 13], [34, 13], [17, 24], [34, 24], [23, 13], [27, 24], [25, 13], [25, 24]]) m.setDecor(x, y, TILE.lamp, false);
  for (const [x, y] of [[28, 22], [32, 22], [29, 24], [31, 24]]) m.setDecor(x, y, TILE.flowers, false);
  // Garden rows of bushes along the north and south edges of the square.
  for (let x = 18; x <= 33; x += 3) {
    m.setDecor(x, 12, TILE.bush, true);
    m.setDecor(x, 25, TILE.bush, true);
  }
  // Shady trees beside the homes to break up the flat grass.
  for (const [x, y] of [[2, 14], [2, 22], [48, 14], [48, 22], [15, 33], [36, 33]]) m.setDecor(x, y, TILE.tree, true);
  for (const [x, y] of [[39, 11], [40, 11], [45, 11], [6, 11], [13, 33], [39, 33], [46, 33]]) m.setDecor(x, y, TILE.barrel, true);
  for (const [x, y] of [[14, 12], [15, 12], [36, 12], [13, 34]]) m.setDecor(x, y, TILE.crate, true);
  m.setDecor(36, 22, TILE.table, true);
  m.setDecor(37, 22, TILE.table, true);
  for (let i = 0; i < 80; i += 1) {
    const x = Math.floor(r() * 52);
    const y = Math.floor(r() * 38);
    if (m.blocked.has(y * 52 + x)) continue;
    if (x >= 14 && x <= 37 && y >= 10 && y <= 27) continue;
    if (m.ground[y * 52 + x] !== TILE.grass && m.ground[y * 52 + x] !== TILE.grass2) continue;
    m.setDecor(x, y, r() < 0.5 ? TILE.flowers : TILE.bush, false);
  }
  m.clearRect(49, 18, 3, 3, TILE.path);
  m.borderTrees([[49, 18, 3, 3]]);
  // Lit path edges so the road reads clearly from the plaza to the forest gate.
  for (let x = 40; x <= 48; x += 2) m.setDecor(x, 17, TILE.lamp, false);
  for (let x = 40; x <= 48; x += 2) m.setDecor(x, 21, TILE.lamp, false);
  const npcTiles = { guard: [32, 10], merchant: [42, 12], blacksmith: [9, 12], healer: [9, 35], trainer: [43, 35] };
  Object.values(npcTiles).forEach(([x, y]) => { m.clearTile(x, y, TILE.stone); m.ensureFree(x, y); });
  m.ensureFree(25, 23, TILE.stone);
  return {
    map: m.emit("Eldoria Village"),
    zone: {
      id: "village",
      name: "Eldoria Village",
      width: 52,
      height: 38,
      tileWidth: 16,
      tileHeight: 16,
      blocked: m.blockedRows(),
      safe: true,
      ambience: "village",
      spawn: { x: center(25), y: center(23) },
      portals: [portal(49, 18, 3, 3, "forest", 4, 22, "Whispering Forest", "to_forest")],
      npcs: Object.entries(npcTiles).map(([id, [x, y]]) => ({ id, x: center(x), y: center(y) })),
      monsterSpawns: [],
      chests: [{ id: "village_chest_1", x: center(30), y: center(27) }],
      traps: [],
      gatherNodes: [],
    },
  };
}

function forestMap() {
  const m = new MapBuilder("forest", 64, 48);
  m.fillGround(TILE.grass);
  const r = mulberry(23);
  for (let y = 0; y < m.h; y += 1) for (let x = 0; x < m.w; x += 1) {
    const v = r();
    if (v < 0.18) m.setGround(x, y, TILE.darkGrass);
    else if (v < 0.27) m.setGround(x, y, TILE.grass2);
  }
  m.pathLine([[0, 22], [14, 24], [24, 20], [34, 22], [43, 16], [52, 12], [59, 6]], 1, TILE.path);
  m.blob(26, 13, 5, 3, TILE.water, 1);
  m.setDecor(26, 13, TILE.well, false);
  m.setDecor(40, 16, TILE.sign, true);
  m.setDecor(10, 22, TILE.torch, false);
  // Dense forest edge along the outer ring, so the map reads as a forest.
  for (let x = 0; x < m.w; x += 1) for (let y = 0; y < m.h; y += 1) {
    const edge = x < 2 || y < 2 || x >= m.w - 2 || y >= m.h - 2;
    if (edge && r() < 0.55) m.setDecor(x, y, r() < 0.5 ? TILE.pine : TILE.tree, true);
  }
  // Flower patches beside the path, for colour and a clearer route.
  for (let x = 6; x < m.w - 6; x += 5) for (let y = 17; y < 28; y += 4) {
    if (r() < 0.45) m.setDecor(x + 1, y, TILE.flowers, false);
  }
  const spawns = {
    slime: [[13, 26], [19, 31], [28, 18], [36, 27], [43, 33]],
    wolf: [[47, 17], [54, 27], [50, 9], [35, 39]],
    skeleton: [],
    bone_warden: [],
  };
  const gather = [[20, 12, "herb_forest_1"], [33, 30, "herb_forest_2"], [44, 21, "herb_forest_3"], [12, 35, "herb_forest_4"]];
  const chest = [30, 36];
  const avoid = [[8, 20, 14, 8], [36, 14, 14, 12], [16, 33, 12, 10], [46, 28, 10, 14], [28, 2, 27, 12], [0, 20, 5, 5], [57, 2, 7, 7]];
  m.scatter(TILE.tree, 0.055, avoid, 31);
  m.scatter(TILE.pine, 0.04, avoid, 37);
  m.scatter(TILE.bush, 0.03, avoid, 41);
  m.scatter(TILE.rock, 0.012, avoid, 43);
  m.scatter(TILE.flowers, 0.02, avoid, 47);
  const free = [];
  Object.values(spawns).flat().forEach(([x, y]) => free.push([x, y]));
  gather.forEach(([x, y]) => free.push([x, y]));
  free.push(chest, [4, 22], [8, 22], [59, 5], [59, 42]);
  free.forEach(([x, y]) => { m.clearRect(x - 1, y - 1, 3, 3, TILE.darkGrass); m.ensureFree(x, y, TILE.darkGrass); });
  m.clearRect(0, 21, 3, 3, TILE.path);
  m.clearRect(59, 4, 3, 3, TILE.path);
  m.clearRect(58, 41, 4, 4, TILE.path);
  m.borderTrees([[0, 20, 4, 5], [58, 2, 6, 6], [57, 40, 7, 7]]);
  m.clearRect(0, 21, 3, 3, TILE.path);
  m.clearRect(59, 4, 3, 3, TILE.path);
  m.clearRect(58, 41, 4, 4, TILE.path);
  m.setDecor(59, 5, 0, false);
  m.setDecor(59, 42, 0, false);
  return {
    map: m.emit("Whispering Forest", "forest"),
    zone: {
      id: "forest",
      name: "Whispering Forest",
      width: 64,
      height: 48,
      tileWidth: 16,
      tileHeight: 16,
      blocked: m.blockedRows(),
      safe: false,
      ambience: "forest",
      spawn: { x: center(4), y: center(22) },
      portals: [
        portal(0, 21, 3, 3, "village", 47, 19, "Eldoria Village", "to_village"),
        portal(59, 4, 3, 3, "dungeon", 26, 34, "Sunken Barrow", "to_dungeon"),
        portal(59, 41, 3, 3, "marsh", 4, 22, "Ashen Marsh", "to_marsh"),
      ],
      npcs: [{ id: "tobin", x: center(8), y: center(22) }],
      monsterSpawns: Object.entries(spawns).flatMap(([id, list]) => list.map(([x, y]) => ({ id, x: center(x), y: center(y) }))),
      chests: [{ id: "forest_chest_1", x: center(chest[0]), y: center(chest[1]) }],
      traps: [],
      gatherNodes: gather.map(([x, y, id]) => ({ id, itemId: "herb", x: center(x), y: center(y) })),
    },
  };
}

function dungeonMap() {
  const m = new MapBuilder("dungeon", 52, 38);
  m.fillGround(TILE.caveFloor);
  const r = mulberry(53);
  for (let y = 0; y < m.h; y += 1) for (let x = 0; x < m.w; x += 1) if (r() < 0.35) m.setGround(x, y, TILE.caveFloor2);
  for (let y = 0; y < m.h; y += 1) for (let x = 0; x < m.w; x += 1) if (r() < 0.1) m.setGround(x, y, TILE.dirt);
  m.rectGround(20, 18, 13, 11, TILE.caveFloor);
  m.roomWalls(15, 2, 23, 16);
  m.roomWalls(4, 17, 12, 11);
  m.roomWalls(37, 17, 12, 11);
  m.roomWalls(20, 18, 13, 11);
  m.clearRect(24, 15, 4, 4, TILE.caveFloor);
  m.clearRect(15, 21, 6, 3, TILE.caveFloor);
  m.clearRect(32, 21, 5, 3, TILE.caveFloor);
  m.clearRect(24, 27, 4, 4, TILE.caveFloor);
  m.clearRect(24, 31, 4, 7, TILE.caveFloor);
  for (let y = 0; y < m.h; y += 1) {
    for (let x = 0; x < m.w; x += 1) {
      const edge = x < 2 || y < 2 || x >= m.w - 2 || y >= m.h - 2;
      if (edge && !(x >= 22 && x <= 29 && y >= 32)) m.setDecor(x, y, TILE.darkWall, true);
    }
  }
  for (const [x, y] of [[17, 5], [35, 5], [17, 14], [35, 14], [5, 20], [14, 20], [38, 20], [47, 20], [21, 19], [31, 19], [21, 27], [31, 27]]) m.setDecor(x, y, TILE.torch, false);
  m.setDecor(26, 4, TILE.rug, false);
  m.setDecor(25, 6, TILE.torch, false);
  m.setDecor(27, 6, TILE.torch, false);
  m.setDecor(26, 12, TILE.rug, false);
  m.setDecor(25, 35, TILE.stairs, false);
  m.setDecor(26, 35, TILE.stairs, false);
  m.setDecor(27, 35, TILE.stairs, false);
  m.setDecor(25, 36, TILE.stairs, false);
  m.setDecor(26, 36, TILE.stairs, false);
  m.setDecor(27, 36, TILE.stairs, false);
  m.setDecor(8, 20, TILE.chest, true);
  m.setDecor(44, 20, TILE.chest, true);
  m.setDecor(8, 24, TILE.chest, true);
  m.setDecor(44, 24, TILE.chest, true);
  m.setDecor(16, 9, TILE.crate, true);
  m.setDecor(36, 25, TILE.barrel, true);
  m.setDecor(18, 4, TILE.rock, true);
  m.setDecor(34, 4, TILE.rock, true);
  m.setDecor(18, 14, TILE.rock, true);
  m.setDecor(34, 14, TILE.rock, true);
  m.setDecor(26, 6, TILE.sign, true);
  const boss = [26, 9];
  const skeletons = [[10, 22], [21, 24], [30, 21], [43, 22], [14, 9], [39, 8]];
  const traps = [[25, 31, 34, 10, 3], [12, 22, 26, 12, 4], [40, 22, 26, 12, 4]];
  const chests = [[8, 21, "dungeon_chest_1"], [44, 19, "dungeon_chest_2"], [8, 23, "dungeon_chest_3"], [44, 23, "dungeon_chest_4"]];
  for (const [x, y] of [boss, ...skeletons, [25, 35], [26, 34]]) {
    m.clearTile(x, y, TILE.caveFloor);
    m.ensureFree(x, y, TILE.caveFloor);
  }
  m.clearRect(24, 36, 4, 2, TILE.caveFloor);
  return {
    map: m.emit("Sunken Barrow", "dungeon"),
    zone: {
      id: "dungeon",
      name: "Sunken Barrow",
      width: 52,
      height: 38,
      tileWidth: 16,
      tileHeight: 16,
      blocked: m.blockedRows(),
      safe: false,
      ambience: "dungeon",
      spawn: { x: center(26), y: center(34) },
      portals: [portal(24, 36, 4, 2, "forest", 58, 6, "Whispering Forest", "to_forest_exit")],
      npcs: [],
      monsterSpawns: [
        { id: "bone_warden", x: center(boss[0]), y: center(boss[1]) },
        ...skeletons.map(([x, y]) => ({ id: "skeleton", x: center(x), y: center(y) })),
      ],
      chests: chests.map(([x, y, id]) => ({ id, x: center(x), y: center(y) })),
      traps: traps.map(([x, y, radius, damage, cooldown], i) => ({ id: `dungeon_trap_${i + 1}`, x: center(x), y: center(y), radius, damage, cooldown })),
      gatherNodes: [],
    },
  };
}

function marshMap() {
  const m = new MapBuilder("marsh", 60, 44);
  m.fillGround(TILE.darkGrass);
  const r = mulberry(71);
  for (let y = 0; y < m.h; y += 1) for (let x = 0; x < m.w; x += 1) {
    const v = r();
    if (v < 0.16) m.setGround(x, y, TILE.grass2);
    else if (v < 0.23) m.setGround(x, y, TILE.dirt2);
  }
  for (const [x, y, rx, ry] of [[12, 10, 4, 3], [30, 30, 6, 3], [46, 14, 5, 2], [20, 37, 4, 2], [52, 33, 3, 2]]) m.blob(x, y, rx, ry, TILE.darkWater, 1);
  m.pathLine([[2, 22], [14, 24], [26, 20], [38, 24], [50, 20], [58, 22]], 1, TILE.path2);
  m.pathLine([[30, 30], [30, 20]], 1, TILE.bridge);
  const spawns = {
    bog_lurker: [[14, 16], [22, 29], [36, 13], [45, 31], [51, 24]],
    mire_wisp: [[18, 23], [34, 35], [48, 9]],
    venom_spider: [[26, 12], [40, 34], [54, 28]],
    miremother: [[30, 7]],
  };
  const avoid = [[0, 19, 7, 7], [54, 19, 6, 7], [24, 4, 13, 8], [8, 8, 10, 7], [25, 27, 11, 8]];
  m.scatter(TILE.tree, 0.04, avoid, 73);
  m.scatter(TILE.pine, 0.025, avoid, 79);
  m.scatter(TILE.bush, 0.05, avoid, 83);
  m.scatter(TILE.rock, 0.02, avoid, 89);
  const free = Object.values(spawns).flat();
  free.push([4, 22], [8, 22], [58, 22], [30, 30], [30, 20]);
  free.forEach(([x, y]) => { m.clearRect(x - 1, y - 1, 3, 3, TILE.darkGrass); m.ensureFree(x, y, TILE.darkGrass); });
  m.borderTrees([[0, 20, 4, 5], [57, 20, 4, 5]]);
  m.clearRect(0, 21, 3, 3, TILE.path2);
  m.clearRect(57, 21, 3, 3, TILE.path2);
  m.setDecor(58, 22, 0, false);
  m.setDecor(30, 8, TILE.torch, false);
  m.setDecor(33, 29, TILE.sign, true);
  m.setDecor(6, 18, TILE.torch, false);
  return {
    map: m.emit("Ashen Marsh", "marsh"),
    zone: {
      id: "marsh",
      name: "Ashen Marsh",
      width: 60,
      height: 44,
      tileWidth: 16,
      tileHeight: 16,
      blocked: m.blockedRows(),
      safe: false,
      ambience: "marsh",
      spawn: { x: center(4), y: center(22) },
      portals: [
        portal(0, 21, 3, 3, "forest", 58, 42, "Whispering Forest", "to_forest_marsh"),
        portal(57, 21, 3, 3, "frost", 4, 24, "Frostfell Ruins", "to_frost"),
      ],
      npcs: [{ id: "wenna", x: center(8), y: center(22) }],
      monsterSpawns: Object.entries(spawns).flatMap(([id, list]) => list.map(([x, y]) => ({ id, x: center(x), y: center(y) }))),
      chests: [
        { id: "marsh_chest_1", x: center(9), y: center(38) },
        { id: "marsh_chest_2", x: center(52), y: center(8) },
      ],
      traps: [
        { id: "marsh_trap_1", x: center(30), y: center(26), radius: 30, damage: 24, cooldown: 4 },
        { id: "marsh_trap_2", x: center(44), y: center(18), radius: 28, damage: 26, cooldown: 4 },
      ],
      gatherNodes: [
        { id: "herb_marsh_1", itemId: "herb", x: center(16), y: center(34) },
        { id: "herb_marsh_2", itemId: "herb", x: center(48), y: center(38) },
      ],
    },
  };
}

function frostMap() {
  const m = new MapBuilder("frost", 64, 48);
  m.fillGround(TILE.caveFloor);
  const r = mulberry(97);
  for (let y = 0; y < m.h; y += 1) for (let x = 0; x < m.w; x += 1) if (r() < 0.38) m.setGround(x, y, TILE.caveFloor2);
  for (let y = 0; y < m.h; y += 1) for (let x = 0; x < m.w; x += 1) if (r() < 0.1) m.setGround(x, y, TILE.dirt);
  m.rectGround(18, 18, 28, 14, TILE.caveFloor);
  m.roomWalls(8, 6, 18, 14, TILE.darkWall);
  m.roomWalls(38, 6, 18, 14, TILE.darkWall);
  m.roomWalls(20, 28, 24, 14, TILE.darkWall);
  m.clearRect(24, 18, 4, 4, TILE.caveFloor);
  m.clearRect(36, 18, 4, 4, TILE.caveFloor);
  m.clearRect(24, 24, 16, 4, TILE.caveFloor);
  m.clearRect(30, 12, 4, 8, TILE.caveFloor);
  m.clearRect(30, 40, 4, 4, TILE.caveFloor);
  m.pathLine([[3, 24], [18, 24], [30, 22], [44, 24], [60, 24]], 1, TILE.stone2);
  for (let y = 2; y < m.h - 2; y += 1) {
    for (let x = 2; x < m.w - 2; x += 1) {
      const edge = x < 3 || y < 3 || x >= m.w - 3 || y >= m.h - 3;
      if (edge) m.setDecor(x, y, TILE.darkWall, true);
    }
  }
  for (const [x, y] of [[8, 8], [25, 8], [40, 8], [55, 8], [9, 18], [54, 18], [21, 30], [42, 30], [31, 41]]) m.setDecor(x, y, TILE.torch, false);
  const spawns = {
    frost_wraith: [[12, 12], [50, 12], [18, 32], [46, 34], [26, 22]],
    ice_revenant: [[24, 38], [40, 38], [36, 12]],
    frost_revenant: [[32, 8]],
    hollow_acolyte: [[14, 22], [50, 22]],
  };
  const avoid = [[0, 21, 6, 6], [58, 21, 6, 6], [26, 4, 12, 10], [16, 28, 32, 16]];
  m.scatter(TILE.rock, 0.03, avoid, 101);
  m.scatter(TILE.bush, 0.01, avoid, 103);
  const free = Object.values(spawns).flat();
  free.push([4, 24], [6, 24], [60, 24]);
  free.forEach(([x, y]) => { m.clearRect(x - 1, y - 1, 3, 3, TILE.caveFloor); m.ensureFree(x, y, TILE.caveFloor); });
  m.clearRect(0, 23, 4, 3, TILE.stone2);
  m.clearRect(59, 23, 4, 3, TILE.stone2);
  m.setDecor(4, 24, 0, false);
  m.setDecor(60, 24, 0, false);
  m.setDecor(31, 17, TILE.sign, true);
  m.setDecor(7, 22, TILE.torch, false);
  return {
    map: m.emit("Frostfell Ruins", "frost"),
    zone: {
      id: "frost",
      name: "Frostfell Ruins",
      width: 64,
      height: 48,
      tileWidth: 16,
      tileHeight: 16,
      blocked: m.blockedRows(),
      safe: false,
      ambience: "frost",
      spawn: { x: center(4), y: center(24) },
      portals: [
        portal(0, 23, 3, 3, "marsh", 56, 22, "Ashen Marsh", "to_marsh_frost"),
        portal(60, 23, 3, 3, "throne", 4, 18, "Hollow Throne", "to_throne"),
      ],
      npcs: [{ id: "ysolde", x: center(6), y: center(24) }],
      monsterSpawns: Object.entries(spawns).flatMap(([id, list]) => list.map(([x, y]) => ({ id, x: center(x), y: center(y) }))),
      chests: [
        { id: "frost_chest_1", x: center(12), y: center(8) },
        { id: "frost_chest_2", x: center(50), y: center(8) },
        { id: "frost_chest_3", x: center(24), y: center(38) },
        { id: "frost_chest_4", x: center(40), y: center(38) },
      ],
      traps: [
        { id: "frost_trap_1", x: center(24), y: center(22), radius: 30, damage: 40, cooldown: 4 },
        { id: "frost_trap_2", x: center(40), y: center(22), radius: 30, damage: 40, cooldown: 4 },
        { id: "frost_trap_3", x: center(32), y: center(36), radius: 34, damage: 46, cooldown: 5 },
      ],
      gatherNodes: [],
    },
  };
}

function throneMap() {
  const m = new MapBuilder("throne", 48, 36);
  m.fillGround(TILE.caveFloor2);
  const r = mulberry(131);
  for (let y = 0; y < m.h; y += 1) for (let x = 0; x < m.w; x += 1) if (r() < 0.2) m.setGround(x, y, TILE.caveFloor); else if (r() < 0.08) m.setGround(x, y, TILE.dirt);
  m.rectGround(10, 6, 28, 22, TILE.caveFloor);
  for (let y = 0; y < m.h; y += 1) {
    for (let x = 0; x < m.w; x += 1) {
      const edge = x < 2 || y < 2 || x >= m.w - 2 || y >= m.h - 2;
      if (edge) m.setDecor(x, y, TILE.darkWall, true);
    }
  }
  m.clearRect(21, 28, 6, 6, TILE.caveFloor);
  m.setDecor(24, 29, TILE.stairs, false);
  m.setDecor(24, 6, TILE.rug, false);
  m.setDecor(22, 4, TILE.sign, true);
  for (const [x, y] of [[10, 7], [37, 7], [10, 26], [37, 26], [20, 6], [27, 6]]) m.setDecor(x, y, TILE.torch, false);
  const spawns = {
    hollow_acolyte: [[14, 12], [33, 12], [14, 22], [33, 22]],
    hollow_king: [[24, 9]],
  };
  const free = Object.values(spawns).flat();
  free.push([24, 31], [24, 28]);
  free.forEach(([x, y]) => { m.clearRect(x - 1, y - 1, 3, 3, TILE.caveFloor); m.ensureFree(x, y, TILE.caveFloor); });
  m.clearRect(21, 31, 6, 4, TILE.caveFloor);
  return {
    map: m.emit("Hollow Throne", "throne"),
    zone: {
      id: "throne",
      name: "Hollow Throne",
      width: 48,
      height: 36,
      tileWidth: 16,
      tileHeight: 16,
      blocked: m.blockedRows(),
      safe: false,
      ambience: "throne",
      spawn: { x: center(24), y: center(31) },
      portals: [portal(21, 31, 6, 3, "frost", 59, 24, "Frostfell Ruins", "to_frost_throne")],
      npcs: [{ id: "aldric", x: center(24), y: center(28) }],
      monsterSpawns: Object.entries(spawns).flatMap(([id, list]) => list.map(([x, y]) => ({ id, x: center(x), y: center(y) }))),
      chests: [],
      traps: [],
      gatherNodes: [],
    },
  };
}

function tsZone(zone) {
  const blocked = zone.blocked.map((row) => `    "${row}",`).join("\n");
  const portals = zone.portals.map((p) => `      { id: "${p.id}", x: ${p.x}, y: ${p.y}, w: ${p.w}, h: ${p.h}, targetZone: "${p.targetZone}", targetX: ${p.targetX}, targetY: ${p.targetY}, label: "${p.label}" },`).join("\n");
  const npcs = zone.npcs.map((n) => `      { id: "${n.id}", x: ${n.x}, y: ${n.y} },`).join("\n");
  const monsters = zone.monsterSpawns.map((n) => `      { id: "${n.id}", x: ${n.x}, y: ${n.y} },`).join("\n");
  const chests = zone.chests.map((c) => `      { id: "${c.id}", x: ${c.x}, y: ${c.y} },`).join("\n");
  const traps = zone.traps.map((t) => `      { id: "${t.id}", x: ${t.x}, y: ${t.y}, radius: ${t.radius}, damage: ${t.damage}, cooldown: ${t.cooldown} },`).join("\n");
  const gather = zone.gatherNodes.map((g) => `      { id: "${g.id}", itemId: "${g.itemId}", x: ${g.x}, y: ${g.y} },`).join("\n");
  return `  ${zone.id}: {
    id: "${zone.id}",
    name: "${zone.name}",
    width: ${zone.width},
    height: ${zone.height},
    tileWidth: ${zone.tileWidth},
    tileHeight: ${zone.tileHeight},
    blocked: grid([
${blocked}
    ]),
    safe: ${zone.safe},
    ambience: "${zone.ambience}",
    spawn: { x: ${zone.spawn.x}, y: ${zone.spawn.y} },
    portals: [
${portals}
    ],
    npcs: [
${npcs}
    ],
    monsterSpawns: [
${monsters}
    ],
    chests: [
${chests}
    ],
    traps: [
${traps}
    ],
    gatherNodes: [
${gather}
    ],
  },`;
}

export function buildWorld(mapsDir, generatedDir) {
  const village = villageMap();
  const forest = forestMap();
  const dungeon = dungeonMap();
  const marsh = marshMap();
  const frost = frostMap();
  const throne = throneMap();
  const zones = [village, forest, dungeon, marsh, frost, throne];
  fs.mkdirSync(mapsDir, { recursive: true });
  for (const z of zones) fs.writeFileSync(path.join(mapsDir, `${z.zone.id}.json`), JSON.stringify(z.map));
  fs.mkdirSync(generatedDir, { recursive: true });
  const header = `import type { ZoneData, ZoneId } from "../types";

function grid(rows: string[]): boolean[] {
  const out: boolean[] = [];
  for (const row of rows) for (const ch of row) out.push(ch === "#");
  return out;
}

export const ZONES = {
${zones.map((z) => tsZone(z.zone)).join("\n")}
} satisfies Record<ZoneId, ZoneData>;

export const ZONE_LIST: ZoneData[] = [ZONES.village, ZONES.forest, ZONES.dungeon, ZONES.marsh, ZONES.frost, ZONES.throne];

export function getZone(id: ZoneId): ZoneData {
  return ZONES[id];
}
`;
  fs.writeFileSync(path.join(generatedDir, "world-data.ts"), header);
  const isBlocked = (zone, p) => {
    const tx = Math.floor(p.x / 16);
    const ty = Math.floor(p.y / 16);
    return zone.blocked[ty]?.[tx] === "#";
  };
  for (const z of zones) {
    const points = {
      spawn: z.zone.spawn,
      ...Object.fromEntries(z.zone.npcs.map((n) => [`npc:${n.id}`, n])),
      ...Object.fromEntries(z.zone.monsterSpawns.map((n, i) => [`monster:${n.id}:${i}`, n])),
      ...Object.fromEntries(z.zone.gatherNodes.map((n) => [`gather:${n.id}`, n])),
      ...Object.fromEntries(z.zone.portals.map((p) => [`portal:${p.id}`, { x: p.x + p.w / 2, y: p.y + p.h / 2 }])),
    };
    const bad = Object.entries(points).filter(([, p]) => isBlocked(z.zone, p));
    if (bad.length) throw new Error(`${z.zone.id} has blocked points: ${bad.map(([k]) => k).join(", ")}`);
    for (const p of z.zone.portals) {
      const target = zones.find((candidate) => candidate.zone.id === p.targetZone);
      if (!target) throw new Error(`${z.zone.id} portal ${p.id} has unknown target ${p.targetZone}`);
      if (isBlocked(target.zone, { x: p.targetX, y: p.targetY })) {
        throw new Error(`${z.zone.id} portal ${p.id} lands on blocked tile in ${p.targetZone}`);
      }
    }
  }
  return zones;
}
