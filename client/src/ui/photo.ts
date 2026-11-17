// Photo mode: a clean picture of the fight with your hero's details printed on it.
// The HUD is a DOM layer over the canvas, so hiding it leaves the world untouched and
// the shot comes straight from whatever the renderer last drew.

export interface PhotoCard {
  /** Hero name. */
  name: string;
  /** Class name, already in the player's language. */
  className: string;
  /** Level, printed next to the class. */
  level: number;
  /** Zone the shot was taken in. */
  zone: string;
  /** Earned title, or an empty string when the hero has none. */
  title: string;
}

const PADDING = 3.2;

/**
 * Ask the renderer for one frame of the world. Phaser handles this for both canvas and
 * WebGL, which is why the picture is taken through the game instead of off the canvas
 * element directly: a WebGL canvas reads back empty unless it was preserved for us.
 */
export function grabFrame(game: { renderer: { snapshot: (callback: (image: HTMLImageElement | PhaserImage) => void, type?: string, encoderOptions?: number) => unknown } }): Promise<CanvasImageSource> {
  return new Promise((resolve, reject) => {
    const guard = setTimeout(() => reject(new Error("The world did not answer in time.")), 2000);
    try {
      game.renderer.snapshot((image) => {
        clearTimeout(guard);
        const source = image as unknown as CanvasImageSource;
        if (!source) reject(new Error("No picture came back."));
        else resolve(source);
      }, "image/png");
    } catch (error) {
      clearTimeout(guard);
      reject(error instanceof Error ? error : new Error("No picture came back."));
    }
  });
}

interface PhaserImage {
  width?: number;
  height?: number;
  naturalWidth?: number;
  naturalHeight?: number;
}

function sourceWidth(source: CanvasImageSource): number {
  if (source instanceof HTMLImageElement) return source.naturalWidth || source.width;
  if (source instanceof HTMLCanvasElement) return source.width;
  const sized = source as unknown as PhaserImage;
  return sized.width ?? sized.naturalWidth ?? 0;
}

function sourceHeight(source: CanvasImageSource): number {
  if (source instanceof HTMLImageElement) return source.naturalHeight || source.height;
  if (source instanceof HTMLCanvasElement) return source.height;
  const sized = source as unknown as PhaserImage;
  return sized.height ?? sized.naturalHeight ?? 0;
}

/** Compose the world frame and the caption card into one picture, at full size. */
export function composePhoto(source: CanvasImageSource, card: PhotoCard): HTMLCanvasElement {
  const width = sourceWidth(source) || 1280;
  const height = sourceHeight(source) || 720;
  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;
  const ctx = out.getContext("2d");
  if (!ctx) return out;
  ctx.drawImage(source, 0, 0, width, height);

  // Scale everything to the picture, so a phone shot reads like a desktop one.
  const unit = Math.max(11, Math.round(height / 46));
  const margin = Math.round(unit * PADDING);
  const boxHeight = Math.round(unit * 4.6);
  const boxWidth = Math.min(width - margin * 2, Math.round(width * 0.66));

  ctx.fillStyle = "rgba(10, 9, 16, 0.72)";
  ctx.fillRect(margin, height - margin - boxHeight, boxWidth, boxHeight);
  ctx.fillStyle = "rgba(214, 178, 96, 0.92)";
  ctx.fillRect(margin, height - margin - boxHeight, Math.round(unit * 0.32), boxHeight);

  const textX = margin + Math.round(unit * 1.3);
  const topY = height - margin - boxHeight;
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = "#f4efe6";
  ctx.font = `bold ${Math.round(unit * 1.75)}px system-ui, sans-serif`;
  ctx.fillText(clip(ctx, card.name, boxWidth - (textX - margin) - unit), textX, topY + Math.round(unit * 1.95));

  ctx.fillStyle = "#d6b260";
  ctx.font = `${Math.round(unit * 1.15)}px system-ui, sans-serif`;
  const subline = [`Lv ${card.level}`, card.className].filter(Boolean).join(" · ");
  ctx.fillText(clip(ctx, subline, boxWidth - (textX - margin) - unit), textX, topY + Math.round(unit * 3.15));

  ctx.fillStyle = "rgba(244, 239, 230, 0.78)";
  ctx.font = `${Math.round(unit * 1.05)}px system-ui, sans-serif`;
  const place = card.title ? `${card.zone} · ${card.title}` : card.zone;
  ctx.fillText(clip(ctx, place, boxWidth - (textX - margin) - unit), textX, topY + Math.round(unit * 4.2));

  return out;
}

/** Keep a line inside its box instead of spilling past the card. */
function clip(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1);
  return `${cut}…`;
}

/** True on phones, where a downloaded file is awkward and the share sheet is the way out. */
export function canSharePhoto(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.canShare === "function";
}

/**
 * Hand the picture to the player: the share sheet on a phone when the browser allows
 * sharing an image, otherwise an ordinary download. Returns a short line for the toast.
 */
export async function deliverPhoto(canvas: HTMLCanvasElement, filename: string): Promise<string> {
  const blob = await new Promise<Blob | null>((resolve) => {
    if (typeof canvas.toBlob === "function") canvas.toBlob((value) => resolve(value), "image/png");
    else resolve(null);
  });
  if (!blob) throw new Error("The picture could not be built.");

  const file = typeof File === "function" ? new File([blob], filename, { type: "image/png" }) : null;
  if (file && canSharePhoto() && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Realm of Legends" });
      return "Shot shared.";
    } catch (error) {
      // Cancelling the share sheet is not a failure worth reporting; the download below
      // covers the browsers that refuse to share an image.
      if ((error as DOMException | undefined)?.name === "AbortError") return "Shot ready.";
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return "Shot saved to your downloads.";
}
