import {
  AFFIXES,
  CLASSES,
  ITEMS,
  abilityIcon,
  charFrame,
  itemIcon,
  portraitFrame,
  GEAR_SETS,
  getItem,
  itemDisplayName,
  itemSellValue,
  itemStats,
  type ClassDef,
  type ItemDef,
  type ItemStack,
  type StatBonus,
} from "@realm/core";

const BASE = import.meta.env.BASE_URL;

export function asset(path: string): string {
  return `${BASE}${path.replace(/^\//, "")}`;
}

export function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sheetStyle(file: string, cols: number, index: number, size: number): string {
  const col = ((index % cols) + cols) % cols;
  const row = Math.floor(index / cols);
  return [
    `width:${size}px`,
    `height:${size}px`,
    `background-image:url('${asset(file)}')`,
    `background-size:${cols * size}px auto`,
    `background-position:-${col * size}px -${row * size}px`,
    "background-repeat:no-repeat",
    "display:inline-block",
    "image-rendering:pixelated",
    "flex:none",
  ].join(";");
}

export function itemIconHtml(icon: string, size = 30): string {
  return `<span class="sprite-icon" style="${sheetStyle("assets/items.png", 8, itemIcon(icon), size)}"></span>`;
}

export function abilityIconHtml(icon: string, size = 40): string {
  return `<span class="sprite-icon" style="${sheetStyle("assets/abilities.png", 8, abilityIcon(icon), size)}"></span>`;
}

export function charIconHtml(sprite: string, size = 40): string {
  return `<span class="sprite-icon" style="${sheetStyle("assets/characters.png", 4, charFrame(sprite, "down", 0), size)}"></span>`;
}

export function portraitHtml(sprite: string, size = 64, extraClass = ""): string {
  const frame = portraitFrame(sprite);
  return `<span class="portrait-frame ${extraClass}" style="width:${size}px;height:${size}px;background-image:url('${asset("assets/portraits.png")}');background-size:${size * 5}px auto;background-position:-${frame.col * size}px -${frame.row * size}px"></span>`;
}

export function classPortrait(classId: string, size = 64, extraClass = ""): string {
  return portraitHtml(CLASSES[classId as keyof typeof CLASSES]?.sprite ?? classId, size, extraClass);
}

export function classColor(classId: string): string {
  return CLASSES[classId as keyof typeof CLASSES]?.color ?? "#e8c05a";
}

export function classDef(classId: string): ClassDef | undefined {
  return CLASSES[classId as keyof typeof CLASSES];
}

export function itemDef(itemId: string): ItemDef | undefined {
  return ITEMS[itemId];
}

export function stackName(stack: ItemStack | null): string {
  if (!stack) return "";
  return itemDisplayName(stack);
}

export function formatNumber(value: number): string {
  const v = Math.max(0, Math.round(value));
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}m`;
  if (v >= 10_000) return `${(v / 1000).toFixed(1)}k`;
  return String(v);
}

export function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const STAT_LABELS: Record<keyof StatBonus, string> = {
  attack: "Attack",
  defense: "Defense",
  maxHp: "Health",
  maxResource: "Resource",
  crit: "Crit",
  moveSpeed: "Move Speed",
};

export function statLines(stats?: StatBonus): string[] {
  if (!stats) return [];
  return (Object.entries(stats) as [keyof StatBonus, number][])
    .filter(([, value]) => value !== 0)
    .map(([key, value]) => {
      const shown = key === "crit" ? `${value > 0 ? "+" : ""}${Math.round(value * 100)}%` : `${value > 0 ? "+" : ""}${Math.round(value)}`;
      return `${STAT_LABELS[key]} ${shown}`;
    });
}

export function itemDetailHtml(stack: ItemStack | null, compareTo: ItemStack | null = null): string {
  if (!stack) return `<div class="item-detail"><p class="muted">Select an item to inspect it.</p></div>`;
  const def = getItem(stack.itemId);
  const stats = itemStats(stack);
  const lines = statLines(stats);
  const compareDef = compareTo ? getItem(compareTo.itemId) : null;
  const compareStats = compareTo ? itemStats(compareTo) : null;
  const diffs = compareDef && compareStats
    ? (Object.keys(STAT_LABELS) as (keyof StatBonus)[])
        .map((key) => ({ key, value: (stats[key] ?? 0) - (compareStats[key] ?? 0) }))
        .filter((entry) => Math.abs(entry.value) > 0.001)
    : [];
  const comparison = diffs.length
    ? `<div class="item-compare"><div class="muted small">Compared with ${esc(itemDisplayName(compareTo!))}</div>${diffs
        .map(({ key, value }) => {
          const shown = key === "crit" ? `${Math.round(Math.abs(value) * 100)}%` : `${Math.round(Math.abs(value))}`;
          return `<div class="${value > 0 ? "better" : "worse"}">${value > 0 ? "+" : "-"}${shown} ${STAT_LABELS[key]}</div>`;
        })
        .join("")}</div>`
    : compareDef
      ? `<div class="item-compare muted small">Same stats as ${esc(itemDisplayName(compareTo!))}</div>`
      : "";
  const set = def.set ? GEAR_SETS[def.set] : null;
  const affixes = (stack.instance?.affixes ?? []).map((id) => `Affix: ${AFFIXES[id]?.name ?? id}`).join(" · ");
  return `<div class="item-detail">
    <div style="display:flex;gap:12px;align-items:center">
      <div class="item-icon" style="width:48px;height:48px;display:grid;place-items:center">${itemIconHtml(def.icon, 40)}</div>
      <div>
        <h3 class="rarity-${def.rarity}">${esc(itemDisplayName(stack))}</h3>
        <div class="muted small">${esc(def.type)} · ${esc(def.rarity)}${stack.qty > 1 ? ` · x${stack.qty}` : ""}${stack.instance?.upgrade ? ` · +${stack.instance.upgrade}` : ""}</div>
      </div>
    </div>
    <p class="desc">${esc(def.description)}</p>
    ${lines.length ? `<div class="item-stat">${lines.map(esc).join("<br>")}</div>` : ""}
    ${affixes ? `<div class="small muted">${esc(affixes)}</div>` : ""}
    ${set ? `<div class="small" style="color:var(--gold)">Set: ${esc(set.name)}</div>${set.bonuses.map((bonus) => `<div class="small muted">${bonus.pieces} pieces: ${esc(bonus.text)}</div>`).join("")}` : ""}
    ${comparison}
    ${def.heal ? `<div class="item-stat">Restores ${def.heal} health</div>` : ""}
    ${def.restore ? `<div class="item-stat">Restores ${def.restore} resource</div>` : ""}
    ${def.buy ? `<div class="muted small">Value: ${def.buy} gold · Sells for ${itemSellValue(stack)}</div>` : `<div class="muted small">Sells for ${itemSellValue(stack)}</div>`}
  </div>`;
}

export function questObjectiveText(objective: { kind: string; monsterId?: string; itemId?: string; zone?: string; zones?: string[]; count?: number }, progress: number, monsterName?: (id: string) => string, itemName?: (id: string) => string): string {
  if (objective.kind === "kill") return `${monsterName?.(objective.monsterId ?? "") ?? objective.monsterId}: ${progress}/${objective.count ?? 1}`;
  if (objective.kind === "boss") return `Defeat ${monsterName?.(objective.monsterId ?? "") ?? objective.monsterId} (${progress}/1)`;
  if (objective.kind === "collect") return `Collect ${itemName?.(objective.itemId ?? "") ?? objective.itemId}: ${progress}/${objective.count ?? 1}`;
  if (objective.kind === "visit") return `Visit ${objective.zone} (${progress}/1)`;
  if (objective.kind === "explore") return `Explore new zones: ${progress}/${objective.zones?.length ?? 0}`;
  if (objective.kind === "survive") return `Survive in ${objective.zone}: ${progress}/${objective.count ?? 0} seconds`;
  return "";
}
