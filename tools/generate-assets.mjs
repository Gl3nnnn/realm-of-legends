import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeImage, savePng, rect, upscale } from "./lib/pixels.mjs";
import { drawTileset } from "./lib/tiles.mjs";
import { drawCharacters, CHAR_ORDER } from "./lib/characters.mjs";
import { drawMonsters, drawPortraits, MONSTER_ORDER } from "./lib/creatures.mjs";
import { drawAtlas, drawIcon } from "./lib/icons.mjs";
import { buildWorld } from "./lib/maps.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "client", "public");
const ASSETS = path.join(PUBLIC, "assets");
const GENERATED = path.join(ROOT, "core", "src", "generated");

function ensure(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function uniq(list) {
  return [...new Set(list)];
}

function itemIcons() {
  const text = fs.readFileSync(path.join(ROOT, "core", "src", "data", "items.ts"), "utf8");
  return uniq([...text.matchAll(/icon:\s*"([^"]+)"/g)].map((m) => m[1]));
}

function abilityIcons() {
  const text = fs.readFileSync(path.join(ROOT, "core", "src", "data", "classes.ts"), "utf8");
  const found = [
    ...text.matchAll(/skill\(\s*"[^"]+"\s*,\s*"[^"]+"\s*,\s*"([^"]+)"/g),
    ...text.matchAll(/basicRanged\(\s*"([^"]+)"/g),
    ...text.matchAll(/basicMelee\(\s*"[^"]+"\s*,\s*"([^"]+)"/g),
  ].map((m) => m[1]);
  return uniq([...found, "sword", "bow", "staff", "fist", "shield", "arrow"]);
}

function makeAppIcon(size) {
  const base = makeImage(64, 64);
  rect(base, 0, 0, 64, 64, "#17161f");
  rect(base, 2, 2, 60, 60, "#262433");
  rect(base, 2, 2, 60, 2, "#e8c05a");
  rect(base, 2, 60, 60, 2, "#e8c05a");
  rect(base, 2, 2, 2, 60, "#e8c05a");
  rect(base, 60, 2, 2, 60, "#e8c05a");
  const icon = drawIcon("sword");
  upscale(base, 8, 8, icon, 0, 0, 16, 16, 3);
  const out = makeImage(size, size);
  upscale(out, 0, 0, base, 0, 0, 64, 64, size / 64);
  return out;
}

function main() {
  ensure(ASSETS);
  ensure(path.join(ASSETS, "tilesets"));
  ensure(path.join(ASSETS, "maps"));
  ensure(path.join(ASSETS, "icons"));
  ensure(GENERATED);

  const tileset = drawTileset();
  savePng(path.join(ASSETS, "tilesets", "eldoria.png"), tileset.image);

  const chars = drawCharacters();
  savePng(path.join(ASSETS, "characters.png"), chars);

  const monsters = drawMonsters();
  savePng(path.join(ASSETS, "monsters.png"), monsters);

  const portraits = drawPortraits(chars);
  savePng(path.join(ASSETS, "portraits.png"), portraits);

  const items = itemIcons();
  const abilities = abilityIcons();
  const itemAtlas = drawAtlas(items);
  const abilityAtlas = drawAtlas(abilities);
  savePng(path.join(ASSETS, "items.png"), itemAtlas.image);
  savePng(path.join(ASSETS, "abilities.png"), abilityAtlas.image);

  savePng(path.join(ASSETS, "icons", "icon-192.png"), makeAppIcon(192));
  savePng(path.join(ASSETS, "icons", "icon-512.png"), makeAppIcon(512));

  const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="10" fill="#17161f"/>
  <rect x="3" y="3" width="58" height="58" rx="8" fill="none" stroke="#e8c05a" stroke-width="2"/>
  <path d="M32 9l16 6v14c0 12-8 19-16 25-8-6-16-13-16-25V15z" fill="#b23a3a" stroke="#e8c05a" stroke-width="2"/>
  <path d="M32 18v22M24 26h16" stroke="#f5e6b8" stroke-width="4" stroke-linecap="round"/>
</svg>
`;
  fs.writeFileSync(path.join(PUBLIC, "favicon.svg"), favicon);

  const zones = buildWorld(path.join(ASSETS, "maps"), GENERATED);

  const manifest = `export const CHAR_ORDER = ${JSON.stringify(CHAR_ORDER)};
export const MONSTER_ORDER = ${JSON.stringify(MONSTER_ORDER)};
export const ITEM_ICON_ORDER = ${JSON.stringify(items)};
export const ABILITY_ICON_ORDER = ${JSON.stringify(abilities)};

export const CHAR_INDEX: Record<string, number> = ${JSON.stringify(Object.fromEntries(CHAR_ORDER.map((id, i) => [id, i])), null, 2)};
export const MONSTER_INDEX: Record<string, number> = ${JSON.stringify(Object.fromEntries(MONSTER_ORDER.map((id, i) => [id, i])), null, 2)};
export const ITEM_ICON_INDEX: Record<string, number> = ${JSON.stringify(Object.fromEntries(items.map((id, i) => [id, i])), null, 2)};
export const ABILITY_ICON_INDEX: Record<string, number> = ${JSON.stringify(Object.fromEntries(abilities.map((id, i) => [id, i])), null, 2)};

export const DIR_ORDER = ["down", "left", "right", "up"] as const;
export const PORTRAIT_ORDER = CHAR_ORDER.slice(0, 15);

export function charFrame(sprite: string, dir: string, frame: number): number {
  const entity = CHAR_INDEX[sprite] ?? 0;
  const d = Math.max(0, DIR_ORDER.indexOf(dir as (typeof DIR_ORDER)[number]));
  return entity * 16 + d * 4 + (((frame % 4) + 4) % 4);
}

export function monsterFrame(sprite: string, frame: number): number {
  const row = MONSTER_INDEX[sprite] ?? 0;
  return row * 4 + (((frame % 4) + 4) % 4);
}

export function itemIcon(sprite: string): number {
  return ITEM_ICON_INDEX[sprite] ?? ITEM_ICON_INDEX.sword ?? 0;
}

export function abilityIcon(sprite: string): number {
  return ABILITY_ICON_INDEX[sprite] ?? ABILITY_ICON_INDEX.sword ?? 0;
}

export function portraitFrame(sprite: string): { col: number; row: number } {
  const i = Math.max(0, PORTRAIT_ORDER.indexOf(sprite));
  return { col: i % 5, row: Math.floor(i / 5) };
}

export const ATLASES = {
  characters: { key: "characters", file: "assets/characters.png", frameWidth: 32, frameHeight: 32, columns: 4 },
  monsters: { key: "monsters", file: "assets/monsters.png", frameWidth: 32, frameHeight: 32, columns: 4 },
  portraits: { key: "portraits", file: "assets/portraits.png", frameWidth: 64, frameHeight: 64, columns: 5 },
  items: { key: "items", file: "assets/items.png", frameWidth: 16, frameHeight: 16, columns: 8 },
  abilities: { key: "abilities", file: "assets/abilities.png", frameWidth: 16, frameHeight: 16, columns: 8 },
} as const;
`;
  fs.writeFileSync(path.join(GENERATED, "art-manifest.ts"), manifest);

  const blocked = zones.map((z) => {
    const count = z.zone.blocked.reduce((sum, row) => sum + [...row].filter((ch) => ch === "#").length, 0);
    return `${z.zone.id}: ${z.zone.width}x${z.zone.height}, ${count} blocked`;
  });
  console.log("Generated assets:");
  console.log(`  tileset ${tileset.image.w}x${tileset.image.h}`);
  console.log(`  characters ${chars.w}x${chars.h} (${CHAR_ORDER.length} entities)`);
  console.log(`  monsters ${monsters.w}x${monsters.h} (${MONSTER_ORDER.length})`);
  console.log(`  portraits ${portraits.w}x${portraits.h}`);
  console.log(`  items ${items.length} icons, abilities ${abilities.length} icons`);
  console.log(`  maps: ${zones.map((z) => z.zone.id).join(", ")}`);
  blockInfo(blocked);
}

function blockInfo(lines) {
  for (const line of lines) console.log(`  ${line}`);
}

main();
