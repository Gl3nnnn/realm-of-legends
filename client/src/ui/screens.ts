import {
  CLASS_LIST,
  FLAGSHIP_CLASSES,
  ITEMS,
  AFFIXES,
  DESCENT_BOONS,
  LORE_ENTRIES,
  MAX_CHARACTERS,
  MAX_UPGRADE,
  MEDAL_LABELS,
  MONSTERS,
  NG_PLUS_DIALOGUE,
  NPCS,
  QUESTS,
  RECIPES,
  SHOPS,
  SIDE_QUEST_WHISPERS,
  STASH_CAPACITIES,
  ZONES,
  bloodMoonClock,
  canClassUse,
  deriveStats,
  getClass,
  getItem,
  getTalentTree,
  isEquippable,
  itemDisplayName,
  itemSellValue,
  itemStats,
  loreBySubject,
  medalClock,
  monsterGuide,
  revealedLore,
  starterEquipment,
  talentBonuses,
  talentTierChosen,
  achievementRows,
  achievementProgress,
  heroVerdict,
  journalStats,
  waypointRows,
  BLESSINGS,
  MAX_MASTERY,
  diaryRows,
  masteredCount,
  DESCENT_PACTS,
  DESCENT_RELICS,
  achievementReward,
  getGem,
  getPetGear,
  PET_STAGES,
  socketCount,
  socketedGems,
  type CharacterSave,
  type ClassId,
  type GameSession,
  type ItemStack,
  type MemorialEntry,
} from "@realm/core";
import { KEYBIND_LABELS, type GamePreferences, type KeybindAction } from "./preferences";
import { t, type TextKey } from "./text";
import {
  abilityIconHtml,
  charIconHtml,
  classDef,
  classPortrait,
  esc,
  formatNumber,
  formatTime,
  itemDef,
  itemDetailHtml,
  itemIconHtml,
  questObjectiveText,
  statLines,
} from "./helpers";

const RARITY_ORDER = ["common", "uncommon", "rare", "epic", "legendary"];

/** Plain words for the Descent's fight effects, so the journal reads like a build. */
const SPECIAL_LABELS: Record<string, string> = {
  lifesteal: "heal on hit",
  healOnKill: "heal on kill",
  thorns: "damage back",
  execute: "bonus on weak foes",
  shardBonus: "extra shards",
};

const CLASS_CATEGORIES: { id: string; label: TextKey; classes: ClassId[] }[] = [
  { id: "all", label: "classFilterAll", classes: CLASS_LIST.map((def) => def.id) },
  { id: "melee", label: "classFilterMelee", classes: ["warrior", "assassin", "paladin", "monk", "berserker", "spellblade", "dragonknight", "warden", "battlemage", "shadowdancer", "duelist", "sentinel"] },
  { id: "ranged", label: "classFilterRanged", classes: ["archer", "ranger", "gunslinger", "artificer", "beastmaster", "stormcaller"] },
  { id: "magic", label: "classFilterMagic", classes: ["mage", "priest", "necromancer", "druid", "summoner", "spellblade", "oracle", "battlemage", "elementalist", "stormcaller"] },
  { id: "support", label: "classFilterSupport", classes: ["priest", "paladin", "druid", "summoner", "warden", "oracle", "beastmaster", "sentinel"] },
  { id: "mobile", label: "classFilterMobile", classes: ["assassin", "monk", "ranger", "gunslinger", "shadowdancer", "duelist", "beastmaster"] },
];

export function characterSelectHtml(saves: CharacterSave[]): string {
  const cards = saves
    .map((save) => {
      const def = getClass(save.classId);
      const updated = new Date(save.updatedAt).toLocaleDateString();
      return `<article class="save-card" data-id="${esc(save.id)}">
        ${classPortrait(save.classId, 64)}
        <div>
          <h3>${esc(save.name)}${save.hardcore ? ` <span class="hc-badge" title="One death and this hero is gone for good">Hardcore</span>` : ""}</h3>
          <div class="muted">${esc(def.name)} · Level ${save.level}</div>
          <div class="meta">
            <span>${esc(ZONES[save.zone]?.name ?? save.zone)}</span>
            <span>Playtime ${formatTime(save.playtime)} · ${esc(updated)}</span>
            <span class="gold">${formatNumber(save.gold)} gold</span>
          </div>
          <div class="card-actions">
            <button class="btn small" data-action="play" data-id="${esc(save.id)}">${t("btnPlay")}</button>
            <button class="btn ghost small" data-action="export-save" data-id="${esc(save.id)}">${t("btnExport")}</button>
            <button class="btn danger small" data-action="delete-save" data-id="${esc(save.id)}">${t("btnDelete")}</button>
          </div>
        </div>
      </article>`;
    })
    .join("");
  const newCard =
    saves.length < MAX_CHARACTERS
      ? `<button class="save-card new" data-action="new-character">
          <span class="logo-mark" style="width:52px;height:52px;font-size:9px">+</span>
          <span class="pixel" style="font-size:10px">Forge a new hero</span>
          <span class="muted small">${saves.length}/${MAX_CHARACTERS} slots used</span>
        </button>`
      : "";
  return `${cards}${newCard}`;
}

export function createPanelHtml(selectedClass: ClassId, roleFilter: string = "all", search = "", hardcore = false): string {
  const filterButtons = CLASS_CATEGORIES
    .map((category) => `<button class="chip-btn ${roleFilter === category.id ? "active" : ""}" data-action="class-role-filter" data-value="${esc(category.id)}" aria-pressed="${roleFilter === category.id}">${esc(t(category.label))}</button>`)
    .join("");
  const category = CLASS_CATEGORIES.find((entry) => entry.id === roleFilter) ?? CLASS_CATEGORIES[0]!;
  const query = search.trim().toLocaleLowerCase();
  const visibleClasses = CLASS_LIST.filter((def) => category.classes.includes(def.id))
    .filter((def) => !query || `${def.name} ${def.role} ${def.weapon} ${def.description}`.toLocaleLowerCase().includes(query));
  const cards = visibleClasses.map((def) => {
    const flagship = FLAGSHIP_CLASSES.includes(def.id);
    return `<button class="class-card ${def.id === selectedClass ? "selected" : ""}" data-action="select-class" data-class="${def.id}" aria-pressed="${def.id === selectedClass}">
      ${classPortrait(def.id, 52, "card-portrait")}
      <span>
        <span class="class-name">${esc(def.name)}</span>
        <span class="class-role">${esc(def.role)} · ${esc(def.difficulty)}</span>
        ${flagship ? `<span class="badge">Recommended</span>` : ""}
      </span>
    </button>`;
  }).join("");
  const def = getClass(selectedClass);
  // The numbers a new hero really starts with: class base plus starter gear and the passive talent.
  const start = deriveStats(def, 1, starterEquipment(def.id), talentBonuses(def.id, []));
  const previewStats = [
    ["Health", Math.round(start.maxHp)],
    ["Attack", Math.round(start.attack)],
    ["Defense", Math.round(start.defense)],
    ["Crit", `${Math.round(start.crit * 100)}%`],
  ]
    .map(([label, value]) => `<span class="preview-stat"><b>${esc(String(value))}</b>${esc(String(label))}</span>`)
    .join("");
  const previewAbilities = [
    `<span class="preview-ability"><b>${esc(def.basic.name)}</b><span>Basic</span></span>`,
    ...def.abilities.map((ability) => `<span class="preview-ability" title="${esc(ability.description)}"><b>${esc(ability.name)}</b><span>Lv ${ability.unlockLevel}</span><small>${esc(ability.description)}</small></span>`),
  ].join("");
  return `<div class="create-top">
    <div class="field">
      <label for="char-name">Hero name</label>
      <input id="char-name" type="text" maxlength="16" autocomplete="off" spellcheck="false" placeholder="Enter a name..." />
      <div id="create-error" class="small" style="color:#ff9fa0;min-height:16px"></div>
      <label class="hardcore-toggle">
        <input id="char-hardcore" type="checkbox" ${hardcore ? "checked" : ""} />
        <span><strong>Hardcore</strong> - one death and this hero is gone for good, and their name goes on the memorial wall. There is no respawn and no second chance.</span>
      </label>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn" data-action="create-character">${t("btnEnterEldoria")}</button>
      <button class="btn ghost" data-action="cancel-create">${t("btnBack")}</button>
    </div>
  </div>
  <div>
    <div class="section-title">Choose a class — ${esc(def.name)}</div>
    <div class="muted small" style="margin-bottom:10px">${esc(def.description)}</div>
    <div class="class-filters">
      <label class="class-search"><span>${esc(t("classSearchLabel"))}</span><input type="search" data-class-search value="${esc(search)}" placeholder="${esc(t("classSearchPlaceholder"))}" aria-label="${esc(t("classSearchLabel"))}" /></label>
      <div class="role-filters" aria-label="${esc(t("classFiltersLabel"))}">${filterButtons}</div>
    </div>
    <div class="class-listing" aria-live="polite">
      ${cards ? `<div class="class-grid">${cards}</div>` : `<div class="empty-state">${esc(t("classNoResults"))}</div>`}
    </div>
    <div class="class-preview">
      <div class="preview-hero">${classPortrait(def.id, 128, "preview-portrait")}</div>
      <div>
        <div class="section-title">Starting stats</div>
        <div class="preview-stats">${previewStats}</div>
      </div>
      <div>
        <div class="section-title">Kit preview</div>
        <div class="preview-abilities">${previewAbilities}</div>
      </div>
    </div>
  </div>
  <div class="create-footer">
    <span class="muted small">${esc(def.weapon)} · ${esc(def.resource)} user · ${esc(def.difficulty)} difficulty</span>
    <span class="muted small">Your hero is stored only in this browser. Export any time.</span>
  </div>`;
}

export function abilityBarHtml(session: GameSession): string {
  const basic = session.classInfo.basic;
  const basicSlot = `<button class="ability-slot basic" data-cast="basic" title="${esc(basic.name)} — click or Space">
    <span class="ability-key">LMB</span>
    <span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%)">${abilityIconHtml(basic.icon, 40)}</span>
  </button>`;
  const slots = session.classInfo.abilities.slice(0, 5).map((ability, i) => {
    const unlocked = session.save.level >= ability.unlockLevel;
    const notEnough = unlocked && session.save.resource < ability.cost;
    return `<button class="ability-slot ${unlocked ? "ready" : "empty"} ${notEnough ? "no-resource" : ""}" data-cast="${unlocked ? ability.id : ""}" title="${esc(ability.name)} — ${esc(ability.description)}">
      <span class="ability-key">${i + 1}</span>
      ${unlocked ? `<span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%)">${abilityIconHtml(ability.icon, 40)}</span>` : ""}
      ${ability.cost > 0 && unlocked ? `<span class="ability-cost">${ability.cost}</span>` : ""}
      ${!unlocked ? `<span class="lock">Lv ${ability.unlockLevel}</span>` : ""}
      <span class="cooldown" data-cd="${ability.id}" style="height:0%"></span>
    </button>`;
  }).join("");
  return basicSlot + slots;
}

export function quickbarHtml(session: GameSession, keys: [string, string] = ["Z", "X"]): string {
  const cooldownPct = Math.min(100, session.potionCooldown * 100);
  return session.save.quickSlots
    .map((itemId, index) => {
      const def = itemId ? getItem(itemId) : null;
      const qty = itemId ? session.countItem(itemId) : 0;
      const label = def ? `${def.name} · ${keys[index]} to use` : "Empty quick slot · bind a potion in your inventory";
      return `<button class="quick-slot ${def ? "filled" : "empty"}" data-quickslot="${index}" title="${esc(label)}" aria-label="${esc(label)}">
        <span class="quick-key">${keys[index]}</span>
        ${def ? `<span class="quick-icon">${itemIconHtml(def.icon, 26)}</span>` : `<span class="quick-empty">+</span>`}
        ${def ? `<span class="qty">${qty}</span>` : ""}
        ${def && cooldownPct > 0 ? `<span class="quick-cd" style="height:${cooldownPct}%"></span>` : ""}
      </button>`;
    })
    .join("");
}

function stackCell(stack: ItemStack | null, index: number, selected: boolean, compareHint = "", verdict: "up" | "down" | "" = ""): string {
  if (!stack) return `<button class="inv-slot empty" data-slot="${index}" aria-label="Empty slot"></button>`;
  const def = getItem(stack.itemId);
  const title = `${itemDisplayName(stack)}${compareHint ? ` - ${compareHint}` : ""}`;
  return `<button class="inv-slot rarity-${def.rarity} ${selected ? "selected" : ""}" data-slot="${index}" title="${esc(title)}">
    <span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%)">${itemIconHtml(def.icon, 32)}</span>
    <span class="slot-rarity"></span>
    ${verdict ? `<span class="slot-verdict ${verdict}" aria-hidden="true">${verdict === "up" ? "\u25b2" : "\u25bc"}</span>` : ""}
    ${stack.qty > 1 ? `<span class="qty">${stack.qty}</span>` : ""}
  </button>`;
}

export type InventoryFilter = "all" | "weapon" | "armor" | "helm" | "boots" | "trinket" | "consumable" | "material";
export type InventorySort = "default" | "rarity" | "name" | "type";

const FILTERS: { id: InventoryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "weapon", label: "Weapons" },
  { id: "armor", label: "Armor" },
  { id: "helm", label: "Helms" },
  { id: "boots", label: "Boots" },
  { id: "trinket", label: "Trinkets" },
  { id: "consumable", label: "Potions" },
  { id: "material", label: "Materials" },
];

const SORTS: { id: InventorySort; label: string }[] = [
  { id: "default", label: "Bag order" },
  { id: "rarity", label: "Rarity" },
  { id: "name", label: "Name" },
  { id: "type", label: "Type" },
];

export function inventoryPanelHtml(
  session: GameSession,
  selectedSlot: number | null,
  selectedEquip: string | null,
  filter: InventoryFilter = "all",
  sort: InventorySort = "default",
): string {
  const save = session.save;
  const entries = save.inventory
    .map((stack, index) => ({ stack, index }))
    .filter((entry): entry is { stack: ItemStack; index: number } => Boolean(entry.stack))
    .filter(({ stack }) => filter === "all" || getItem(stack.itemId).type === filter);
  if (sort === "rarity") entries.sort((a, b) => itemRarityOrder(getItem(b.stack.itemId).rarity) - itemRarityOrder(getItem(a.stack.itemId).rarity));
  else if (sort === "name") entries.sort((a, b) => getItem(a.stack.itemId).name.localeCompare(getItem(b.stack.itemId).name));
  else if (sort === "type") entries.sort((a, b) => getItem(a.stack.itemId).type.localeCompare(getItem(b.stack.itemId).type));
  const grid = entries
    .map(({ stack, index }) => {
      // Hover read the name only; now it reads the numbers too, so a drop can be judged
      // without clicking it first. The full coloured breakdown is still in the detail panel.
      const compare = session.compareToEquipped(stack);
      const hint = compare && compare.lines.length ? compare.lines.join(", ") : compare ? "same as worn" : "";
      // One mark per slot: more winning stats than losing ones counts as an upgrade, so a
      // piece that trades a little health for attack still reads as a gain.
      const gains = compare ? compare.lines.filter((line) => line.startsWith("+")).length : 0;
      const losses = compare ? compare.lines.filter((line) => line.startsWith("-")).length : 0;
      const verdict: "up" | "down" | "" = gains > losses ? "up" : losses > gains ? "down" : "";
      return stackCell(stack, index, selectedSlot === index, hint, verdict);
    })
    .join("");
  const fillers = Array.from({ length: Math.max(0, 24 - entries.length) }, () => `<div class="inv-slot empty" aria-hidden="true"></div>`).join("");
  // Counts on the filter chips: an empty filter is a dead button, a counted one is a shortcut.
  const typeCounts = save.inventory.reduce<Record<string, number>>((map, slot) => {
    if (!slot) return map;
    const type = getItem(slot.itemId).type;
    map[type] = (map[type] ?? 0) + 1;
    map.all = (map.all ?? 0) + 1;
    return map;
  }, {});
  const filterButtons = FILTERS.map(
    (entry) => {
      const count = typeCounts[entry.id] ?? 0;
      return `<button class="chip-btn ${filter === entry.id ? "active" : ""} ${count === 0 && entry.id !== "all" ? "chip-empty" : ""}" data-action="inv-filter" data-value="${entry.id}">${entry.label}<span class="chip-count">${count}</span></button>`;
    },
  ).join("");
  const sortButtons = SORTS.map(
    (entry) => `<button class="chip-btn ${sort === entry.id ? "active" : ""}" data-action="inv-sort" data-value="${entry.id}">${entry.label}</button>`,
  ).join("");
  const equipSlots: (keyof CharacterSave["equipment"])[] = ["weapon", "armor", "helm", "boots", "trinket"];
  const slotNames: Record<string, string> = { weapon: "Weapon", armor: "Armour", helm: "Helm", boots: "Boots", trinket: "Trinket" };
  const equipment = equipSlots
    .map((slot) => {
      const wornStack = save.equipment[slot];
      const wornDef = wornStack ? getItem(wornStack.itemId) : null;
      const socketFill = wornStack ? socketedGems(wornStack).length : 0;
      const socketCap = wornStack ? socketCount(wornStack) : 0;
      const wearLine = wornDef
        ? `${wornDef.type.charAt(0).toUpperCase()}${wornDef.type.slice(1)} · ${wornDef.rarity}`
        : "no piece";
      return `<button class="gear-card ${wornStack ? "filled" : "empty"} ${wornDef ? `rarity-${wornDef.rarity}` : ""} ${selectedEquip === slot ? "selected" : ""}" data-equip="${slot}" title="${wornStack ? esc(itemDisplayName(wornStack)) : `Empty ${slotNames[slot]} slot`}">
        <span class="gear-frame">
          ${wornStack ? itemIconHtml(wornDef!.icon, 36) : `<span class="gear-ghost">${slotNames[slot].charAt(0)}</span>`}
          ${wornStack?.instance?.upgrade ? `<span class="gear-plus">+${wornStack.instance.upgrade}</span>` : ""}
          ${socketCap ? `<span class="gear-gems">${socketFill}/${socketCap}</span>` : ""}
        </span>
        <span class="gear-meta">
          <span class="gear-slot-name">${slotNames[slot]}</span>
          <span class="gear-item-name">${wornStack ? esc(itemDisplayName(wornStack)) : "Empty"}</span>
          <span class="gear-wear">${wearLine}</span>
        </span>
      </button>`;
    })
    .join("");
  // A character sheet only reads well with its totals, so the five slot stats are added up.
  const gearTotals = equipSlots.reduce(
    (sum, slot) => {
      const worn = save.equipment[slot];
      if (!worn) return sum;
      const stats = itemStats(worn);
      return {
        attack: sum.attack + (stats.attack ?? 0),
        defense: sum.defense + (stats.defense ?? 0),
        maxHp: sum.maxHp + (stats.maxHp ?? 0),
        crit: sum.crit + (stats.crit ?? 0),
      };
    },
    { attack: 0, defense: 0, maxHp: 0, crit: 0 },
  );
  const gearStats = `<div class="gear-totals">
    <span class="gear-total"><strong>${Math.round(gearTotals.attack)}</strong> Attack</span>
    <span class="gear-total"><strong>${Math.round(gearTotals.defense)}</strong> Defence</span>
    <span class="gear-total"><strong>${Math.round(gearTotals.maxHp)}</strong> Health</span>
    <span class="gear-total"><strong>${Math.round(gearTotals.crit * 100)}%</strong> Crit</span>
  </div>`;
  const stack = selectedEquip ? save.equipment[selectedEquip as keyof CharacterSave["equipment"]] ?? null : selectedSlot !== null ? save.inventory[selectedSlot] : null;
  const selectedDef = stack ? getItem(stack.itemId) : null;
  const compareTo =
    !selectedEquip && selectedDef && isEquippable(selectedDef)
      ? save.equipment[selectedDef.type as keyof CharacterSave["equipment"]] ?? null
      : null;
  let actions = "";
  if (stack && selectedEquip) {
    actions = `<button class="btn small" data-action="unequip" data-slot="${selectedEquip}">Unequip</button>`;
  } else if (stack && selectedSlot !== null) {
    const def = getItem(stack.itemId);
    if (def.type === "consumable") {
      actions += `<button class="btn small" data-action="use" data-slot="${selectedSlot}">Use</button>`;
      actions += `<button class="btn ghost small" data-action="bind-quick" data-slot="${selectedSlot}" data-quick="0">Bind Z</button>`;
      actions += `<button class="btn ghost small" data-action="bind-quick" data-slot="${selectedSlot}" data-quick="1">Bind X</button>`;
    }
    if (isEquippable(def)) {
      const usableByClass = canClassUse(def, save.classId);
      const meetsLevel = !def.requiresLevel || save.level >= def.requiresLevel;
      const usable = usableByClass && meetsLevel;
      actions += `<button class="btn small" data-action="equip" data-slot="${selectedSlot}" ${usable ? "" : "disabled"}>Equip</button>`;
      if (!usableByClass) actions += `<span class="small" style="color:#ff9fa0;align-self:center">Not usable by ${esc(getClass(save.classId).name)}</span>`;
      else if (!meetsLevel) actions += `<span class="small" style="color:#ff9fa0;align-self:center">Requires level ${def.requiresLevel}</span>`;
    }
    actions += `<button class="btn ghost small" data-action="sell" data-slot="${selectedSlot}">Sell for ${itemSellValue(stack)}g</button>`;
  }
  const rerollCost = stack ? session.rerollAffixCost(stack) : null;
  const affixes = stack?.instance?.affixes ?? [];
  if (stack && rerollCost && affixes.length > 0) {
    const target = selectedEquip ? `data-equip="${selectedEquip}"` : `data-slot="${selectedSlot}"`;
    const canReroll = save.gold >= rerollCost.gold && session.countItem("iron_ore") >= rerollCost.ore;
    actions += affixes
      .map((id, index) => `<button class="btn ghost small" data-action="reroll-affix" ${target} data-index="${index}" ${canReroll ? "" : "disabled"}>Reroll ${esc(AFFIXES[id]?.name ?? id)} (${rerollCost.gold}g + ${rerollCost.ore} ore)</button>`)
      .join("");
  }
  // Sockets: a gem set into gear keeps working while the item is worn, so this row is
  // the whole gem system in one place, on any selected item that can hold one.
  const sockets = stack ? socketCount(stack) : 0;
  const setGems = stack ? socketedGems(stack) : [];
  if (stack && stack.instance && sockets > 0) {
    const target = selectedEquip ? `data-equip="${selectedEquip}"` : `data-slot="${selectedSlot}"`;
    const open = Math.max(0, sockets - setGems.length);
    const setRows = setGems
      .map((gemId, index) => `<span class="gem-chip" style="border-color:${getGem(gemId)?.color ?? "#666"}">${esc(getGem(gemId)?.name ?? gemId)}${selectedEquip ? ` <button class="gem-x" data-action="unsocket-gem" data-slot="${selectedEquip}" data-index="${index}" title="Take this gem back out">x</button>` : ""}</span>`)
      .join("");
    const choices = session.backpackGems
      .map((row) => `<button class="gem-chip" style="border-color:${getGem(row.gemId)?.color ?? "#666"}" data-action="socket-gem" ${target} data-gem="${row.gemId}">Set ${esc(row.name)} (${row.qty})</button>`)
      .join("");
    actions += `<div class="small muted">Sockets: ${setGems.length} of ${sockets} filled${open > 0 ? ` · ${open} open` : " · full"}</div>`;
    if (setRows) actions += `<div class="gem-row">${setRows}</div>`;
    if (open > 0) {
      actions += choices
        ? `<div class="gem-row">${choices}</div>`
        : `<div class="small muted">No gems in the backpack. They come from bosses, chests and achievement rewards.</div>`;
    }
  }
  const compareLines = !selectedEquip && stack ? session.compareToEquipped(stack) : null;
  const compareHtml = compareLines && compareLines.lines.length
    ? `<div class="compare-box"><div class="small muted">Against your ${esc(compareLines.slot)}</div>${compareLines.lines
        .map((line) => `<span class="compare-line ${line.startsWith("+") ? "up" : "down"}">${esc(line)}</span>`)
        .join("")}</div>`
    : "";
  const usedSquares = save.inventory.reduce((count, slot) => (slot ? count + 1 : count), 0);
  const bagTone = usedSquares >= 24 ? "full" : usedSquares >= 20 ? "tight" : "";
  const gemHeld = session.backpackGems.reduce((sum, row) => sum + row.qty, 0);
  // The detail column said nothing about what was in it, so the card head carries the
  // answer now: worn or in the bag, and which rarity you are looking at.
  const selectionNote = stack
    ? `${selectedEquip ? "Worn" : "In the bag"} · ${getItem(stack.itemId).rarity}`
    : "Nothing selected";
  return `<div class="inv-sheet">
    <header class="inv-hero">
      <div class="inv-hero-portrait">${classPortrait(save.classId, 56)}</div>
      <div class="inv-hero-body">
        <strong>${esc(save.name)}</strong>
        <span class="small muted">${esc(getClass(save.classId).name)} · Level ${save.level} · ${esc(session.zone.name)}</span>
        <div class="inv-hero-chips">
          <span class="settings-chip gold">${formatNumber(save.gold)} gold</span>
          <span class="settings-chip ${bagTone}">${usedSquares} of 24 squares</span>
          <span class="settings-chip">${gemHeld} gem${gemHeld === 1 ? "" : "s"} held</span>
        </div>
      </div>
      <div class="bag-tools inv-hero-tools">
        <button class="btn ghost small" data-action="quick-sort">Tidy</button>
        <button class="btn ghost small" data-action="equip-best">Wear best</button>
        <button class="chip-btn ${session.autoSalvageJunk ? "active" : ""}" data-action="toggle-junk-filter" title="Common and uncommons for your class turn into ore the moment they are picked up">Junk filter ${session.autoSalvageJunk ? "on" : "off"}</button>
      </div>
    </header>
    <div class="panel-columns bag-layout">
      <div class="bag-main">
        <section class="inv-card">
          <div class="inv-card-head">
            <strong>What you carry</strong>
            <span class="inv-card-note">Showing ${entries.length} of ${usedSquares} squares</span>
          </div>
          <div class="bag-meter ${bagTone}" role="progressbar" aria-valuenow="${usedSquares}" aria-valuemin="0" aria-valuemax="24"><span style="width:${Math.round((usedSquares / 24) * 100)}%"></span></div>
          <div class="inv-toolbar">
            <div class="chip-row">${filterButtons}</div>
            <div class="chip-row sort-row"><span class="chip-label">Sort</span>${sortButtons}</div>
          </div>
          <div class="inv-grid">${grid}${fillers}</div>
          ${entries.length === 0 ? `<div class="small muted" style="margin-top:8px">No items match this filter.</div>` : ""}
        </section>
        <section class="inv-card">
          <div class="inv-card-head">
            <strong>What you wear</strong>
            <span class="inv-card-note">Five slots, their socket gems, and the totals they add up to</span>
          </div>
          <div class="gear-board">
            <div class="gear-doll">
              ${classPortrait(save.classId, 76)}
              <div class="doll-name">${esc(save.name)}</div>
              <div class="small muted">Level ${save.level} ${esc(getClass(save.classId).name)}</div>
            </div>
            <div class="gear-grid">${equipment}</div>
          </div>
          ${gearStats}
        </section>
      </div>
      <div class="bag-detail">
        <section class="inv-card">
          <div class="inv-card-head">
            <strong>Selected piece</strong>
            <span class="inv-card-note">${esc(selectionNote)}</span>
          </div>
          ${itemDetailHtml(stack, compareTo)}
          ${compareHtml}
          <div class="detail-actions">${actions}</div>
          <div class="small muted">Consumables bind to Z or X. Hover a square to see its numbers against what you wear.</div>
        </section>
        ${gemFuseSection(session)}
      </div>
    </div>
  </div>`;
}
/**
 * One village counter, whole.
 *
 * Borin, Mira and Elara sell three different things, but the screen is the same
 * job: who is serving you, what they have, what it costs, and what you can hand
 * back. This draws all of it the same way, so a player learns one layout in the
 * village instead of three.
 *
 * Every button keeps the data-action the panel's click handler already answers
 * to, so nothing behind this changed.
 */

/** Where a line of stock belongs on the shelf: supplies, then gear, gems, companion kit. */
function stockGroup(itemId: string): { label: string; order: number } {
  const def = getItem(itemId);
  const kind = String(def.type);
  if (itemId.startsWith("gem_")) return { label: "Gems", order: 2 };
  if (kind === "material" || kind === "consumable") return { label: "Supplies", order: 0 };
  if (kind === "pet_gear") return { label: "Companion kit", order: 3 };
  return { label: "Gear", order: 1 };
}

/** A price written the way the rest of the game writes gold. */
function goldAmount(value: number): string {
  return `${formatNumber(value)} <span class="shop-coin">g</span>`;
}

/** The counter header: who is serving you, what you carry, what you can spend. */
function shopHeroHtml(session: GameSession, shopId: string, shopName: string): string {
  const host = Object.values(NPCS).find((entry) => entry.shop === shopId);
  const colour = host?.color ?? "#e8c05a";
  const openingLine = host?.dialogue?.[0] ?? "Everything on the counter is priced and ready.";
  return `<header class="shop-hero" style="--shop-color:${esc(colour)}">
    <div class="shop-hero-portrait">${charIconHtml(host?.sprite ?? "merchant", 54)}</div>
    <div class="shop-hero-body">
      <strong>${esc(host?.name ?? shopName)}</strong>
      <span>${esc(host?.role ?? "Merchant")} · ${esc(shopName)}</span>
      <span class="shop-hero-line">"${esc(openingLine)}"</span>
    </div>
    <div class="shop-hero-stats">
      <div class="shop-stat"><span>Hero</span><strong>Level ${session.save.level}</strong></div>
      <div class="shop-stat gold"><span>Purse</span><strong>${formatNumber(session.save.gold)} g</strong></div>
      <div class="shop-stat"><span>Backpack</span><strong>${session.freeSlots()} free</strong></div>
    </div>
  </header>`;
}

/** One line of stock: the item, what it does, what it costs, and why you cannot buy it. */
function shopRow(session: GameSession, itemId: string): string {
  const def = getItem(itemId);
  const price = Math.max(1, Math.ceil((def.buy ?? 0) * (1 - session.shopDiscountPercent / 100)));
  const canAfford = session.save.gold >= price;
  const canUse = canClassUse(def, session.save.classId);
  const levelMet = !def.requiresLevel || session.save.level >= def.requiresLevel;
  const hasSpace = session.canAdd(itemId, 1);
  const canBuy = canAfford && canUse && levelMet && hasSpace;
  const stats = statLines(def.stats).slice(0, 3).join(" · ");
  const blocked = !canUse ? "Not for this class" : !levelMet ? `Requires level ${def.requiresLevel}` : !hasSpace ? "Backpack full" : "";
  const note = blocked || stats || def.description;
  return `<article class="stock-row${canBuy ? "" : " locked"}">
    <div class="stock-icon">
      ${itemIconHtml(def.icon, 30)}
      <span class="rar-flag r-${def.rarity}"></span>
    </div>
    <div class="stock-body">
      <div class="stock-name rarity-${def.rarity}">${esc(def.name)}</div>
      <div class="stock-note">${esc(note)}</div>
      <div class="stock-tags">
        <span class="tag r-${def.rarity}">${esc(def.rarity)}</span>
        ${def.requiresLevel ? `<span class="tag">Lv ${def.requiresLevel}</span>` : ""}
        ${def.stack > 1 ? `<span class="tag">stacks ${def.stack}</span>` : ""}
      </div>
    </div>
    <div class="stock-buy">
      <span class="stock-price${canAfford ? "" : " short"}">${goldAmount(price)}</span>
      ${price < (def.buy ?? 0) ? `<span class="stock-was"><s>${formatNumber(def.buy ?? 0)} g</s></span>` : ""}
      <button class="btn small" data-action="buy" data-item="${esc(def.id)}" ${canBuy ? "" : "disabled"}>${blocked ? "Locked" : "Buy"}</button>
    </div>
  </article>`;
}

/** The buy side: every line on its shelf, with the shelf named. */
function shopStockHtml(session: GameSession, shopId: string, shopName: string): string {
  const shop = SHOPS[shopId];
  const entries = shop.itemIds
    .map((id) => ({ id, group: stockGroup(id) }))
    .sort((a, b) => a.group.order - b.group.order || getItem(a.id).name.localeCompare(getItem(b.id).name));
  const shelfParts: string[] = [];
  let current = "";
  let rows = "";
  for (const entry of entries) {
    if (entry.group.label !== current) {
      if (rows) shelfParts.push(`<div class="stock-group">${esc(current)}</div>${rows}`);
      current = entry.group.label;
      rows = "";
    }
    rows += shopRow(session, entry.id);
  }
  if (rows) shelfParts.push(`<div class="stock-group">${esc(current)}</div>${rows}`);
  const discount = session.shopDiscountPercent > 0
    ? `<span class="shop-perk">Trust of the village: ${session.shopDiscountPercent}% off every line</span>`
    : `<span class="small muted">Prices do not move. Buy what you can carry.</span>`;
  return `<section class="shop-card">
    <header class="shop-card-head">
      <div>
        <h4>On the counter <span class="shop-count">${shop.itemIds.length} lines</span></h4>
        <span class="small muted">${esc(shopName)} keeps this stock.</span>
      </div>
      ${discount}
    </header>
    <div class="stock-shelves">${shelfParts.join("")}</div>
  </section>`;
}

/** The sell side: your pack, priced per square, with the bulk buttons on top. */
function shopSellHtml(session: GameSession): string {
  const cells = session.save.inventory
    .map((stack, i) => {
      if (!stack) return `<div class="inv-slot empty" aria-hidden="true"></div>`;
      const def = getItem(stack.itemId);
      const worth = itemSellValue(stack);
      return `<button class="inv-slot sell-slot" data-action="sell-slot" data-slot="${i}" title="Sell ${esc(itemDisplayName(stack))} for ${worth}g">
        <span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%)">${itemIconHtml(def.icon, 32)}</span>
        ${stack.qty > 1 ? `<span class="qty">${stack.qty}</span>` : ""}
        <span class="sell-worth">${formatNumber(worth)}g</span>
      </button>`;
    })
    .join("");
  return `<section class="shop-card sell-card">
    <header class="shop-card-head">
      <div>
        <h4>Sell from the pack <span class="shop-count">${session.freeSlots()} free</span></h4>
        <span class="small muted">Click a square to sell one. The small number is what it pays.</span>
      </div>
      <div class="sell-tools">
        <button class="btn ghost small" data-action="sell-materials">Sell materials</button>
        <button class="btn ghost small" data-action="sell-junk">Sell junk gear</button>
      </div>
    </header>
    <div class="inv-grid sell-grid">${cells}</div>
    <div class="small muted">Worn gear cannot be sold here, and quest items stay in the pack.</div>
  </section>`;
}

/** A row of pips that fills up as a piece of gear is tempered. */
function benchPips(level: number): string {
  return `<div class="bench-pips">${Array.from({ length: MAX_UPGRADE }, (_, i) => `<span class="bench-pip${i < level ? " on" : ""}"></span>`).join("")}</div>`;
}

/** The gear you are wearing, one row each, with what the next temper costs. */
function forgeUpgradesHtml(session: GameSession): string {
  const slotLabels: Record<string, string> = { weapon: "Weapon", armor: "Armour", helm: "Helm", boots: "Boots", trinket: "Trinket" };
  const slots: (keyof CharacterSave["equipment"])[] = ["weapon", "armor", "helm", "boots", "trinket"];
  const rows = slots
    .map((slot) => {
      const stack = session.save.equipment[slot];
      if (!stack) return "";
      const cost = session.upgradeCost(slot);
      const goldOk = Boolean(cost && session.save.gold >= cost.gold);
      const oreOk = Boolean(cost && session.countItem("iron_ore") >= cost.ore);
      const ready = Boolean(cost && goldOk && oreOk);
      const level = cost ? cost.next - 1 : MAX_UPGRADE;
      return `<article class="bench-row${ready ? " ready" : ""}">
        <div class="bench-rank">
          <span class="bench-plus">+${level}</span>
          ${benchPips(level)}
        </div>
        <div class="stock-icon">${itemIconHtml(getItem(stack.itemId).icon, 26)}</div>
        <div class="bench-body">
          <div class="stock-name rarity-${getItem(stack.itemId).rarity}">${esc(itemDisplayName(stack))}</div>
          <span class="bench-slot">${esc(slotLabels[slot] ?? String(slot))}</span>
          ${cost
            ? `<div class="cost-chips">
                <span class="cost-chip${goldOk ? " ok" : " short"}">${formatNumber(cost.gold)} g</span>
                <span class="cost-chip${oreOk ? " ok" : " short"}">${cost.ore}x iron ore</span>
              </div>`
            : `<div class="cost-chips"><span class="cost-chip ok">Masterwork</span></div>`}
        </div>
        <div class="stock-buy">
          <button class="btn small" data-action="upgrade-slot" data-slot="${slot}" ${ready ? "" : "disabled"}>${cost ? `Temper +${cost.next}` : "Maxed"}</button>
        </div>
      </article>`;
    })
    .join("");
  return `<div class="bench-col">
    <header class="bench-head"><h5>What you wear</h5><span class="small muted">Each temper is permanent.</span></header>
    <div class="bench-list">${rows || `<div class="small muted">Equip a weapon or a piece of armour and it can be tempered here.</div>`}</div>
  </div>`;
}

/** The recipes, with a chip per material so you see the one you are short of. */
function forgeRecipesHtml(session: GameSession): string {
  const rows = RECIPES.map((recipe) => {
    const result = getItem(recipe.resultItemId);
    const goldOk = session.save.gold >= recipe.gold;
    const materialsOk = recipe.materials.every((material) => session.countItem(material.itemId) >= material.qty);
    const canCraft = goldOk
      && materialsOk
      && session.canAdd(recipe.resultItemId, 1)
      && canClassUse(result, session.save.classId)
      && (!result.requiresLevel || session.save.level >= result.requiresLevel);
    const chips = recipe.materials
      .map((material) => {
        const have = session.countItem(material.itemId);
        const ok = have >= material.qty;
        return `<span class="cost-chip${ok ? " ok" : " short"}">${have}/${material.qty} ${esc(getItem(material.itemId).name)}</span>`;
      })
      .join("");
    return `<article class="bench-row${canCraft ? " ready" : ""}">
      <div class="stock-icon">${itemIconHtml(result.icon, 26)}</div>
      <div class="bench-body">
        <div class="stock-name rarity-${result.rarity}">${esc(recipe.name)} <span class="tag r-${result.rarity}">${esc(result.rarity)}</span></div>
        <span class="bench-slot">Gathered in ${esc(recipe.zone)}</span>
        <div class="cost-chips">${chips}<span class="cost-chip${goldOk ? " ok" : " short"}">${formatNumber(recipe.gold)} g</span></div>
      </div>
      <div class="stock-buy">
        <button class="btn small" data-action="craft" data-recipe="${esc(recipe.id)}" ${canCraft ? "" : "disabled"}>Craft</button>
      </div>
    </article>`;
  }).join("");
  return `<div class="bench-col">
    <header class="bench-head"><h5>Recipes</h5><span class="small muted">Bring the ore and the coin.</span></header>
    <div class="bench-list">${rows}</div>
  </div>`;
}

/** The forge's second half: temper what you wear, or forge something new. */
function forgeSectionHtml(session: GameSession): string {
  return `<section class="shop-card bench-card">
    <header class="shop-card-head">
      <div>
        <h4>Borin's bench <span class="shop-count">${session.countItem("iron_ore")} iron ore</span></h4>
        <span class="small muted">Ore comes from salvage and from the wilds.</span>
      </div>
    </header>
    <div class="bench-columns">
      ${forgeUpgradesHtml(session)}
      ${forgeRecipesHtml(session)}
    </div>
  </section>`;
}

export function shopPanelHtml(session: GameSession, shopId: string): string {
  const shop = SHOPS[shopId];
  if (!shop) return `<div class="empty-state">This shop is closed.</div>`;
  return `<div class="shop-wrap">
    ${shopHeroHtml(session, shopId, shop.name)}
    <div class="shop-grid">
      ${shopStockHtml(session, shopId, shop.name)}
      ${shopSellHtml(session)}
    </div>
    ${shopId === "forge" ? forgeSectionHtml(session) : ""}
  </div>`;
}


/** The village vault: a second grid that survives the trip into the wilds. */
/** The village vault: a second grid that survives the trip into the wilds. */
/** The village vault: a second grid that survives the trip into the wilds. */
export function stashPanelHtml(session: GameSession): string {
  const save = session.save;
  const capacity = session.stashCapacity;
  const used = session.stashUsed;
  const upgrade = session.stashUpgradeCost();
  const fillPct = capacity > 0 ? Math.round((used / capacity) * 100) : 0;
  const vaultCells = Array.from({ length: capacity }, (_, index) => {
    const stack = save.stash[index] ?? null;
    if (!stack) return `<div class="inv-slot empty" aria-hidden="true"></div>`;
    const def = getItem(stack.itemId);
    return `<button class="inv-slot" data-action="stash-withdraw" data-slot="${index}" title="Take ${esc(itemDisplayName(stack))}">
      <span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%)">${itemIconHtml(def.icon, 32)}</span>
      ${stack.qty > 1 ? `<span class="qty">${stack.qty}</span>` : ""}
    </button>`;
  }).join("");
  const bagCells = save.inventory.map((stack, index) => {
    if (!stack) return `<div class="inv-slot empty" aria-hidden="true"></div>`;
    const def = getItem(stack.itemId);
    return `<button class="inv-slot" data-action="stash-deposit" data-slot="${index}" title="Store ${esc(itemDisplayName(stack))}">
      <span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%)">${itemIconHtml(def.icon, 32)}</span>
      ${stack.qty > 1 ? `<span class="qty">${stack.qty}</span>` : ""}
    </button>`;
  }).join("");
  const nextCapacity = upgrade ? STASH_CAPACITIES[upgrade.nextTier] : capacity;
  const canAfford = upgrade ? save.gold >= upgrade.gold : false;
  const upgradeCard = upgrade
    ? `<section class="inv-card">
          <div class="inv-card-head">
            <strong>Next size</strong>
            <span class="inv-card-note">${capacity} to ${nextCapacity} squares</span>
          </div>
          <div class="small muted">A bigger vault keeps what your pack cannot carry. Paid once, kept forever.</div>
          <div class="detail-actions">
            <button class="btn small" data-action="stash-upgrade" ${canAfford ? "" : "disabled"}>Expand to ${nextCapacity} squares \u00b7 ${upgrade.gold}g</button>
            ${canAfford ? "" : `<span class="small" style="color:#ff9fa0;align-self:center">You need ${formatNumber(upgrade.gold - save.gold)} more gold</span>`}
          </div>
        </section>`
    : `<section class="inv-card">
          <div class="inv-card-head">
            <strong>Next size</strong>
            <span class="inv-card-note">Fully expanded</span>
          </div>
          <div class="small muted">The vault cannot grow any further. ${capacity} squares is the whole shelf.</div>
        </section>`;
  return `<div class="inv-sheet">
    <header class="inv-hero">
      <div class="inv-hero-portrait">${classPortrait(save.classId, 56)}</div>
      <div class="inv-hero-body">
        <strong>The village vault</strong>
        <span class="small muted">${esc(getClass(save.classId).name)} \u00b7 Level ${save.level} \u00b7 ${used} of ${capacity} squares stored</span>
        <div class="inv-hero-chips">
          <span class="settings-chip gold">${formatNumber(save.gold)} gold</span>
          <span class="settings-chip">${session.freeSlots()} free squares in the pack</span>
          <span class="settings-chip">${upgrade ? `Next size ${nextCapacity}` : "Fully expanded"}</span>
        </div>
      </div>
      <div class="bag-tools inv-hero-tools">
        <button class="btn ghost small" data-action="stash-sort">Tidy vault</button>
        <button class="btn ghost small" data-action="stash-materials">Deposit materials</button>
      </div>
    </header>
    <div class="panel-columns bag-layout">
      <div class="bag-main">
        <section class="inv-card">
          <div class="inv-card-head">
            <strong>In the vault</strong>
            <span class="inv-card-note">${used} of ${capacity} squares \u00b7 click a piece to take it back</span>
          </div>
          <div class="bag-meter" role="progressbar" aria-valuenow="${used}" aria-valuemin="0" aria-valuemax="${capacity}"><span style="width:${fillPct}%"></span></div>
          <div class="inv-grid">${vaultCells}</div>
        </section>
      </div>
      <div class="bag-detail">
        <section class="inv-card">
          <div class="inv-card-head">
            <strong>In your pack</strong>
            <span class="inv-card-note">${session.freeSlots()} free squares \u00b7 click a piece to store it</span>
          </div>
          <div class="inv-grid">${bagCells}</div>
          <div class="small muted">Quest counters only count what you carry, so take quest items back out before turning them in.</div>
        </section>
        ${upgradeCard}
      </div>
    </div>
  </div>`;
}

function objectiveRow(questId: string, progress: number, objectiveIndex: number): string {
  const quest = QUESTS[questId];
  const objective = quest?.objectives[objectiveIndex];
  if (!objective) return "";
  const count = "count" in objective ? objective.count : objective.kind === "explore" ? objective.zones.length : 1;
  const done = progress >= count;
  const text = questObjectiveText(
    objective,
    progress,
    (id) => MONSTERS[id]?.name ?? id,
    (id) => ITEMS[id]?.name ?? id,
  );
  return `<div class="objective ${done ? "done" : ""}">${done ? "✓" : "•"} ${esc(text)}</div>`;
}

/**
 * The Journey track: a free, permanent progression bar filled by finishing deeds.
 * It never expires, so a player who comes back after a month has not missed anything.
 */
export function journeySection(session: GameSession): string {
  const journey = session.journey;
  const next = journey.next;
  const pct = next ? Math.min(100, Math.round((journey.points / next.needed) * 100)) : 100;
  const ready = journey.stops.filter((stop) => stop.state === "ready").length;
  const stops = journey.stops
    .map((stop) => `<div class="journey-stop ${stop.state}">
        <div class="journey-stop-head"><span class="journey-level">${stop.level}</span><span class="journey-label">${esc(stop.label)}</span></div>
        <div class="small muted">${stop.needed} points \u00b7 ${stop.gold} gold \u00b7 ${stop.state === "claimed" ? "claimed" : stop.state === "ready" ? "ready to claim" : "locked"}</div>
      </div>`)
    .join("");
  return `<div class="journal-section" id="journal-journey">
    <div class="qtitle">The Journey \u00b7 level ${journey.level}</div>
    <div class="small muted">${journey.points} points \u00b7 ${session.deedPointsLeft} still to earn from deeds. Free, permanent \u00b7 never reset.</div>
    <div class="journey-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct}%"></span></div>
    <div class="small muted">${next ? `${journey.toNext} points to stop ${next.level}` : "Every stop reached. The song is sung."}</div>
    ${ready > 0 ? `<button class="btn" data-action="claim-journey">Claim ${ready} stop${ready === 1 ? "" : "s"}</button>` : `<div class="small muted">Finish a deed to move the bar.</div>`}
    <div class="journey-stops">${stops}</div>
  </div>`;
}

/** Every deed, grouped by zone, with live progress. */
export function deedsSection(session: GameSession): string {
  const deeds = session.deedBoard;
  const zones: string[] = [];
  for (const deed of deeds) if (!zones.includes(deed.zone)) zones.push(deed.zone);
  const groups = zones
    .map((zone) => {
      const rows = deeds
        .filter((deed) => deed.zone === zone)
        .map((deed) => {
          const pct = Math.min(100, Math.round((deed.progress / deed.target) * 100));
          return `<div class="deed-row ${deed.done ? "done" : ""}">
            <div class="deed-head"><span class="deed-name">${esc(deed.name)}</span><span class="deed-points">+${deed.points}</span></div>
            <div class="small muted">${esc(deed.task)}</div>
            <div class="deed-bar"><span style="width:${pct}%"></span></div>
            <div class="small muted">${deed.progress} / ${deed.target}${deed.done ? " \u00b7 done" : ""}</div>
          </div>`;
        })
        .join("");
      return `<div class="deed-group"><div class="deed-zone">${esc(zone)}</div>${rows}</div>`;
    })
    .join("");
  return `<div class="journal-section" id="journal-deeds">
    <div class="qtitle">Deeds</div>
    <div class="small muted">Small, concrete goals. Each one pays Journey points and gold, and nothing here is time-limited.</div>
    ${groups}
  </div>`;
}

/** Relics bought with shards, the risk dial, and what the hero carries into the next run. */
function descentShopSection(session: GameSession): string {
  const descent = session.descentStatus;
  const owned = new Set(descent.relics.map((relic) => relic.id));
  // Relics and the risk are between-run decisions, so both close while a run is live.
  const locked = descent.active;
  const relics = DESCENT_RELICS.map((relic) => {
    const bought = owned.has(relic.id);
    const affordable = descent.shards >= relic.cost;
    return `<div class="relic-row ${bought ? "owned" : ""}">
      <div class="relic-icon">${esc(relic.icon)}</div>
      <div class="relic-body">
        <strong>${esc(relic.name)}</strong>
        <span class="small muted">${esc(relic.description)}</span>
      </div>
      <button class="btn ghost small" data-action="buy-relic" data-relic="${esc(relic.id)}" ${bought || !affordable || locked ? "disabled" : ""}>${bought ? "Owned" : `${relic.cost} shards`}</button>
    </div>`;
  }).join("");
  const pactRows = DESCENT_PACTS.map((pact) => `<button class="pact-choice ${pact.level === descent.pact.level ? "active" : ""}" data-action="set-pact" data-level="${pact.level}" ${locked ? "disabled" : ""}>
      <strong>${esc(pact.name)}</strong>
      <span class="small muted">${esc(pact.description)}</span>
    </button>`).join("");
  const specials = (Object.entries(descent.specials) as [string, number][])
    .filter(([, value]) => value > 0)
    .map(([key, value]) => `${SPECIAL_LABELS[key] ?? key} ${Math.round(value)}%`)
    .join(" - ");
  return `<div class="descent-shop">
    <div class="qtitle small-title">Relics - kept forever</div>
    <div class="small muted">Shards buy relics between runs. They never reset, so a bad run still leaves you stronger.</div>
    <div class="relic-list">${relics}</div>
    <div class="qtitle small-title">Risk dial</div>
    <div class="small muted">Take on more danger for the next run and every wave pays more shards.</div>
    <div class="pact-grid">${pactRows}</div>
    ${specials ? `<div class="small muted">Fight effects now: ${esc(specials)}</div>` : ""}
    ${locked ? `<div class="small muted">Relics and the risk open up between runs.</div>` : ""}
  </div>`;
}

/** The Hollow Ring standing, plus the button that walks the hero in. */
export function arenaSection(session: GameSession): string {
  const arena = session.arenaStatus;
  return `<div class="journal-section" id="journal-arena">
    <div class="qtitle">The Hollow Ring</div>
    <div class="small muted">An endless wave ring behind the village gate. It costs nothing to enter and pays better the deeper you get.</div>
    <div class="arena-stats">
      <div><span class="small muted">Deepest run</span><strong>Wave ${arena.best}</strong></div>
      <div><span class="small muted">Current</span><strong>${arena.active ? `Wave ${arena.wave} \u00b7 ${arena.alive} left` : "not in the ring"}</strong></div>
    </div>
    ${arena.active
      ? `<button class="btn ghost" data-action="leave-arena">Leave the ring</button>`
      : `<button class="btn" data-action="enter-arena">Enter the ring</button>`}
    ${medalsSection(session)}
    ${gauntletCard(session)}
  </div>`;
}

/**
 * Timed medals: the fastest run at each depth, with the clock of the run in progress.
 * A run used to be measured only by how deep it got, so there was never a reason to
 * go back and clear the same wave quicker. This is the board that gives a run a target.
 */
export function medalsSection(session: GameSession): string {
  const medals = session.medalStatus;
  const live = medals.live
    .map((run) => {
      const target = run.tier ? `${run.tier} pace` : `gold at ${run.gold}s`;
      return `<div class="run-row"><span>${esc(run.label)}</span><strong>${run.clock}</strong><span class="small muted">depth ${run.depth} \u00b7 ${esc(target)}</span></div>`;
    })
    .join("");
  const rows = medals.rows
    .slice(0, 8)
    .map((row) => `<div class="run-row"><span>${esc(row.modeLabel)} ${row.depth}</span><strong class="${row.tier ? `medal-${row.tier}` : ""}">${row.tier ? esc(row.tier) : "-"}</strong><span class="small muted">${row.clock}${row.nearGold ? " \u00b7 that is close" : ""}</span></div>`)
    .join("");
  const counts = `Gold ${medals.counts.gold} \u00b7 silver ${medals.counts.silver} \u00b7 bronze ${medals.counts.bronze}`;
  return `<div class="medal-card">
    <div class="qtitle small-title">Timed Medals</div>
    <div class="small muted">Clear a depth quickly and the run earns a medal. A faster repeat replaces a slower one; a slower one never wipes a good run.</div>
    <div class="small muted">${counts}</div>
    ${live ? `<div class="run-list">${live}</div>` : ""}
    ${rows ? `<div class="run-list">${rows}</div>` : `<div class="small muted">No times on the board yet. The clock only runs while you are in the Ring, the Descent or the Gauntlet.</div>`}
  </div>`;
}

/** Three gems of a kind into one better stone: the ladder a bag full of gems was missing. */
function gemFuseSection(session: GameSession): string {
  const rows = session.gemFuseRows;
  if (rows.length === 0) return "";
  const list = rows
    .map((row) => {
      const ready = row.qty >= 3 && row.target;
      const label = row.target ? `Fuse 3 into ${esc(row.targetName)}` : "Already flawless";
      return `<div class="run-row"><span>${esc(row.name)}</span><strong>${row.qty}</strong><button class="btn ghost small" data-action="fuse-gem" data-gem="${esc(row.gemId)}" ${ready ? "" : "disabled"}>${label}</button></div>`;
    })
    .join("");
  return `<div class="medal-card">
    <div class="qtitle small-title">Gem Ladder</div>
    <div class="small muted">Three rough gems make a cut one, three cut make a flawless one. A better stone keeps its socket and its whole bonus.</div>
    <div class="run-list">${list}</div>
  </div>`;
}

/** The gauntlet: every story boss back to back, and the trophy for finishing it. */
function gauntletCard(session: GameSession): string {
  const gauntlet = session.gauntletStatus;
  const cleared = gauntlet.cleared.length;
  const state = gauntlet.active
    ? `Round ${gauntlet.round + 1} of ${gauntlet.total}: ${esc(gauntlet.next)}`
    : "not started";
  return `<div class="gauntlet-card">
    <div class="qtitle small-title">The Gauntlet</div>
    <div class="small muted">Every story boss, back to back, with no waves between. Each one pays better than it did in its own zone.</div>
    <div class="arena-stats">
      <div><span class="small muted">Beaten at least once</span><strong>${cleared} / ${gauntlet.total}</strong></div>
      <div><span class="small muted">Standing</span><strong>${state}</strong></div>
    </div>
    ${gauntlet.active
      ? `<button class="btn ghost" data-action="leave-gauntlet">Abandon the gauntlet</button>`
      : `<button class="btn" data-action="enter-gauntlet" ${session.descentStatus.active ? "disabled" : ""}>Face the gauntlet</button>`}
  </div>`;
}

/** The sky: how long until the next Blood Moon, and what it pays while it is up. */
export function bloodMoonSection(session: GameSession): string {
  const moon = session.bloodMoon;
  const phases = moon.active
    ? "Packs +60% · gold +50% · XP +35% · drops +45%"
    : moon.phase === "warning"
      ? "The haze is already on the ridge. Packs thicken the moment it rises."
      : "Quiet. Good weather for gathering and forging.";
  const color = moon.active ? "var(--bad)" : moon.phase === "warning" ? "#d9a44a" : "var(--muted)";
  return `<div class="journal-section" id="journal-bloodmoon">
    <div class="qtitle">The Blood Moon</div>
    <div class="arena-stats">
      <div><span class="small muted">Sky</span><strong style="color:${color}">${esc(moon.label)}</strong></div>
      <div><span class="small muted">${moon.active ? "Time left" : "Next one"}</span><strong>${esc(bloodMoonClock(moon.active ? moon.remaining : moon.nextIn))}</strong></div>
      <div><span class="small muted">Seen</span><strong>${session.save.bloodMoonSeen}</strong></div>
      <div><span class="small muted">Now</span><strong>${esc(phases)}</strong></div>
    </div>
    <div class="small muted">${esc(moon.blurb)} It rides the game clock, so it comes to every hero in turn.</div>
  </div>`;
}

/**
 * The card a run leaves behind: how deep, how fast, what it paid, and the medal it earned.
 * A finished run is worth remembering; a line in the log was not enough.
 */
export function runRecapSection(session: GameSession, mode: "ring" | "descent" | "gauntlet"): string {
  const card = session.lastRunCard;
  if (!card || card.mode !== mode) return "";
  const where = mode === "ring" ? "the Hollow Ring" : mode === "descent" ? "the Descent" : "the Gauntlet";
  const depthLabel = mode === "gauntlet" ? `boss ${card.depth}` : `depth ${card.depth}`;
  const tierLine = card.tier ? `<strong class="medal-${card.tier}">${esc(MEDAL_LABELS[card.tier])} medal</strong>` : `<span class="small muted">no medal this time</span>`;
  const boons = mode === "descent" && card.boons.length > 0
    ? `<div class="small muted">Boons taken: ${card.boons.map((id) => esc(DESCENT_BOONS.find((boon) => boon.id === id)?.name ?? id)).join(", ")}</div>`
    : "";
  return `<div class="medal-card" id="journal-recap">
    <div class="qtitle small-title">Last run: ${esc(where)}</div>
    <div class="arena-stats">
      <div><span class="small muted">Reached</span><strong>${esc(depthLabel)}</strong></div>
      <div><span class="small muted">Time</span><strong>${esc(medalClock(card.seconds))}</strong></div>
      <div><span class="small muted">Kills</span><strong>${card.kills}</strong></div>
      <div><span class="small muted">Paid</span><strong>${card.gold}g${card.shards > 0 ? ` · ${card.shards} shards` : ""}</strong></div>
    </div>
    <div style="margin-top:6px">${tierLine}</div>
    ${boons}
    <div class="small muted">Best ${mode === "gauntlet" ? "clear" : "depth"}: ${card.bestWave}</div>
  </div>`;
}

/**
 * Gideon's table.
 *
 * One price, three crates, and the odds written out in plain words, so a player
 * spends 260 gold knowing what that buys instead of hoping quietly. The dice
 * still decide; the table just stops pretending it is a shop.
 */
export function gamblePanelHtml(session: GameSession, npcId: string): string {
  const status = session.gambleStatus;
  const npc = NPCS[npcId];
  const colour = npc?.color ?? "#a06ad9";
  const canPay = status.gold >= status.price;
  const shortfall = Math.max(0, status.price - status.gold);
  const rollsLine = status.rolls === 0
    ? "The crate has never been opened for you."
    : `${status.rolls} roll${status.rolls === 1 ? "" : "s"} so far, ${formatNumber(status.spent)} gold spent at this table.`;
  const crates = status.kinds
    .map((kind) => `<article class="crate-card${canPay ? "" : " locked"}">
      <div class="crate-mark" aria-hidden="true">?</div>
      <div class="crate-body">
        <strong>${esc(kind.label)}</strong>
        <span class="crate-note">${esc(kind.blurb)}</span>
      </div>
      <div class="stock-buy">
        <span class="stock-price${canPay ? "" : " short"}">${goldAmount(status.price)}</span>
        <button class="btn small" data-action="gamble" data-kind="${esc(kind.id)}" ${canPay ? "" : "disabled"}>${canPay ? "Roll" : "Need gold"}</button>
      </div>
    </article>`)
    .join("");
  return `<div class="shop-wrap">
    <header class="shop-hero gamble-hero" style="--shop-color:${esc(colour)}">
      <div class="shop-hero-portrait">${charIconHtml(npc?.sprite ?? "merchant", 54)}</div>
      <div class="shop-hero-body">
        <strong>${esc(npc?.name ?? "Gideon the Gambler")}</strong>
        <span>${esc(npc?.role ?? "Gambler")} · The only crate in Eldoria with no lid</span>
        <span class="shop-hero-line">"${esc(status.blurb)}"</span>
      </div>
      <div class="shop-hero-stats">
        <div class="shop-stat gold"><span>Purse</span><strong>${formatNumber(status.gold)} g</strong></div>
        <div class="shop-stat"><span>A roll</span><strong>${formatNumber(status.price)} g</strong></div>
        <div class="shop-stat"><span>Streak luck</span><strong>${status.luck > 0 ? `+${status.luck}%` : "none"}</strong></div>
      </div>
    </header>
    <section class="shop-card">
      <header class="shop-card-head">
        <div>
          <h4>What the dice do <span class="shop-count">${esc(status.odds)}</span></h4>
          <span class="small muted">${status.luck > 0
            ? "Your kill streak bends the table a little toward the good end."
            : "A long kill streak bends the table toward the good end."}</span>
        </div>
        ${canPay ? "" : `<span class="shop-perk short">You need ${formatNumber(shortfall)} g more</span>`}
      </header>
      <div class="odds-note">${esc(status.odds)}</div>
    </section>
    <section class="shop-card">
      <header class="shop-card-head">
        <div>
          <h4>Three crates <span class="shop-count">${formatNumber(status.price)} g each</span></h4>
          <span class="small muted">${esc(rollsLine)}</span>
        </div>
      </header>
      <div class="crate-grid">${crates}</div>
    </section>
    <div class="gamble-foot">
      <span class="small muted">Gideon keeps the coin either way, and you keep whatever comes out of the crate.</span>
      <button class="btn ghost" data-action="close-panel">${t("btnLeave")}</button>
    </div>
  </div>`;
}

/** The daily chest and the weekly modifier, shown together because they share a rhythm. */
export function seasonSection(session: GameSession): string {
  const weekly = session.weeklyModifier;
  const daily = session.dailyStatus;
  const rewardParts = [`${daily.reward.gold} gold`];
  if (daily.reward.xp > 0) rewardParts.push(`${daily.reward.xp} XP`);
  if (daily.reward.itemId) rewardParts.push(getItem(daily.reward.itemId).name);
  return `<div class="journal-section" id="journal-season">
    <div class="qtitle">The Turning Week</div>
    <div class="weekly-card">
      <div class="weekly-head"><span class="weekly-icon">${esc(weekly.icon)}</span><strong>${esc(weekly.name)}</strong></div>
      <div class="small muted">${esc(weekly.description)}</div>
      <div class="weekly-stats small">
        <span>Enemies ${Math.round(weekly.hp * 100)}% HP</span>
        <span>${Math.round(weekly.attack * 100)}% damage</span>
        <span>${Math.round(weekly.xp * 100)}% XP</span>
        <span>${Math.round(weekly.gold * 100)}% gold</span>
      </div>
    </div>
    <div class="daily-card ${daily.available ? "ready" : ""}">
      <div class="daily-head"><strong>Daily reward</strong><span class="small muted">streak ${daily.streak} day${daily.streak === 1 ? "" : "s"}</span></div>
      <div class="small muted">${esc(rewardParts.join(" - "))}</div>
      <button class="btn${daily.available ? "" : " ghost"}" data-action="claim-daily" ${daily.available ? "" : "disabled"}>${daily.available ? `Claim day ${daily.nextStreak}` : "Collected today"}</button>
    </div>
  </div>`;
}

/** The Endless Descent: seeded waves, boons and a weekly leaderboard. */
export function descentSection(session: GameSession): string {
  const descent = session.descentStatus;
  const boons = descent.boons
    .map((boon) => `<div class="boon-chip"><strong>${esc(boon.name)}</strong><span class="small muted">${esc(boon.description)}</span></div>`)
    .join("");
  const pending = descent.pending
    .map((boon) => `<button class="boon-choice" data-action="choose-boon" data-boon="${esc(boon.id)}">
        <strong>${esc(boon.name)}</strong>
        <span class="small muted">${esc(boon.description)}</span>
      </button>`)
    .join("");
  const runs = descent.runs
    .slice(0, 5)
    .map((run, index) => `<div class="run-row"><span>#${index + 1}</span><strong>Wave ${run.score}</strong><span class="small muted">seed ${run.seed}</span></div>`)
    .join("");
  return `<div class="journal-section" id="journal-descent">
    <div class="qtitle">The Endless Descent</div>
    <div class="small muted">A seeded roguelite below the Ring. Every second wave offers a boon, every fifth a boss, and shards keep after the run ends.</div>
    <div class="arena-stats">
      <div><span class="small muted">Deepest</span><strong>Wave ${descent.best}</strong></div>
      <div><span class="small muted">This week</span><strong>Wave ${descent.weeklyBest}</strong></div>
      <div><span class="small muted">Shards</span><strong>${descent.shards}</strong></div>
      <div><span class="small muted">Current</span><strong>${descent.active ? `Wave ${descent.wave} - ${descent.alive} left` : "not descending"}</strong></div>
    </div>
    ${descent.active
      ? `${pending ? `<div class="boon-grid"><div class="small muted">Choose one boon to continue:</div>${pending}</div>` : `<div class="small muted">Next boon after wave ${descent.wave + (descent.wave % 2 === 0 ? 0 : 1)}.</div>`}
        <button class="btn ghost" data-action="leave-descent">Leave the Descent</button>`
      : `<button class="btn" data-action="enter-descent">Enter the Descent</button>`}
    ${boons ? `<div class="boon-list">${boons}</div>` : ""}
    <div class="small muted">Seed ${descent.seed}. ${esc("Share it to race the same floors.")}</div>
    <div class="descent-tools">
      <button class="btn ghost small" data-action="share-seed" data-seed="${descent.seed}">Copy seed</button>
      <button class="btn ghost small" data-action="cash-shards" ${descent.shards > 0 ? "" : "disabled"}>Trade ${descent.shards} shards for ${descent.shards * 20} gold</button>
    </div>
    ${runs ? `<div class="run-list"><div class="small muted">Local best runs</div>${runs}</div>` : ""}
    ${descentShopSection(session)}
  </div>`;
}

/** The one monster that remembers the hero, and what it is owed. */
export function rivalSection(session: GameSession): string {
  const rival = session.rival;
  if (!rival) {
    return `<div class="journal-section" id="journal-rival">
      <div class="qtitle">Nothing Has Your Name Yet</div>
      <div class="small muted">Fall in a fight and whatever did it will remember you. It comes back stronger.</div>
    </div>`;
  }
  const weak = session.weaknessFor(rival.species);
  const status = rival.wins > rival.losses ? `It has the better of you, ${rival.wins} to ${rival.losses}.` : rival.wins === rival.losses ? `Honours are even, ${rival.wins} each.` : `You have the better of it, ${rival.losses} to ${rival.wins}.`;
  return `<div class="journal-section" id="journal-rival">
    <div class="qtitle">${esc(rival.name)}</div>
    <div class="small muted">${esc(rival.line)}</div>
    <div class="rival-card">
      <div class="rival-vs"><span>It is level ${rival.level}</span><span>${esc(status)}</span></div>
      <div class="small">Weak to <strong>${esc(weak.type)}</strong> \u00b7 ${esc(weak.note)}</div>
    </div>
  </div>`;
}

/** Saved gear sets, worn again with one press. */
export function loadoutsSection(session: GameSession): string {
  const rows = session.save.loadouts
    .map((loadout, index) => {
      const pieces = Object.values(loadout.equipment).filter(Boolean).length;
      return `<div class="loadout-row">
        <div><div class="loadout-name">${esc(loadout.name)}</div><div class="small muted">${pieces} piece${pieces === 1 ? "" : "s"}</div></div>
        <div class="loadout-tools">
          <button class="btn ghost small" data-action="wear-loadout" data-index="${index}">Wear</button>
          <button class="btn ghost small" data-action="delete-loadout" data-index="${index}">Forget</button>
        </div>
      </div>`;
    })
    .join("");
  return `<div class="journal-section" id="journal-loadouts">
    <div class="qtitle">Saved Sets</div>
    <div class="small muted">Save what you are wearing, then swap back to it in one press.</div>
    ${rows || `<div class="small muted">Nothing saved yet.</div>`}
    <button class="btn${session.save.loadouts.length >= 3 ? " ghost" : ""}" data-action="save-loadout">Save current gear</button>
  </div>`;
}

export function questsPanelHtml(session: GameSession, bestiarySearch = ""): string {
  const active = session.save.quests.filter((state) => QUESTS[state.id]);
  const lore = revealedLore(session.save);
  const loreGroups = loreBySubject(session.save);
  const loreRows =
    lore.length === 0
      ? `<div class="small muted">Nothing recorded yet. Old stories surface as you travel and fight.</div>`
      : loreGroups
          .map(
            (group) => `<div class="lore-group">
        <div class="small muted">${esc(group.title)}</div>
        ${group.entries
          .map(
            (entry) => `<details class="lore-entry">
        <summary>${esc(entry.title)}</summary>
        <div class="small">${esc(entry.text)}</div>
      </details>`,
          )
          .join("")}
      </div>`,
          )
          .join("");
  const loreSection = `<div class="lore-section" id="journal-lore">
      <div class="qtitle">Records of the Fallen</div>
      <div class="small muted">${lore.length} of ${LORE_ENTRIES.length} entries uncovered.</div>
      ${loreRows}
    </div>`;
  const readyToTurnIn = active.filter((state) => {
    const quest = QUESTS[state.id];
    return Boolean(quest) && state.completed && (quest.repeatable || state.completions === 0);
  }).length;
  const bountyReady = session.bounties.filter((bounty) => {
    const claimed = session.save.bounties.find((entry) => entry.key === bounty.key)?.claimed ?? false;
    return !claimed && session.bountyProgress(bounty.key) >= bounty.need;
  }).length;
  const navGroups: { title: string; links: { href: string; label: string; badge?: number }[] }[] = [
    {
      title: "Work",
      links: [
        { href: "#journal-quests", label: t("journalQuestsNav"), badge: readyToTurnIn },
        { href: "#journal-bounties", label: "Bounties", badge: bountyReady },
        { href: "#journal-journey", label: "Journey" },
        { href: "#journal-deeds", label: "Deeds" },
      ],
    },
    {
      title: "Trials",
      links: [
        { href: "#journal-arena", label: "Ring" },
        { href: "#journal-descent", label: "Descent" },
        { href: "#journal-season", label: "Season" },
        { href: "#journal-rival", label: "Rival" },
      ],
    },
    {
      title: "Your hero",
      links: [
        { href: "#journal-hero", label: "Story", badge: session.claimableAchievements.length },
        { href: "#journal-mastery", label: "Mastery" },
        { href: "#journal-loadouts", label: "Sets" },
        { href: "#journal-bestiary", label: t("journalBestiaryNav") },
      ],
    },
    {
      title: "Records",
      links: [
        { href: "#journal-lore", label: t("journalLoreNav") },
        { href: "#journal-diary", label: "Diary" },
        { href: "#journal-travel", label: "Travel" },
      ],
    },
  ];
  const nav = `<nav class="journal-nav" aria-label="${esc(t("journalNavLabel"))}">
    ${navGroups
      .map(
        (group) => `<div class="journal-nav-group">
      <span class="journal-nav-title">${esc(group.title)}</span>
      <div class="journal-nav-links">${group.links
        .map((link) => `<a href="${link.href}">${esc(link.label)}${link.badge ? `<span class="journal-nav-badge">${link.badge}</span>` : ""}</a>`)
        .join("")}</div>
    </div>`,
      )
      .join("")}
  </nav>`;
  const save = session.save;
  const journey = session.journey;
  // Hand-in first, then whatever is pinned, then the open work, then the repeats.
  // A save keeps its own order; this only changes what the eye meets first.
  const questRank = (state: (typeof active)[number]): number => {
    const quest = QUESTS[state.id];
    const finished = Boolean(quest) && state.completed && (quest.repeatable || state.completions === 0);
    if (finished) return 0;
    if (session.save.pinnedQuest === state.id) return 1;
    return state.completions > 0 ? 3 : 2;
  };
  const rows = [...active]
    .sort((a, b) => questRank(a) - questRank(b))
    .map((state) => {
      const quest = QUESTS[state.id];
      const giver = NPCS[quest.giverNpc]?.name ?? quest.giverNpc;
      const objectives = quest.objectives.map((_, i) => objectiveRow(state.id, state.progress[i] ?? 0, i)).join("");
      const finished = state.completed && (quest.repeatable || state.completions === 0);
      const pinned = session.save.pinnedQuest === state.id;
      const objectivesDone = quest.objectives.filter((objective, i) => {
        const need = "count" in objective ? objective.count : objective.kind === "explore" ? objective.zones.length : 1;
        return (state.progress[i] ?? 0) >= (need ?? 1);
      }).length;
      const pct = Math.round((objectivesDone / Math.max(1, quest.objectives.length)) * 100);
      const stateChip = finished
        ? `<span class="quest-state ready">Ready to turn in</span>`
        : state.completions > 0
          ? `<span class="quest-state done">Done</span>`
          : `<span class="quest-state">In progress</span>`;
      return `<div class="quest-row ${finished ? "ready" : ""} ${state.completions > 0 ? "done" : ""} ${pinned ? "pinned" : ""}">
        <header class="quest-row-head">
          <div class="quest-row-title">
            ${pinned ? `<span class="quest-pin" aria-hidden="true">\u25C8</span>` : ""}
            <strong>${esc(quest.name)}</strong>
            <span class="quest-level">Lv ${quest.requiresLevel ?? 1}</span>
          </div>
          ${stateChip}
        </header>
        <p class="qdesc">${esc(quest.description)}</p>
        <div class="quest-objectives">${objectives}</div>
        <div class="quest-progress" role="progressbar" aria-valuenow="${objectivesDone}" aria-valuemin="0" aria-valuemax="${quest.objectives.length}"><span style="width:${pct}%"></span></div>
        <footer class="quest-row-foot">
          <span class="quest-reward">${formatNumber(quest.rewards.xp)} XP</span>
          <span class="quest-reward gold">${formatNumber(quest.rewards.gold)} gold</span>
          <span class="small muted">${esc(giver)} \u00b7 ${objectivesDone}/${quest.objectives.length} done${state.completions > 0 ? ` \u00b7 x${state.completions}` : ""}</span>
          <button class="btn ghost small" data-action="pin-quest" data-quest="${esc(state.id)}">${pinned ? "Unpin" : "Pin to tracker"}</button>
        </footer>
      </div>`;
    })
    .join("");
  const questsCard =
    active.length === 0
      ? `<section class="journal-card" id="journal-quests">
      <header class="journal-card-head">
        <h3>Active quests</h3>
        <span class="journal-card-count">nothing tracked</span>
      </header>
      <div class="journal-empty">
        <span class="journal-empty-icon" aria-hidden="true">\u275D</span>
        <strong>No quests yet</strong>
        <span class="small muted">Talk to Captain Rowan in the village, or Elara at the healers. Tracked quests also sit on the right of your HUD.</span>
      </div>
    </section>`
      : `<section class="journal-card" id="journal-quests">
      <header class="journal-card-head">
        <h3>Active quests</h3>
        <span class="journal-card-count">${active.length} tracked${readyToTurnIn > 0 ? ` \u00b7 ${readyToTurnIn} ready` : ""}</span>
      </header>
      <div class="quest-list">${rows}</div>
    </section>`;
  // One strip answers the question the page is opened for: what is waiting on me?
  const heroStrip = `<header class="inv-hero quest-hero">
      <div class="inv-hero-portrait">${classPortrait(save.classId, 56)}</div>
      <div class="inv-hero-body">
        <strong>${esc(save.name)}</strong>
        <span class="small muted">${esc(getClass(save.classId).name)} \u00b7 Level ${save.level} \u00b7 ${esc(session.zone.name)} \u00b7 ${esc(save.title)}</span>
        <div class="inv-hero-chips">
          <span class="settings-chip">${active.length} quest${active.length === 1 ? "" : "s"} tracked</span>
          <span class="settings-chip${readyToTurnIn > 0 ? " gold" : ""}">${readyToTurnIn} ready to turn in</span>
          <span class="settings-chip${bountyReady > 0 ? " gold" : ""}">${bountyReady} bount${bountyReady === 1 ? "y" : "ies"} ready</span>
          <span class="settings-chip">${journey.points} deed points</span>
        </div>
      </div>
    </header>`;
  const group = (title: string, note: string, sections: string[]): string =>
    `<div class="quest-group">
      <div class="quest-group-head">
        <span class="quest-group-title">${esc(title)}</span>
        <span class="quest-group-note">${esc(note)}</span>
      </div>
      ${sections.filter(Boolean).join("")}
    </div>`;
  return `${nav}
  <div class="quest-sheet">
    ${heroStrip}
    ${group("Work", "What to do next", [questsCard, bountySection(session), journeySection(session), deedsSection(session)])}
    ${group("Trials", "The ring, the descent and the week", [bloodMoonSection(session), runRecapSection(session, "descent"), arenaSection(session), descentSection(session), seasonSection(session), rivalSection(session)])}
    ${group("Your hero", "Numbers, sets and the diary", [heroSection(session), masterySection(session), reactionSection(session), loadoutsSection(session), diarySection(session)])}
    ${group("Records", "Places, beasts and old stories", [travelSection(session), bestiarySection(session, bestiarySearch), loreSection])}
    <div class="small muted quest-tip">Tip: quests with collect objectives count items in your backpack. Selling them before turning in can undo progress.</div>
  </div>`;
}

/**
 * The bounty board: three rotating jobs with a purse attached. It is deliberately above
 * the achievements, because it is the page a player opens when they want work now.
 */
function bountySection(session: GameSession): string {
  const bounties = session.bounties;
  if (bounties.length === 0) {
    return `<div class="lore-section" id="journal-bounties">
      <div class="qtitle">Bounties</div>
      <div class="small muted">No bounties posted yet. Fight a little and they will arrive.</div>
    </div>`;
  }
  const streak = session.save.bountyStreak;
  const rows = bounties
    .map((bounty) => {
      const done = session.bountyProgress(bounty.key);
      const complete = done >= bounty.need;
      const claimed = session.save.bounties.find((entry) => entry.key === bounty.key)?.claimed ?? false;
      const pct = Math.min(100, Math.round((done / bounty.need) * 100));
      return `<div class="bounty-row ${complete && !claimed ? "ready" : ""} ${claimed ? "paid" : ""}">
        <div class="bounty-head">
          <span class="bounty-name">${esc(bounty.monsterName)}</span>
          <span class="bounty-purse">${formatNumber(bounty.gold)} g · ${formatNumber(bounty.xp)} XP</span>
        </div>
        <div class="small muted">${esc(bounty.zoneName)} · Level ${bounty.level}</div>
        <div class="bounty-bar"><div class="bounty-bar-fill" style="width:${pct}%"></div></div>
        <div class="bounty-foot">
          <span class="small muted">${done} / ${bounty.need} killed</span>
          ${claimed
            ? `<span class="bounty-paid">Paid ✓</span>`
            : complete
              ? `<button class="btn small" data-action="claim-bounty" data-bounty="${esc(bounty.key)}">Collect</button>`
              : `<span class="small muted">Keep hunting</span>`}
        </div>
      </div>`;
    })
    .join("");
  const streakNote = streak > 0
    ? `Bounty streak: ${streak} in a row without falling (+${Math.min(50, streak * 10)}% purse).`
    : "Turning bounties in without dying grows the purse. Falling resets it.";
  return `<div class="lore-section" id="journal-bounties">
    <div class="qtitle">Bounties</div>
    <div class="small muted">${esc(streakNote)} A fresh board is posted every ten minutes of play.</div>
    <div class="bounty-list">${rows}</div>
  </div>`;
}

/**
 * Everything the hero has done, counted, plus the achievements still to earn and the
 * titles they unlock. This is the page a player opens to see how far they have come.
 */
function heroSection(session: GameSession): string {
  const save = session.save;
  const stats = journalStats(save)
    .map((stat) => `<div class="stat-cell">
        <span class="stat-label">${esc(stat.label)}</span>
        <span class="stat-value">${esc(stat.value)}</span>
        ${stat.note ? `<span class="stat-note">${esc(stat.note)}</span>` : ""}
      </div>`)
    .join("");
  const progress = achievementProgress(save);
  const claimable = session.claimableAchievements;
  const rows = achievementRows(save)
    .map((achievement) => `<div class="achv-row ${achievement.earned ? "earned" : ""}">
        <span class="achv-icon" aria-hidden="true">${achievement.earned ? achievement.icon : "○"}</span>
        <span class="achv-body">
          <span class="achv-name">${esc(achievement.name)}</span>
          <span class="small muted">${esc(achievement.earned && achievement.title ? `Title unlocked: ${achievement.title}` : achievement.hint)}</span>
        ${achievement.earned ? (claimable.includes(achievement.id) ? `<button class="btn small" data-action="claim-achievement" data-id="${achievement.id}">Collect ${achievementReward(achievement.id).gold}g + gem</button>` : `<span class="small muted">Collected</span>`) : ""}
        </span>
      </div>`)
    .join("");
  const titles = session.titles
    .map((title) => {
      const worn = save.title === title;
      return `<button class="title-chip ${worn ? "worn" : ""}" data-action="set-title" data-title="${esc(title)}" ${worn ? "aria-pressed=\"true\"" : ""}>${esc(title)}${worn ? " ✓" : ""}</button>`;
    })
    .join("");
  return `<div class="lore-section" id="journal-hero">
    <div class="qtitle">${esc(save.name)}, ${esc(save.title)}</div>
    <div class="small muted">${esc(heroVerdict(save))}</div>
    ${characterSheet(session)}
    <div class="stat-grid">${stats}</div>
    <div class="small muted" style="margin-top:12px">Titles you can wear</div>
    <div class="title-row">${titles}</div>
    <div class="small muted" style="margin-top:12px">Achievements · ${progress.earned} of ${progress.total}${claimable.length ? ` · ${claimable.length} reward${claimable.length === 1 ? "" : "s"} waiting` : ""}</div>
    ${claimable.length ? `<button class="btn small" data-action="claim-all-achievements">Collect all ${claimable.length} reward${claimable.length === 1 ? "" : "s"}</button>` : ""}
    <div class="achv-list">${rows}</div>
  </div>`;
}

/** Fast travel: only places the hero has already stood in, so nothing is skipped. */
function travelSection(session: GameSession): string {
  const rows = waypointRows(session.save)
    .map((point) => `<button class="travel-row ${point.here ? "here" : ""}" data-action="fast-travel" data-zone="${point.id}" ${point.here ? "disabled" : ""}>
        <span class="travel-name">${esc(point.name)}</span>
        <span class="small muted">${point.here ? "You are here" : point.safe ? "Safe ground" : "Hostile"}</span>
      </button>`)
    .join("");
  const locked = Object.values(ZONES).filter((zone) => !session.save.waypoints.includes(zone.id)).length;
  return `<div class="lore-section" id="journal-travel">
    <div class="qtitle">Travel</div>
    <div class="small muted">Places you have already been. Travel is free and instant, and the road back is always open.</div>
    <div class="travel-list">${rows}</div>
    ${locked > 0 ? `<div class="small muted">${locked} more place${locked === 1 ? "" : "s"} to find.</div>` : ""}
  </div>`;
}

export function bestiarySectionHtml(session: GameSession, search = ""): string {
  return bestiarySection(session, search);
}

function bestiarySection(session: GameSession, search = ""): string {
  const query = search.trim().toLocaleLowerCase();
  const all = monsterGuide();
  const rows = all
    .filter((entry) => !query || `${entry.monster.name} ${entry.zoneName} ${entry.drops.join(" ")}`.toLocaleLowerCase().includes(query))
    .map((entry) => {
      const role = entry.kind === "ranged" ? "Attacks from range" : entry.kind === "support" ? "Supports other monsters" : "Melee fighter";
      const met = session.hasMet(entry.monster.id);
      const kills = session.killCount(entry.monster.id);
      const weakness = session.weaknessFor(entry.monster.id);
      const weakLine = weakness.bonus > 0
        ? `<div class="small" style="color:var(--gold)">Weak to ${esc(weakness.type)} (+${Math.round(weakness.bonus * 100)}% damage) &middot; ${esc(weakness.note)}</div>`
        : "";
      if (!met) {
        return `<details class="beast-row unknown">
        <summary>
          <span class="beast-name">Something in ${esc(entry.zoneName)}</span>
          <span class="beast-level">Lv ${entry.monster.level}</span>
        </summary>
        <div class="beast-body"><div class="small muted">Not yet met. Walk ${esc(entry.zoneName)} and it will fill itself in.</div></div>
      </details>`;
      }
      return `<details class="beast-row">
        <summary>
          <span class="beast-name">${esc(entry.monster.name)}${entry.monster.boss ? " · Boss" : ""}</span>
          <span class="beast-level">Lv ${entry.monster.level}${kills > 0 ? ` · ${kills} slain` : ""}</span>
        </summary>
        <div class="beast-body">
          <div class="small muted">${esc(entry.zoneName)} · ${esc(role)}</div>
          <div class="small">${Math.round(entry.monster.maxHp)} health · ${Math.round(entry.monster.attack)} attack · ${Math.round(entry.monster.speed)} speed</div>
          ${weakLine}
          ${entry.drops.length ? `<div class="small muted">Drops: ${esc(entry.drops.join(", "))}</div>` : ""}
          ${entry.quests.length ? `<div class="small" style="color:var(--gold)">Wanted by: ${esc(entry.quests.join(", "))}</div>` : ""}
        </div>
      </details>`;
    })
    .join("");
  const met = all.filter((entry) => session.hasMet(entry.monster.id)).length;
  return `<div class="lore-section" id="journal-bestiary">
    <div class="qtitle">Bestiary</div>
    <div class="small muted">${met} of ${all.length} species met. A page fills itself in the first time a creature notices you.</div>
    <label class="class-search" style="margin:8px 0"><span>Search</span><input type="search" data-bestiary-search value="${esc(search)}" placeholder="Name, zone or drop" aria-label="Search the bestiary" /></label>
    <div class="beast-list">${rows || `<div class="small muted">Nothing matches that search.</div>`}</div>
  </div>`;
}

/**
 * The character sheet: every derived number the hero actually fights with, side by side.
 * Talents and gear have been quietly changing these all game, so this is where a player can
 * finally see them and judge whether the next level should go into damage or into health.
 */
function characterSheet(session: GameSession): string {
  const save = session.save;
  const stats = session.stats;
  const def = session.classInfo;
  const equipped = (["weapon", "armor", "helm", "boots", "trinket"] as const)
    .map((slot) => save.equipment[slot])
    .filter((stack): stack is ItemStack => Boolean(stack))
    .map((stack) => `<span class="gear-chip rarity-${getItem(stack.itemId).rarity}">${esc(itemDisplayName(stack))}</span>`)
    .join("");
  const cells: [string, string, string?][] = [
    ["Health", `${Math.round(save.hp)} / ${Math.round(stats.maxHp)}`],
    [session.resourceLabel, `${Math.round(save.resource)} / ${Math.round(stats.maxResource)}`],
    ["Attack", `${Math.round(stats.attack)}`],
    ["Defence", `${Math.round(stats.defense)}`],
    ["Crit chance", `${Math.round(stats.crit * 100)}%`],
    ["Move speed", `${Math.round(stats.moveSpeed)}`],
    ["Gold", `${formatNumber(save.gold)}`],
    ["Difficulty", save.difficulty === "story" ? "Story" : save.difficulty === "nightmare" ? "Nightmare" : "Normal", save.ngPlus > 0 ? `Cycle ${save.ngPlus + 1}` : undefined],
    ["Talents", `${save.talents.length} of 5`],
    ["Class", def.name, def.role],
  ];
  const grid = cells
    .map(([label, value, note]) => `<div class="sheet-cell">
        <span class="sheet-label">${esc(label)}</span>
        <span class="sheet-value">${esc(value)}</span>
        ${note ? `<span class="sheet-note">${esc(note)}</span>` : ""}
      </div>`)
    .join("");
  return `<div class="character-sheet">
    <div class="sheet-grid">${grid}</div>
    <div class="small muted" style="margin-top:10px">Wearing</div>
    <div class="gear-row">${equipped || `<span class="small muted">Nothing equipped but what you started with.</span>`}</div>
  </div>`;
}

/**
 * Ability mastery: how often each skill of the class has been used, and what that has earned.
 * It is the page that shows a hero's habits rather than their gear.
 */
function masterySection(session: GameSession): string {
  const rows = session.mastery
    .map((row) => `<div class="mastery-row rank-${row.rank}">
        <span class="mastery-icon" aria-hidden="true">${row.icon.length <= 2 ? esc(row.icon) : "✦"}</span>
        <span class="mastery-body">
          <span class="mastery-name">${esc(row.name)} <span class="mastery-rank">Rank ${row.rank}${row.rank >= MAX_MASTERY ? " · max" : ""}</span></span>
          <span class="mastery-bar"><span style="width:${row.percent}%"></span></span>
          <span class="small muted">${row.uses} casts${row.toNext > 0 ? ` · ${row.toNext} to rank ${row.rank + 1}` : ""}${row.rank > 0 ? ` · −${row.costCut}% cost, −${row.cooldownCut}% cooldown` : ""}</span>
        </span>
      </div>`)
    .join("");
  const mastered = masteredCount(session.mastery);
  return `<div class="lore-section" id="journal-mastery">
    <div class="qtitle">Ability Mastery</div>
    <div class="small muted">Every cast counts. Practice makes a skill cheaper and quicker to come back. ${mastered > 0 ? `${mastered} skill${mastered === 1 ? "" : "s"} at rank 3 or better.` : "No skill has reached rank 3 yet."}</div>
    <div class="mastery-list">${rows}</div>
  </div>`;
}

/** The elemental reactions this hero has found, and the ones still waiting to be discovered. */
function reactionSection(session: GameSession): string {
  const book = session.reactionBook;
  const found = book.filter((entry) => entry.found).length;
  const rows = book
    .map((entry) => `<div class="reaction-row ${entry.found ? "found" : ""}">
        <span class="reaction-icon" aria-hidden="true">${entry.found ? entry.icon : "?"}</span>
        <span>
          <span class="reaction-name">${entry.found ? esc(entry.name) : "Undiscovered"}</span>
          <span class="small muted">${entry.found ? esc(entry.text) : "Hit a creature carrying one element with a different one."}</span>
        </span>
      </div>`)
    .join("");
  return `<div class="lore-section" id="journal-reactions">
    <div class="qtitle">Elemental Reactions</div>
    <div class="small muted">${found} of ${book.length} found. Fire on a frozen creature, ice on a burning one, and so on.</div>
    <div class="reaction-list">${rows}</div>
  </div>`;
}

/** The hero's diary: the last few things worth remembering, newest first. */
function diarySection(session: GameSession): string {
  const rows = diaryRows(session.save);
  if (rows.length === 0) {
    return `<div class="lore-section" id="journal-diary">
      <div class="qtitle">Diary</div>
      <div class="small muted">Nothing written yet. The first kill, the first quest and the first fall all go here.</div>
    </div>`;
  }
  return `<div class="lore-section" id="journal-diary">
    <div class="qtitle">Diary</div>
    <div class="small muted">The last ${rows.length} things worth remembering.</div>
    <div class="diary-list">
      ${rows.map((row) => `<div class="diary-row kind-${row.kind}">
        <span class="diary-icon" aria-hidden="true">${row.icon}</span>
        <span class="diary-text">${esc(row.text)}</span>
        <span class="diary-when">${esc(row.when)}</span>
      </div>`).join("")}
    </div>
  </div>`;
}

/** Pick an NPC line that fits the player's level, accepted quests and beaten bosses. */
function npcDialogueFor(session: GameSession, npcId: string): string {
  const npc = NPCS[npcId];
  if (!npc || npc.dialogue.length === 0) return "";
  const save = session.save;
  let dialogue: string;
  if (save.ngPlus > 0 && NG_PLUS_DIALOGUE[npcId]) {
    dialogue = NG_PLUS_DIALOGUE[npcId];
  } else {
    const hasBoss = save.defeatedBosses.length > 0;
    const hasQuest = save.quests.some((q) => !q.completed);
    const lines = npc.dialogue;
    if (hasBoss && lines.length > 2) dialogue = lines[2];
    else if ((hasQuest || save.level >= 5) && lines.length > 1) dialogue = lines[1];
    else dialogue = lines[0]!;
  }
  const relationship = save.relationships[npcId] ?? 0;
  if (relationship >= 3) return `${dialogue} I have come to trust you.`;
  if (relationship <= -3) return `${dialogue} I will not forget your words.`;
  // A giver with side work to offer always mentions it, so a new quest is never missed.
  const whisper = SIDE_QUEST_WHISPERS[npcId];
  if (whisper) {
    const offered = (npc.quests ?? []).some((id) => {
      const state = save.quests.find((entry) => entry.id === id);
      return !state && (QUESTS[id]?.requiresLevel ?? 1) <= save.level;
    });
    if (offered) return `${dialogue} ${whisper}`;
  }
  return dialogue;
}

export function npcPanelHtml(session: GameSession, npcId: string): string {
  const npc = NPCS[npcId];
  if (!npc) return `<div class="empty-state">This person is not here.</div>`;
  const dialogue = npcDialogueFor(session, npcId);
  const questStates = session.getNpcQuestStates(npcId);
  const questRows = questStates
    .map((entry) => {
      const quest = QUESTS[entry.questId];
      if (!quest) return "";
      const state = entry.state;
      const objectives = quest.objectives
        .map((_, i) => objectiveRow(entry.questId, state?.progress[i] ?? 0, i))
        .join("");
      let action = "";
      if (entry.available) action = `<button class="btn small" data-action="accept-quest" data-quest="${entry.questId}">${t("btnAcceptQuest")}</button>`;
      else if (state && state.claimedReward !== undefined && quest.choose) {
        const claimed = quest.choose[state.claimedReward];
        const label = claimed ? `${claimed.icon ?? ""} Reward claimed` : "Reward claimed";
        action = `<span class="small muted">${esc(label)} - final</span>`;
      }
      else if (entry.canTurnIn && quest.choose) {
        action = `<div class="gift-list">${quest.choose
          .map((option, i) => {
            const items = (option.items ?? []).map((it) => `${it.qty}x ${it.itemId.replace(/_/g, " ")}`);
            const parts = [`${option.xp} XP`, `${option.gold} gold`, ...items];
            const icon = option.icon ?? "";
            return `<button class="btn small" data-action="pick-reward" data-quest="${entry.questId}" data-index="${i}">${icon} ${esc(parts.join(" · "))}</button>`;
          })
          .join("")}</div>`;
      }
      else if (entry.canTurnIn) action = `<button class="btn small" data-action="turnin-quest" data-quest="${entry.questId}">${t("btnTurnIn")}</button>`;
      else if (state && state.completed && state.completions > 0 && !quest.repeatable) action = `<span class="small muted">Completed</span>`;
      else if (state) action = `<span class="small muted">In progress</span>`;
      else if (session.save.level < entry.level) action = `<span class="small muted">Requires level ${entry.level}</span>`;
      else if (entry.requires.length > 0) action = `<span class="small muted">Requires ${entry.requires.map((id) => QUESTS[id]?.name ?? id).join(", ")}</span>`;
      return `<div class="quest-row ${entry.canTurnIn ? "ready" : ""}">
        <header class="quest-row-head">
          <div class="quest-row-title"><strong>${esc(quest.name)}</strong><span class="quest-level">Lv ${entry.level}</span></div>
          ${entry.canTurnIn ? `<span class="quest-state ready">Ready</span>` : state ? `<span class="quest-state">In progress</span>` : `<span class="quest-state dim">Locked</span>`}
        </header>
        <p class="qdesc">${esc(quest.description)}</p>
        <div class="quest-objectives">${objectives}</div>
        <footer class="quest-row-foot">
          <span class="quest-reward">${formatNumber(quest.rewards.xp)} XP</span>
          <span class="quest-reward gold">${formatNumber(quest.rewards.gold)} gold</span>
          ${action}
        </footer>
      </div>`;
    })
    .join("");
  const choices = `<div class="npc-tones">
    <button class="tone-btn kind" data-action="npc-choice" data-npc="${npc.id}" data-choice="kind"><span aria-hidden="true">\u2665</span> Kind words</button>
    <button class="tone-btn rude" data-action="npc-choice" data-npc="${npc.id}" data-choice="rude"><span aria-hidden="true">\u2660</span> Rude remark</button>
  </div>`;
  const trainer = npc.trainer
    ? `<section class="npc-card">
        <header class="npc-card-head"><h4>Training</h4><span class="small muted">${esc(npc.name)}</span></header>
        <div class="ability-unlock-list">
          ${session.classInfo.abilities
            .map((ability) => {
              const unlocked = session.save.level >= ability.unlockLevel;
              return `<div class="ability-unlock ${unlocked ? "on" : ""}">
                <span class="ability-unlock-icon" aria-hidden="true">${abilityIconHtml(ability.icon ?? "strike", 22)}</span>
                <strong>${esc(ability.name)}</strong>
                <span class="ability-unlock-tag ${unlocked ? "on" : ""}">${unlocked ? "Unlocked" : `Lv ${ability.unlockLevel}`}</span>
              </div>`;
            })
            .join("")}
        </div>
        <div class="npc-card-note small muted">Talents are chosen with T. ${esc(npc.name)} can reset them for ${session.respecCost() || 0} gold.</div>
        <div class="row-wrap">
          <button class="btn ghost small" data-action="respec-talents" ${session.save.talents.length > 0 ? "" : "disabled"}>Reset talents${session.respecCost() > 0 ? ` · ${session.respecCost()}g` : ""}</button>
          ${session.canNewGamePlus() ? `<button class="btn small" data-action="new-game-plus">Begin New Game+ ${session.save.ngPlus + 1}</button>` : ""}
        </div>
        ${session.canNewGamePlus() ? `<div class="npc-card-note small muted">The Hollow King has fallen. A harsher cycle awaits.</div>` : ""}
      </section>`
    : "";
  const hostButtons = [
    npc.shop ? `<button class="btn" data-action="open-shop" data-shop="${npc.shop}">Browse ${esc(SHOPS[npc.shop]?.name ?? "shop")}</button>` : "",
    npc.gamble ? `<button class="btn" data-action="open-gamble" data-npc="${esc(npc.id)}">Sit at the table</button>` : "",
    npc.stash ? `<button class="btn" data-action="open-stash">Open vault</button>` : "",
  ].filter(Boolean).join("");
  const heartRow = session.friendRows.find((entry) => entry.npcId === npcId);
  return `<div class="npc-stack" style="--npc-color:${esc(npc.color)}">
    <header class="npc-hero">
      <div class="npc-portrait">${charIconHtml(npc.sprite, 64)}</div>
      <div class="npc-identity">
        <strong>${esc(npc.name)}</strong>
        <span class="npc-role">${esc(npc.role)}</span>
        ${heartRow ? `<span class="npc-hearts" title="${heartRow.hearts} of 5 hearts">${heartRow.heartText}</span>` : ""}
      </div>
    </header>
    <blockquote class="dialogue">${esc(dialogue)}</blockquote>
    ${choices}
    ${friendSection(session, npcId)}
    ${questRows ? `<section class="npc-card"><header class="npc-card-head"><h4>Quests</h4><span class="small muted">${questStates.length} offered</span></header><div class="quest-list">${questRows}</div></section>` : ""}
    ${trainer}
    <footer class="npc-footer">
      ${hostButtons ? `<div class="row-wrap">${hostButtons}</div>` : ""}
      <div class="row-wrap">
        ${npc.healer ? `<button class="btn" data-action="heal" ${session.healCost() > 0 ? "" : "disabled"}>${t("btnHeal", { cost: session.healCost() })}</button>${session.healDiscountPercent > 0 ? `<span class="npc-discount small">${session.healDiscountPercent}% off for a friend of the shrine</span>` : ""}` : ""}
        <button class="btn ghost" data-action="close-panel">${t("btnLeave")}</button>
      </div>
    </footer>
    ${npc.healer ? blessingSection(session) : ""}
  </div>`;
}

/**
 * Village friends: hearts, the gift they want and the keepsake behind three hearts.
 * The standing was always on the save, but a player could never see it or spend it.
 */
function friendSection(session: GameSession, npcId: string): string {
  const row = session.friendRows.find((entry) => entry.npcId === npcId);
  if (!row) return "";
  const giftName = getItem(row.gift.itemId).name;
  const ready = row.have >= row.gift.qty;
  const keepsake = row.keepsakeClaimed
    ? `<span class="small muted">Keepsake given.</span>`
    : row.canClaim
      ? `<button class="btn small" data-action="claim-keepsake" data-npc="${esc(row.npcId)}">Take the keepsake</button>`
      : `<span class="small muted">${row.heartsToKeepsake} more heart${row.heartsToKeepsake === 1 ? "" : "s"} to a keepsake.</span>`;
  return `<div class="friend-card">
    <div class="friend-head"><strong>${row.heartText}</strong><span class="small muted">standing ${row.relationship}</span></div>
    <div class="small muted">${esc(row.name)} likes ${esc(giftName)}: ${row.gift.qty} of them, and you carry ${row.have}.</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
      <button class="btn small" data-action="friend-gift" data-npc="${esc(row.npcId)}" ${ready ? "" : "disabled"}>Give ${row.gift.qty}x ${esc(giftName)}</button>
      ${keepsake}
    </div>
  </div>`;
}

/**
 * Shrine blessings: the small, cheap buff a hero can buy once an in-game day. They sit
 * under the healer's buttons because that is where a struggling player already goes.
 */
function blessingSection(session: GameSession): string {
  const status = session.blessingStatus();
  const rows = BLESSINGS.map((blessing) => {
    const cost = session.blessingCost(blessing.cost);
    const affordable = session.save.gold >= cost;
    const can = status.available && affordable;
    return `<button class="blessing-row" data-action="buy-blessing" data-blessing="${esc(blessing.id)}" ${can ? "" : "disabled"}>
        <span class="blessing-icon" aria-hidden="true">${blessing.icon}</span>
        <span class="blessing-body">
          <span class="blessing-name">${esc(blessing.name)}</span>
          <span class="small muted">${esc(blessing.description)}</span>
        </span>
        <span class="blessing-cost">${status.available ? `${cost} g` : "Today's done"}</span>
      </button>`;
  }).join("");
  const note = status.available
    ? "One blessing each per day. The buff lasts ten minutes of play, and it survives travel."
    : status.reason;
  return `<div class="blessing-section">
    <div class="section-title">Shrine blessings</div>
    <div class="small muted">${esc(note)}</div>
    <div class="blessing-list">${rows}</div>
  </div>`;
}

/**
 * One page with every control on it, opened with the ? key or the button in Settings.
 * It reads the live keybinds, so a rebound key shows up here too instead of lying.
 */
/**
 * One page with every control on it, opened with the ? key or the button in Settings.
 * It reads the live keybinds, so a rebound key shows up here too instead of lying.
 */
export function controlsPanelHtml(preferences: GamePreferences, session: GameSession | null = null): string {
  const keys = preferences.keybinds;
  const groups: { title: string; note: string; rows: [string, string, string][] }[] = [
    {
      title: "Moving",
      note: "Walk with either hand, dodge when a blow is coming",
      rows: [
        ["Walk", `Arrow keys or ${keys.up} ${keys.left} ${keys.down} ${keys.right}`, "Aim follows the mouse"],
        ["Dodge", keys.dodge, "Brief invulnerability mid-roll"],
      ],
    },
    {
      title: "Fighting",
      note: "The basic swing never runs out; the rest wait for you to level",
      rows: [
        ["Basic attack", `${keys.attack} / Left mouse`, "Hold to keep swinging"],
        ["Skills", "1 2 3 4 5", "Unlock as you level"],
      ],
    },
    {
      title: "Using things",
      note: "Potions first, then whatever is in front of you",
      rows: [
        ["Potion 1", keys.quick1, "Drinks the best healing potion if empty"],
        ["Potion 2", keys.quick2, "Drinks the best resource potion"],
        ["Interact", keys.interact, "Talk, loot, gather, travel"],
      ],
    },
    {
      title: "Getting around",
      note: "The way home and the way you read the map",
      rows: [
        ["Go home", "H", "Recall to the village. Not in a boss fight"],
        ["Map", "M", "Show or hide the minimap"],
      ],
    },
    {
      title: "Screens",
      note: "Every page, and the one you are reading now",
      rows: [
        ["Inventory", "I", "Bag, gear and quick slots"],
        ["Journal", "Q", "Quests, bounties, bestiary, travel"],
        ["Talents", "T", "Spend talent points"],
        ["Settings", "Esc", "Sound, interface, keybinds"],
        ["This sheet", "?", "Every control, at any time"],
      ],
    },
  ];
  const cards = groups
    .map((group) => {
      const list = group.rows
        .map(([what, key, note]) => `<div class="control-row">
        <span class="control-what">${esc(what)}</span>
        <span class="control-key">${esc(key)}</span>
        <span class="small muted">${esc(note)}</span>
      </div>`)
        .join("");
      return `<section class="inv-card controls-group">
        <div class="inv-card-head">
          <strong>${esc(group.title)}</strong>
          <span class="inv-card-note">${esc(group.note)}</span>
        </div>
        <div class="control-list">${list}</div>
      </section>`;
    })
    .join("");
  return `<div class="inv-sheet controls-sheet">
    <header class="inv-hero">
      ${session
        ? `<div class="inv-hero-portrait">${classPortrait(session.save.classId, 56)}</div>`
        : `<div class="inv-hero-portrait" style="display:grid;place-items:center;font-size:22px">?</div>`}
      <div class="inv-hero-body">
        <strong>${session ? esc(session.save.name) : "Every control"}</strong>
        <span class="small muted">${session ? `${esc(getClass(session.save.classId).name)} · Level ${session.save.level} · ${esc(session.zone.name)}` : "Read live from your keybinds, so a rebound key shows up here too. Change keys in Settings."}</span>
        <div class="inv-hero-chips">
          <span class="settings-chip">${groups.reduce((n, group) => n + group.rows.length, 0)} controls</span>
          <span class="settings-chip">Keyboard, mouse and gamepad</span>
        </div>
      </div>
    </header>
    ${cards}
    <section class="inv-card controls-group">
      <div class="inv-card-head">
        <strong>With a gamepad</strong>
        <span class="inv-card-note">Left stick moves, right stick aims</span>
      </div>
      <div class="small muted">A gamepad works too: left stick moves, right stick aims, A attacks, B dodges, X interacts. Rebind the buttons in Settings.</div>
    </section>
  </div>`;
}

export function talentsPanelHtml(session: GameSession): string {
  const save = session.save;
  const tree = getTalentTree(save.classId);
  const passive = tree.passive;
  const tiers = tree.tiers
    .map((tier) => {
      const chosen = talentTierChosen(save.classId, save.talents, tier.choices[0]?.tier ?? 0);
      const choices = tier.choices
        .map((choice) => {
          const selected = chosen?.id === choice.id;
          const locked = save.level < choice.level;
          const taken = Boolean(chosen) && !selected;
          const tag = locked ? `Lv ${choice.level}` : selected ? "Chosen" : taken ? "Locked" : "Available";
          const tagClass = selected ? "on" : taken ? "off" : locked ? "dim" : "ready";
          return `<button class="talent-choice ${selected ? "selected" : ""} ${locked ? "locked" : ""} ${taken ? "taken" : ""}" data-action="learn-talent" data-talent="${esc(choice.id)}" ${locked || chosen ? "disabled" : ""}>
            <span class="talent-choice-head"><b>${esc(choice.name)}</b><span class="talent-tag ${tagClass}">${tag}</span></span>
            <span class="talent-choice-desc">${esc(choice.description)}</span>
          </button>`;
        })
        .join("");
      const filled = Boolean(chosen);
      return `<div class="talent-tier ${save.level >= tier.level ? "unlocked" : "locked"} ${filled ? "filled" : ""}">
        <div class="talent-tier-rail" aria-hidden="true"><span class="talent-tier-dot"></span></div>
        <div class="talent-tier-body">
          <div class="talent-tier-label">
            <span class="talent-tier-name">Tier ${tier.level}</span>
            <span class="talent-tier-state">${save.level < tier.level ? `Opens at level ${tier.level}` : filled ? "Chosen" : `${tier.choices.length} options`}</span>
          </div>
          <div class="talent-choices">${choices}</div>
        </div>
      </div>`;
    })
    .join("");
  const chosenCount = save.talents.length;
  const totalTiers = tree.tiers.length;
  const nextTier = tree.tiers.find((tier) => save.level < tier.level);
  const respec = session.respecCost();
  const statChips = passive.stats
    ? Object.entries(passive.stats)
        .filter(([, value]) => Number(value) !== 0)
        .map(([key, value]) => `<span class="talent-stat-chip">+${key === "crit" ? `${Math.round(Number(value) * 100)}%` : Math.round(Number(value))} ${esc(key)}</span>`)
        .join("")
    : "";
  return `<div class="talent-wrap">
    <header class="talent-summary">
      <div class="talent-sum-cell"><span class="small muted">Chosen</span><strong>${chosenCount} / ${totalTiers}</strong></div>
      <div class="talent-sum-cell"><span class="small muted">Next tier</span><strong>${nextTier ? `Level ${nextTier.level}` : "All open"}</strong></div>
      <div class="talent-sum-cell"><span class="small muted">Reset</span><strong>${respec > 0 ? `${respec} g` : "Free"}</strong></div>
    </header>
    <div class="talent-passive">
      <div class="talent-passive-head">
        <span class="talent-passive-icon" aria-hidden="true">\u25C6</span>
        <div><strong>${esc(passive.name)}</strong><div class="small muted">Class passive</div></div>
      </div>
      <div class="small muted">${esc(passive.description)}</div>
      ${statChips ? `<div class="talent-stat-chips">${statChips}</div>` : ""}
    </div>
    <div class="talent-hint small muted">Pick one talent at levels 5, 10, 15, 20 and 30. Choices are permanent until Master Kael resets them.</div>
    <div class="talent-tiers">${tiers}</div>
  </div>`;
}

export function settingsPanelHtml(
  session: GameSession | null,
  volume: number,
  muted: boolean,
  musicVolume: number,
  preferences: GamePreferences,
  rebinding: KeybindAction | null = null,
  padListening: KeybindAction | null = null,
): string {
  const classInfo = session ? getClass(session.save.classId) : null;
  return `<div class="settings-grid">
    ${session ? `<header class="settings-hero">
      <div class="settings-hero-portrait">${classPortrait(session.save.classId, 56)}</div>
      <div class="settings-hero-body">
        <strong>${esc(session.save.name)}</strong>
        <span class="small muted">${esc(classInfo?.name ?? "")} · Level ${session.save.level} · ${esc(session.zone.name)}</span>
        <div class="settings-hero-chips">
          <span class="settings-chip">${session.save.difficulty === "story" ? "Story" : session.save.difficulty === "nightmare" ? "Nightmare" : "Normal"}${session.save.ngPlus > 0 ? ` · cycle ${session.save.ngPlus + 1}` : ""}</span>
          <span class="settings-chip">Torment ${session.save.torment}</span>
          <span class="settings-chip gold">${formatNumber(session.save.gold)} gold</span>
        </div>
      </div>
    </header>` : ""}
    <div class="settings-group">
      <div class="settings-group-head">
        <strong>Sound</strong>
        <span class="settings-group-note">Synthesized effects and procedural music</span>
      </div>
      <div class="setting-line">
        <div class="setting-line-label">
          <strong>Effects</strong>
          <div class="small muted">Swords, spells, pickups and menu clicks.</div>
        </div>
        <input class="setting-slider" type="range" id="volume-range" min="0" max="100" value="${Math.round(volume * 100)}" aria-label="Effects volume" />
      </div>
      <div class="setting-line">
        <div class="setting-line-label">
          <strong>Music</strong>
          <div class="small muted">The theme that follows each zone.</div>
        </div>
        <input class="setting-slider" type="range" id="music-range" min="0" max="100" value="${Math.round(musicVolume * 100)}" aria-label="Music volume" />
      </div>
      <div class="setting-line">
        <div class="setting-line-label">
          <strong>Mute effects</strong>
          <div class="small muted">Silences sound effects but keeps the music.</div>
        </div>
        <label class="setting-switch">
          <input type="checkbox" id="mute-toggle" ${muted ? "checked" : ""} aria-label="Mute effects" />
          <span class="setting-switch-track"></span>
        </label>
      </div>
    </div>
    <div class="settings-group">
      <div class="settings-group-head">
        <strong>Screen</strong>
        <span class="settings-group-note">How the world and the panels are drawn</span>
      </div>
      <div class="setting-line">
        <div class="setting-line-label">
          <strong>UI scale</strong>
          <div class="small muted">HUD, buttons and panels. The world stays the same size.</div>
        </div>
        <select id="ui-scale" class="setting-select" aria-label="UI scale">
          <option value="1" ${preferences.uiScale === 1 ? "selected" : ""}>100%</option>
          <option value="1.25" ${preferences.uiScale === 1.25 ? "selected" : ""}>125%</option>
          <option value="1.5" ${preferences.uiScale === 1.5 ? "selected" : ""}>150%</option>
        </select>
      </div>
      <div class="setting-line">
        <div class="setting-line-label">
          <strong>Reading text</strong>
          <div class="small muted">The small print in logs, quests and tooltips.</div>
        </div>
        <select id="text-size-select" class="setting-select" aria-label="Reading text">
          <option value="1" ${preferences.textSize === 1 ? "selected" : ""}>Normal</option>
          <option value="1.15" ${preferences.textSize === 1.15 ? "selected" : ""}>Large</option>
          <option value="1.3" ${preferences.textSize === 1.3 ? "selected" : ""}>Larger</option>
        </select>
      </div>
      <div class="setting-line">
        <div class="setting-line-label">
          <strong>Camera zoom</strong>
          <div class="small muted">Wide shows more of the map; Close shows more detail.</div>
        </div>
        <select id="zoom-select" class="setting-select" aria-label="Camera zoom">
          <option value="1.5" ${preferences.cameraZoom === 1.5 ? "selected" : ""}>Wide</option>
          <option value="2" ${preferences.cameraZoom === 2 ? "selected" : ""}>Normal</option>
          <option value="2.5" ${preferences.cameraZoom === 2.5 ? "selected" : ""}>Close</option>
        </select>
      </div>
      <div class="setting-line">
        <div class="setting-line-label">
          <strong>Brightness</strong>
          <div class="small muted">Lifts a dark room on a bright screen.</div>
        </div>
        <select id="brightness-select" class="setting-select" aria-label="Brightness">
          <option value="1" ${preferences.brightness === 1 ? "selected" : ""}>Normal</option>
          <option value="1.2" ${preferences.brightness === 1.2 ? "selected" : ""}>Brighter</option>
          <option value="1.4" ${preferences.brightness === 1.4 ? "selected" : ""}>Brightest</option>
        </select>
      </div>
    </div>
    <div class="settings-group">
      <div class="settings-group-head">
        <strong>Comfort and access</strong>
        <span class="settings-group-note">For tired eyes, weak colour vision and motion sickness</span>
      </div>
      <div class="setting-line">
        <div class="setting-line-label">
          <strong>High contrast</strong>
          <div class="small muted">Crisper lines and brighter text everywhere.</div>
        </div>
        <label class="setting-switch">
          <input type="checkbox" id="contrast-toggle" ${preferences.highContrast ? "checked" : ""} aria-label="High contrast" />
          <span class="setting-switch-track"></span>
        </label>
      </div>
      <div class="setting-line">
        <div class="setting-line-label">
          <strong>Colours</strong>
          <div class="small muted">Swaps the red and green pair for colours that stay apart.</div>
        </div>
        <select id="color-blind-select" class="setting-select" aria-label="Colours">
          <option value="normal" ${preferences.colorBlind === "normal" ? "selected" : ""}>Default</option>
          <option value="protan" ${preferences.colorBlind === "protan" ? "selected" : ""}>Red-weak friendly</option>
          <option value="deutan" ${preferences.colorBlind === "deutan" ? "selected" : ""}>Green-weak friendly</option>
        </select>
      </div>
      <div class="setting-line">
        <div class="setting-line-label">
          <strong>Reduce motion</strong>
          <div class="small muted">No shakes, flashes or slow-motion on a boss kill.</div>
        </div>
        <label class="setting-switch">
          <input type="checkbox" id="motion-toggle" ${preferences.reducedMotion ? "checked" : ""} aria-label="Reduce motion" />
          <span class="setting-switch-track"></span>
        </label>
      </div>
      <div class="setting-line">
        <div class="setting-line-label">
          <strong>Screen shake</strong>
          <div class="small muted">A small jolt when you take a hit.</div>
        </div>
        <label class="setting-switch">
          <input type="checkbox" id="shake-toggle" ${preferences.screenShake ? "checked" : ""} aria-label="Screen shake" />
          <span class="setting-switch-track"></span>
        </label>
      </div>
      <div class="setting-line">
        <div class="setting-line-label">
          <strong>Floating damage</strong>
          <div class="small muted">The numbers that rise off what you hit.</div>
        </div>
        <label class="setting-switch">
          <input type="checkbox" id="damage-toggle" ${preferences.showDamage ? "checked" : ""} aria-label="Floating damage" />
          <span class="setting-switch-track"></span>
        </label>
      </div>
      <div class="setting-line">
        <div class="setting-line-label">
          <strong>Effect size</strong>
          <div class="small muted">How loud spells and bursts look on screen.</div>
        </div>
        <select id="effect-select" class="setting-select" aria-label="Effect size">
          <option value="0.5" ${preferences.effectIntensity === 0.5 ? "selected" : ""}>Subtle</option>
          <option value="1" ${preferences.effectIntensity === 1 ? "selected" : ""}>Normal</option>
          <option value="1.5" ${preferences.effectIntensity === 1.5 ? "selected" : ""}>Bold</option>
        </select>
      </div>
    </div>
    <div class="settings-group">
      <div class="settings-group-head">
        <strong>Input and language</strong>
        <span class="settings-group-note">How you touch the game, and what it says</span>
      </div>
      <div class="setting-line">
        <div class="setting-line-label">
          <strong>Touch controls</strong>
          <div class="small muted">On-screen stick and buttons. Phones turn this on by themselves.</div>
        </div>
        <label class="setting-switch">
          <input type="checkbox" id="touch-toggle" ${preferences.touchControls ? "checked" : ""} aria-label="Touch controls" />
          <span class="setting-switch-track"></span>
        </label>
      </div>
      <div class="setting-line">
        <div class="setting-line-label">
          <strong>Language</strong>
          <div class="small muted">Menus and messages.</div>
        </div>
        <select id="language-select" class="setting-select" aria-label="Language">
          <option value="en" ${preferences.language === "en" ? "selected" : ""}>English</option>
          <option value="tl" ${preferences.language === "tl" ? "selected" : ""}>Tagalog</option>
        </select>
      </div>
    </div>
    <div class="settings-group">
      <div class="settings-group-head">
        <strong>Sheets and help</strong>
        <span class="settings-group-note">The pages worth opening once</span>
      </div>
      <div class="settings-sheet-row">
        <button class="btn ghost small" data-action="open-controls">Controls sheet (?)</button>
        <button class="btn ghost small" data-action="open-update-board">Update board</button>
        <button class="btn ghost small" data-action="reset-tutorial">${t("btnShowTutorial")}</button>
      </div>
    </div>
    <div class="setting-row">
      <div class="setting-label"><strong>Keybinds</strong><div class="small muted">Click a binding, then press a key. Arrow keys always move.</div></div>
      <div class="keybind-grid">
        ${(Object.keys(KEYBIND_LABELS) as KeybindAction[]).map((action) => `<button class="keybind-btn ${rebinding === action ? "listening" : ""}" data-action="rebind-key" data-key="${action}"><span>${KEYBIND_LABELS[action]}</span><b>${rebinding === action ? "Press a key" : preferences.keybinds[action]}</b></button>`).join("")}
        <button class="btn ghost small" data-action="reset-keys">${t("btnResetKeybinds")}</button>
      </div>
      <div class="small muted">If two actions share a key, the new key is refused and the message says which action already has it.</div>
    </div>
    <div class="setting-row">
      <div class="setting-label"><strong>Gamepad buttons</strong><div class="small muted">Click a button, then press the gamepad button you want. Sticks always move and aim.</div></div>
      <div class="keybind-grid">
        ${(Object.keys(KEYBIND_LABELS) as KeybindAction[]).map((action) => `<button class="keybind-btn ${padListening === action ? "listening" : ""}" data-action="rebind-pad" data-key="${action}"><span>${KEYBIND_LABELS[action]}</span><b>${padListening === action ? "Press a button" : `Button ${preferences.padBinds[action]}`}</b></button>`).join("")}
        <button class="btn ghost small" data-action="reset-pad">${t("btnResetGamepad")}</button>
      </div>
    </div>
    ${session ? `<div class="setting-row">
      <div class="setting-label"><strong>Difficulty</strong><div class="small muted">Story is forgiving, Nightmare is brutal. Change it any time while alive.</div></div>
      <div class="settings-controls">
        <select id="difficulty-select">
          <option value="story" ${session.save.difficulty === "story" ? "selected" : ""}>Story</option>
          <option value="normal" ${session.save.difficulty === "normal" ? "selected" : ""}>Normal</option>
          <option value="nightmare" ${session.save.difficulty === "nightmare" ? "selected" : ""}>Nightmare</option>
        </select>
        <span class="small muted">Cycle ${session.save.ngPlus + 1}${session.save.ngPlus > 0 ? ` · +${session.save.ngPlus * 35}% enemy power` : ""}</span>
        ${session.canNewGamePlus() ? `<button class="btn small" data-action="new-game-plus">Begin New Game+</button>` : ""}
      </div>
    </div>
    <div class="setting-row">
      <div class="setting-label"><strong>Torment ${session.save.torment}</strong><div class="small muted">${esc(session.tormentInfo.description)} It applies to the whole realm, every zone. Higher tiers open as the hero levels, and the top ones only after the Hollow King falls.</div></div>
      <div class="settings-controls">
        <button class="btn ghost small" data-action="torment-down" ${session.save.torment > 0 ? "" : "disabled"}>Easier</button>
        <span class="small muted">Tier ${session.save.torment} · ${session.tormentUnlocked} unlocked</span>
        <button class="btn small" data-action="torment-up" ${session.save.torment < session.tormentUnlocked ? "" : "disabled"}>Harsher</button>
      </div>
    </div>
    <div class="setting-row">
      <div class="setting-label"><strong>${esc(session.save.name)}</strong><div class="small muted">${classInfo?.name} · Level ${session.save.level} · ${esc(session.zone.name)}</div></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn ghost small" data-action="share-card" title="Draws your hero as a picture you can post">Save share card</button>
        <button class="btn ghost small" data-action="export-current">${t("btnExportHero")}</button>
        <button class="btn ghost small" data-action="export-all">${t("btnExportAll")}</button>
        <button class="btn ghost small" data-action="import-file">${t("btnImportSaves")}</button>
        <button class="btn ghost small" data-action="return-menu">${t("btnCharacterSelect")}</button>
        <button class="btn danger small" data-action="delete-current" title="Asks first, then erases this hero">${t("btnDeleteHero")}</button>
      </div>
    </div>` : ""}
    <div class="setting-row settings-row-static">
      <div class="setting-label"><strong>Controls</strong><div class="small muted">The keys you press most, at a glance</div></div>
      <div class="controls-help">
        <span>WASD / Arrows — move</span>
        <span>Left click / Space — basic attack</span>
        <span>1-5 — class abilities</span>
        <span>Shift — dodge (brief invulnerability)</span>
        <span>Z / X — use bound potions</span>
        <span>E — interact / portal / chest</span>
        <span>I — inventory</span>
        <span>Q — quests</span>
        <span>T — talents</span>
        <span>Esc — close panel / settings</span>
        <span>Mouse — aim skills</span>
      </div>
    </div>
    <div class="small muted">
      Saves live in this browser's IndexedDB. Nothing is uploaded. Export a JSON backup before clearing site data or switching devices.
      ${session ? "The game autosaves every 30 seconds, on zone changes, and when you close panels." : ""}
    </div>
    <input type="file" id="settings-import" accept="application/json,.json" hidden />
  </div>`;
}

export function villageSection(session: GameSession): string {
  const rows = session.villageRows;
  const effects = session.villageEffects;
  const total = rows.reduce((sum, row) => sum + row.level, 0);
  const maxTotal = rows.length * rows[0]!.maxLevel;
  const cards = rows
    .map((row) => {
      const next = row.next;
      const material = next?.materials ? itemDef(next.materials.itemId) : undefined;
      const have = next?.materials ? session.countItem(next.materials.itemId) : 0;
      const need = next?.materials?.qty ?? 0;
      const shortMaterial = need > 0 && have < need;
      const shortGold = Boolean(next) && session.save.gold < (next?.gold ?? 0);
      const stages = Array.from({ length: row.maxLevel }, (_, i) => `<span class="village-stage ${i < row.level ? "on" : ""}"></span>`).join("");
      const status = !next
        ? `<span class="village-pill done">Fully rebuilt</span>`
        : row.affordable
          ? `<span class="village-pill ready">Ready to rebuild</span>`
          : `<span class="village-pill">Saved up for</span>`;
      return `<article class="village-card" style="--building-color:${row.color}">
      <header class="village-head">
        <div class="village-title">
          <strong>${esc(row.name)}</strong>
          <span class="small muted">${esc(row.role)}</span>
        </div>
        ${status}
      </header>
      <div class="village-stage-rail" title="Stage ${row.level} of ${row.maxLevel}">
        ${stages}
        <span class="village-stage-label">${row.level}/${row.maxLevel}</span>
      </div>
      <p class="village-desc small muted">${esc(row.description)}</p>
      <div class="village-benefits">
        <div class="village-benefit now"><span class="village-benefit-tag">Now</span><span>${esc(row.current)}</span></div>
        ${next ? `<div class="village-benefit next"><span class="village-benefit-tag">Next</span><span>${esc(next.benefit)}</span></div>` : ""}
      </div>
      ${next
        ? `<footer class="village-cost">
        <span class="village-price ${shortGold ? "short" : ""}">${formatNumber(next.gold)} gold</span>
        ${next.materials && material
          ? `<span class="village-price ${shortMaterial ? "short" : ""}">${have}/${need} ${esc(material.name)}</span>`
          : ""}
        <button class="btn small" data-action="rebuild-village" data-village="${row.id}" ${row.affordable ? "" : "disabled"}>${next ? `Rebuild \u2192 stage ${row.level + 1}` : "Rebuild"}</button>
      </footer>`
        : `<footer class="village-cost"><span class="small" style="color:var(--green)">Every stage here is paid once and kept forever.</span></footer>`}
    </article>`;
    })
    .join("");
  const completion = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;
  const effectChips: [string, string][] = [
    ["\u2694", `+${effects.attackPct}% attack`],
    ["\u2764", `+${effects.maxHpPct}% health`],
    ["\u26E8", `+${effects.defenseFlat} defense`],
    ["\u2726", `+${effects.xpPct}% xp`],
    ["\u25C9", `+${effects.goldPct}% gold`],
    ["\u25C8", `${effects.shopDiscountPct}% off shops`],
  ];
  return `<section class="panel-stack">
    <header class="panel-hero">
      <div class="panel-hero-body">
        <h3>Rebuild Eldoria</h3>
        <p class="small muted">Every stage is paid once and kept forever, and every hero on this account feels it. Gold finally has somewhere to live.</p>
      </div>
      <div class="panel-hero-stat"><strong>${total}/${maxTotal}</strong><span class="small muted">stages raised</span></div>
    </header>
    <div class="panel-progress"><div class="panel-progress-fill" style="width:${completion}%"></div></div>
    <div class="effect-chip-row">${effectChips.map(([icon, label]) => `<span class="effect-chip"><span aria-hidden="true">${icon}</span>${esc(label)}</span>`).join("")}</div>
    <div class="village-grid">${cards}</div>
    <div class="row-wrap"><button class="btn ghost small" data-action="open-runewords">Open the runeword book</button></div>
  </section>`;
}

export function companionSection(session: GameSession): string {
  if (!session.hasCompanion) {
    return `<section class="panel-stack">
      <header class="panel-hero">
        <div class="panel-hero-body">
          <h3>Companion</h3>
          <p class="small muted">Hatch your egg in the village and a companion follows you. Then it can wear a collar and a charm, and learn one skill.</p>
        </div>
      </header>
    </section>`;
  }
  const loadout = session.petLoadout;
  const stage = session.petStage;
  const next = session.petStageNext;
  const petName = esc(session.save.companion?.name ?? "Your companion");
  const gearRows = session.petGearRow;
  const slotCards = gearRows
    .map((row) => {
      const owned = session.save.inventory
        .map((stack, index) => ({ stack, index }))
        .filter((entry): entry is { stack: ItemStack; index: number } => Boolean(entry.stack))
        .filter(({ stack }) => getPetGear(stack.itemId)?.slot === row.slot)
        .map(({ stack }) => `<button class="btn ghost small" data-action="wear-pet-gear" data-item="${stack.itemId}">${esc(itemDef(stack.itemId)?.name ?? stack.itemId)}</button>`);
      const worn = row.itemId ? itemDef(row.itemId) : undefined;
      return `<article class="pet-slot ${row.itemId ? "filled" : "empty"}">
      <header class="pet-slot-head">
        <span class="pet-slot-icon" aria-hidden="true">${row.slot === "collar" ? "\u25CE" : "\u2740"}</span>
        <div>
          <strong>${row.slot === "collar" ? "Collar" : "Charm"}</strong>
          <span class="small muted">${worn ? esc(worn.name) : esc(row.name)}</span>
        </div>
        ${row.itemId ? `<button class="btn ghost small" data-action="remove-pet-gear" data-slot="${row.slot}">Take off</button>` : ""}
      </header>
      <p class="small muted">${esc(row.description)}</p>
      ${owned.length
        ? `<div class="pet-slot-bag"><span class="small muted">In your bag</span><div class="row-wrap">${owned.join("")}</div></div>`
        : `<div class="small muted">${row.itemId ? "Nothing spare in your bag." : "None in your bag. Mira sells them."}</div>`}
    </article>`;
    })
    .join("");
  const skills = session.petSkillList
    .map(
      (skill) => `<div class="skill-row ${skill.learned ? "learned" : ""}">
    <div>
      <strong>${esc(skill.name)}</strong>
      <div class="small muted">${esc(skill.description)}</div>
    </div>
    ${skill.learned ? `<span class="skill-tag on">\u2713 Learned</span>` : `<button class="btn ghost small" data-action="teach-pet-skill" data-skill="${skill.id}" ${skill.available ? "" : "disabled"}>Teach</button>`}
  </div>`,
    )
    .join("");
  const stageLadder = PET_STAGES.map((entry) => {
    const reached = session.petLevel >= entry.fromLevel;
    const current = stage.stage === entry.stage;
    return `<div class="pet-stage ${reached ? "reached" : ""} ${current ? "current" : ""}">
      <span class="pet-stage-name">${esc(entry.name)}</span>
      <span class="pet-stage-level">Lv ${entry.fromLevel}</span>
    </div>`;
  }).join("");
  const progress = next
    ? Math.min(100, Math.round(((session.petLevel - stage.fromLevel) / Math.max(1, next.fromLevel - stage.fromLevel)) * 100))
    : 100;
  return `<section class="panel-stack">
    <header class="panel-hero">
      <div class="panel-hero-body">
        <h3>${petName}</h3>
        <p class="small muted">Level ${session.petLevel} \u00B7 ${esc(stage.name)}. Worn gear and a taught skill give it more to do than just bite.</p>
      </div>
      <div class="panel-hero-stat"><strong>${Math.round(loadout.power * 100)}%</strong><span class="small muted">bite power</span></div>
    </header>
    <div class="pet-stage-ladder">${stageLadder}</div>
    <div class="panel-progress"><div class="panel-progress-fill" style="width:${progress}%"></div></div>
    <div class="small muted">${next ? `${next.fromLevel - session.petLevel} level${next.fromLevel - session.petLevel === 1 ? "" : "s"} to ${esc(next.name)}` : "Every stage reached. It has grown as far as it can."}</div>
    <div class="effect-chip-row">
      <span class="effect-chip"><span aria-hidden="true">\u2694</span>+${loadout.attack} attack</span>
      <span class="effect-chip"><span aria-hidden="true">\u26E8</span>+${loadout.defense} defense</span>
      <span class="effect-chip"><span aria-hidden="true">\u2764</span>+${loadout.maxHp} health</span>
      <span class="effect-chip"><span aria-hidden="true">\u27A4</span>+${loadout.moveSpeed} move speed</span>
    </div>
    <div class="village-grid">${slotCards}</div>
    <div class="panel-subhead">Skills</div>
    <div class="skill-list">${skills}</div>
  </section>`;
}

export function runewordSection(session: GameSession): string {
  const rows = session.runewordRows;
  const forged = rows.filter((row) => row.forged).length;
  const ready = rows.filter((row) => row.ready && !row.forged).length;
  const cards = rows
    .map((row) => {
      const held = row.gems.reduce((sum, gem) => sum + Math.min(gem.have, gem.need), 0);
      const wanted = row.gems.reduce((sum, gem) => sum + gem.need, 0);
      const pct = wanted > 0 ? Math.min(100, Math.round((held / wanted) * 100)) : 100;
      const status = row.forged
        ? `<span class="village-pill done">Forged</span>`
        : row.ready
          ? `<span class="village-pill ready">Ready</span>`
          : `<span class="village-pill">${held}/${wanted} gems</span>`;
      const chips = row.gems
        .map((gem) => {
          const got = gem.have >= gem.need;
          return `<span class="gem-chip ${got ? "ready" : ""}">${esc(gem.name)}<b>${gem.have}/${gem.need}</b></span>`;
        })
        .join("");
      return `<article class="village-card runeword-card ${row.forged ? "forged" : ""}">
      <header class="village-head">
        <div class="village-title"><strong>${esc(row.name)}</strong><span class="small muted">3 sockets · any order</span></div>
        ${status}
      </header>
      <div class="panel-progress small"><div class="panel-progress-fill" style="width:${pct}%"></div></div>
      <div class="gem-chips">${chips}</div>
      <p class="small muted">${esc(row.text)}</p>
    </article>`;
    })
    .join("");
  return `<section class="panel-stack">
    <header class="panel-hero">
      <div class="panel-hero-body">
        <h3>Runewords</h3>
        <p class="small muted">Three gems in the right combination, set into gear with at least three sockets, spell a runeword. The order does not matter. Rare gear holds three, epic four, legendary five.</p>
      </div>
      <div class="panel-hero-stat"><strong>${forged}/${rows.length}</strong><span class="small muted">${ready > 0 ? `${ready} ready now` : "forged"}</span></div>
    </header>
    <div class="village-grid">${cards}</div>
  </section>`;
}

export function memorialSection(entries: MemorialEntry[]): string {
  const count = entries.length;
  if (count === 0) {
    return `<section class="inv-card memorial-card">
      <div class="inv-card-head">
        <strong>Memorial Wall</strong>
        <span class="inv-card-note">Nobody has fallen yet</span>
      </div>
      <div class="small muted">Hardcore heroes die for good. Make one at the character screen and the wall will remember them here.</div>
    </section>`;
  }
  const deepest = entries.reduce((best, entry) => Math.max(best, entry.level), 0);
  const rows = [...entries]
    .sort((a, b) => b.at - a.at)
    .slice(0, 20)
    .map((entry) => `<div class="memorial-row">
      <div class="memorial-body">
        <strong>${esc(entry.name)}</strong>
        <div class="small muted">${esc(classDef(entry.classId)?.name ?? entry.classId)} \u00b7 Level ${entry.level} \u00b7 ${esc(entry.zone)}</div>
      </div>
      <div class="memorial-meta small muted">${entry.killer ? `Fell to ${esc(entry.killer)}` : "Fell in the dark"} \u00b7 ${entry.bosses} boss${entry.bosses === 1 ? "" : "es"} \u00b7 ${formatTime(entry.playtime)}</div>
    </div>`).join("");
  return `<div class="inv-sheet">
    <header class="inv-hero">
      <div class="inv-hero-portrait" style="display:grid;place-items:center;font-size:22px">\u2020</div>
      <div class="inv-hero-body">
        <strong>Memorial Wall</strong>
        <span class="small muted">Hardcore heroes die for good. These names are kept here, with how far they got.</span>
        <div class="inv-hero-chips">
          <span class="settings-chip gold">${count} fallen</span>
          <span class="settings-chip">Deepest level ${deepest}</span>
          <span class="settings-chip">Newest first</span>
        </div>
      </div>
    </header>
    <section class="inv-card memorial-card">
      <div class="inv-card-head">
        <strong>Names kept</strong>
        <span class="inv-card-note">Showing the newest ${Math.min(count, 20)} of ${count}</span>
      </div>
      <div class="memorial-list">${rows}</div>
    </section>
  </div>`;
}

export function itemRarityOrder(rarity: string): number {
  return RARITY_ORDER.indexOf(rarity);
}
