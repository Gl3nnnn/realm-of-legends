import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(here, "../client/dist");
const base = "/realm-of-legends/";
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

try {
  await stat(path.join(dist, "index.html"));
} catch {
  fail("client/dist/index.html is missing. Run the production build first.");
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (!url.pathname.startsWith(base)) {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("Outside the GitHub Pages base path");
      return;
    }
    let rel = decodeURIComponent(url.pathname.slice(base.length));
    if (!rel || rel.endsWith("/")) rel += "index.html";
    const file = path.resolve(dist, rel);
    if (!file.startsWith(dist + path.sep) && file !== path.join(dist, "index.html")) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    const info = await stat(file);
    if (!info.isFile()) throw new Error("not a file");
    const content = await readFile(file);
    res.writeHead(200, { "content-type": mime[path.extname(file)] ?? "application/octet-stream", "content-length": content.length });
    res.end(content);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("Not found");
  }
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
const origin = `http://127.0.0.1:${port}`;

async function get(pathname) {
  const response = await fetch(`${origin}${pathname}`);
  const buffer = await response.arrayBuffer();
  return { response, buffer, body: new TextDecoder().decode(buffer) };
}

try {
  const index = await get(base);
  assert(index.response.status === 200, "index.html was not served at the base path");

  const assetPaths = [...index.body.matchAll(/(?:src|href)="(\.?\/[^"]+)"/g)]
    .map((match) => match[1])
    .filter((value) => !value.startsWith("data:"));
  const localAssets = assetPaths.map((value) => {
    if (value.startsWith(base)) return value;
    if (value.startsWith("./")) return base + value.slice(2);
    fail(`index.html references a root-relative URL outside the Pages base: ${value}`);
  });

  for (const assetPath of new Set(localAssets)) {
    const result = await get(assetPath);
    assert(result.response.status === 200, `${assetPath} returned ${result.response.status}`);
  }

  const scripts = [...index.body.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
  assert(scripts.length > 0, "No module script found in index.html");
  for (const script of scripts) {
    const url = script.startsWith(base) ? script : script.startsWith("./") ? base + script.slice(2) : null;
    assert(url, `script URL does not respect the Pages base: ${script}`);
    const js = await get(url);
    assert(js.response.status === 200, `script ${script} returned ${js.response.status}`);
    assert(js.body.length > 100_000, "main bundle looks too small to contain the game");
    for (const marker of ["boot-screen", "char-select", "hud", "realm-of-legends"]) {
      assert(js.body.includes(marker), `bundle is missing expected runtime string: ${marker}`);
    }
  }

  const manifest = await get(`${base}manifest.webmanifest`);
  assert(manifest.response.status === 200, "manifest.webmanifest is missing");
  const parsed = JSON.parse(manifest.body);
  assert(Array.isArray(parsed.icons) && parsed.icons.length >= 2, "manifest icons are missing");
  for (const icon of parsed.icons) {
    const iconPath = new URL(icon.src, `${origin}${base}`).pathname;
    const result = await get(iconPath);
    assert(result.response.status === 200, `manifest icon ${icon.src} is missing`);
  }

  const sw = await get(`${base}sw.js`);
  assert(sw.response.status === 200, "service worker is missing");
  assert(sw.body.includes("workbox"), "service worker does not look like a Workbox build");

  for (const asset of [
    "assets/tilesets/eldoria.png",
    "assets/characters.png",
    "assets/monsters.png",
    "assets/portraits.png",
    "assets/items.png",
    "assets/abilities.png",
    "assets/maps/village.json",
    "assets/maps/forest.json",
    "assets/maps/dungeon.json",
  ]) {
    const result = await get(`${base}${asset}`);
    assert(result.response.status === 200, `${asset} is missing from the Pages build`);
    assert(result.buffer.byteLength > 500, `${asset} is suspiciously small`);
  }

  const outside = await get("/assets/index.js");
  assert(outside.response.status === 404, "server unexpectedly served a path outside the base");

  console.log(`PASS: GitHub Pages build serves correctly from ${base}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  server.close();
}
