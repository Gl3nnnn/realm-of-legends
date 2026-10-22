import fs from "node:fs";
import { PNG } from "pngjs";

export function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hex(c) {
  const s = c.replace("#", "");
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}

export function shade(c, amt) {
  const [r, g, b] = hex(c);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + amt)));
  return `#${[f(r), f(g), f(b)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export function makeImage(w, h) {
  return { w, h, data: Buffer.alloc(w * h * 4) };
}

export function px(im, x, y, c, a = 255) {
  if (x < 0 || y < 0 || x >= im.w || y >= im.h) return;
  const [r, g, b] = typeof c === "string" ? hex(c) : c;
  const i = (y * im.w + x) * 4;
  im.data[i] = r;
  im.data[i + 1] = g;
  im.data[i + 2] = b;
  im.data[i + 3] = a;
}

export function rect(im, x, y, w, h, c, a = 255) {
  for (let yy = y; yy < y + h; yy += 1) for (let xx = x; xx < x + w; xx += 1) px(im, xx, yy, c, a);
}

export function rectOutline(im, x, y, w, h, c, a = 255) {
  for (let xx = x; xx < x + w; xx += 1) {
    px(im, xx, y, c, a);
    px(im, xx, y + h - 1, c, a);
  }
  for (let yy = y; yy < y + h; yy += 1) {
    px(im, x, yy, c, a);
    px(im, x + w - 1, yy, c, a);
  }
}

export function ellipse(im, cx, cy, rx, ry, c, a = 255) {
  for (let y = -ry; y <= ry; y += 1) {
    for (let x = -rx; x <= rx; x += 1) {
      if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) px(im, cx + x, cy + y, c, a);
    }
  }
}

export function line(im, x0, y0, x1, y1, c, a = 255) {
  let dx = Math.abs(x1 - x0);
  let dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    px(im, x0, y0, c, a);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}

export function blit(im, source, ox, oy) {
  for (let y = 0; y < source.h; y += 1) {
    for (let x = 0; x < source.w; x += 1) {
      const i = (y * source.w + x) * 4;
      if (source.data[i + 3] === 0) continue;
      px(im, ox + x, oy + y, [source.data[i], source.data[i + 1], source.data[i + 2]], source.data[i + 3]);
    }
  }
}

export function upscale(im, ox, oy, source, srcX, srcY, srcW, srcH, scale) {
  for (let y = 0; y < srcH; y += 1) {
    for (let x = 0; x < srcW; x += 1) {
      const i = ((srcY + y) * source.w + (srcX + x)) * 4;
      if (source.data[i + 3] === 0) continue;
      const color = [source.data[i], source.data[i + 1], source.data[i + 2]];
      for (let sy = 0; sy < scale; sy += 1) {
        for (let sx = 0; sx < scale; sx += 1) {
          px(im, ox + x * scale + sx, oy + y * scale + sy, color, source.data[i + 3]);
        }
      }
    }
  }
}

export function savePng(file, im) {
  const png = new PNG({ width: im.w, height: im.h });
  png.data = im.data;
  fs.writeFileSync(file, PNG.sync.write(png));
}
