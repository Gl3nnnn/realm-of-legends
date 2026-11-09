import { getClass, type CharacterSave } from "@realm/core";

/**
 * The share card.
 *
 * One press draws the hero onto a canvas and hands back a PNG, so a player can
 * post their build without photographing their own screen. Everything is drawn
 * here rather than in a DOM element, because a picture is the point.
 */
const WIDTH = 1000;
const HEIGHT = 560;

const CLASS_COLORS: Record<string, string> = {
  warrior: "#c9713c",
  paladin: "#e8c96a",
  mage: "#6f8cf0",
  priest: "#e8e2ff",
  necromancer: "#8f7bc4",
  druid: "#5fc28a",
  archer: "#8fd16a",
  ranger: "#79b06a",
  monk: "#e0a86a",
  gunslinger: "#c98a6a",
  berserker: "#d05a4a",
  summoner: "#a07dd8",
  spellblade: "#7fc6d8",
  dragonknight: "#d06a8a",
  warden: "#6aa8c9",
  oracle: "#c9a8e8",
  battlemage: "#9a7fd8",
  shadowdancer: "#7a7ac4",
  artificer: "#c9a06a",
  beastmaster: "#a8b06a",
  duelist: "#e0819a",
  elementalist: "#6ac9d8",
  sentinel: "#9aa0b4",
  stormcaller: "#7ac4e8",
};

/** The zone name and level a card prints, taken straight from the save. */
function zoneLabel(save: CharacterSave): string {
  return save.zone.charAt(0).toUpperCase() + save.zone.slice(1);
}

/** A gold-ish ribbon behind the numbers, drawn with a few shapes rather than assets. */
function drawFrame(ctx: CanvasRenderingContext2D, color: string): void {
  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, "#0d1017");
  gradient.addColorStop(0.5, "#141924");
  gradient.addColorStop(1, "#0b0e14");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // The class colour as a soft glow behind the portrait, so no two cards look alike.
  const glow = ctx.createRadialGradient(210, 250, 30, 210, 250, 320);
  glow.addColorStop(0, color);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.globalAlpha = 1;

  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.55;
  ctx.strokeRect(18, 18, WIDTH - 36, HEIGHT - 36);
  ctx.globalAlpha = 1;
}

/** The hero's silhouette: a hooded shape in the class colour, in place of a sprite. */
function drawPortrait(ctx: CanvasRenderingContext2D, color: string, name: string): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(210, 250, 110, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.stroke();

  // Shoulders
  ctx.beginPath();
  ctx.moveTo(150, 360);
  ctx.quadraticCurveTo(210, 300, 270, 360);
  ctx.lineTo(270, 330);
  ctx.quadraticCurveTo(210, 285, 150, 330);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.75;
  ctx.fill();

  // Head
  ctx.beginPath();
  ctx.arc(210, 232, 44, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.9;
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.fillStyle = "#0d1017";
  ctx.beginPath();
  ctx.arc(194, 236, 7, 0, Math.PI * 2);
  ctx.arc(226, 236, 7, 0, Math.PI * 2);
  ctx.fill();

  // The first letter of the name, so the card reads as that hero and not any hero.
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = "#0d1017";
  ctx.font = "700 22px 'Segoe UI', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(name.slice(0, 1).toUpperCase(), 210, 300);
  ctx.restore();
}

function drawStat(ctx: CanvasRenderingContext2D, x: number, y: number, value: string, label: string): void {
  ctx.fillStyle = "#f2e9d8";
  ctx.font = "700 30px 'Segoe UI', system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(value, x, y);
  ctx.fillStyle = "rgba(242,233,216,0.55)";
  ctx.font = "500 15px 'Segoe UI', system-ui, sans-serif";
  ctx.fillText(label, x, y + 24);
}

/** Draw the whole card onto a canvas. */
export function drawShareCard(canvas: HTMLCanvasElement, save: CharacterSave): void {
  const ratio = window.devicePixelRatio > 1 ? 2 : 1;
  canvas.width = WIDTH * ratio;
  canvas.height = HEIGHT * ratio;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  const classDef = getClass(save.classId);
  const color = CLASS_COLORS[save.classId] ?? "#c9a96a";
  drawFrame(ctx, color);
  drawPortrait(ctx, color, save.name);

  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(242,233,216,0.5)";
  ctx.font = "600 14px 'Segoe UI', system-ui, sans-serif";
  ctx.fillText("REALM OF LEGENDS", 380, 88);

  ctx.fillStyle = "#f7efdd";
  ctx.font = "800 46px 'Segoe UI', system-ui, sans-serif";
  ctx.fillText(save.name, 380, 140);

  ctx.fillStyle = color;
  ctx.font = "600 20px 'Segoe UI', system-ui, sans-serif";
  ctx.fillText(`${classDef.name} • Level ${save.level}${save.hardcore ? " • Hardcore" : ""}`, 380, 174);

  const title = save.title && save.title.length ? save.title : "No title";
  ctx.fillStyle = "rgba(242,233,216,0.7)";
  ctx.font = "italic 500 16px 'Segoe UI', system-ui, sans-serif";
  ctx.fillText(`"${title}"`, 380, 202);

  drawStat(ctx, 380, 260, String(save.stats.bossesSlain), "Bosses felled");
  drawStat(ctx, 550, 260, String(save.descentBest), "Deepest descent");
  drawStat(ctx, 720, 260, String(save.arenaBest), "Hollow Ring waves");
  drawStat(ctx, 880, 260, `T${save.torment}`, "Torment");

  drawStat(ctx, 380, 340, `${Math.floor(save.playtime / 3600)}h`, "Time played");
  drawStat(ctx, 550, 340, String(save.stats.monstersSlain), "Monsters slain");
  drawStat(ctx, 720, 340, String(save.stats.deaths), "Deaths");
  drawStat(ctx, 880, 340, zoneLabel(save), "Last seen");

  ctx.fillStyle = "rgba(242,233,216,0.35)";
  ctx.font = "500 13px 'Segoe UI', system-ui, sans-serif";
  const hours = Math.floor(save.playtime / 3600);
  const minutes = Math.floor((save.playtime % 3600) / 60);
  ctx.fillText(`${hours}h ${minutes}m played • ${save.defeatedBosses.length} boss${save.defeatedBosses.length === 1 ? "" : "es"} down`, 380, 430);

  ctx.strokeStyle = "rgba(242,233,216,0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(380, 465);
  ctx.lineTo(940, 465);
  ctx.stroke();

  ctx.fillStyle = "rgba(242,233,216,0.45)";
  ctx.font = "500 13px 'Segoe UI', system-ui, sans-serif";
  ctx.fillText("Eldoria Village • played on this device", 380, 495);
}

/** Draw the card and hand the browser a PNG to save. */
export function downloadShareCard(save: CharacterSave): void {
  const canvas = document.createElement("canvas");
  drawShareCard(canvas, save);
  const url = canvas.toDataURL("image/png");
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `realm-${save.name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-level-${save.level}.png`;
  anchor.click();
}
