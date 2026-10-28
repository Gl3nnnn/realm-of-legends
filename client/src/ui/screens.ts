import {
  CLASS_LIST,
  FLAGSHIP_CLASSES,
  ITEMS,
  LORE_ENTRIES,
  MAX_CHARACTERS,
  MAX_UPGRADE,
  MONSTERS,
  NG_PLUS_DIALOGUE,
  NPCS,
  QUESTS,
  RECIPES,
  SHOPS,
  ZONES,
  canClassUse,
  getClass,
  getItem,
  getTalentTree,
  isEquippable,
  itemDisplayName,
  itemSellValue,
  loreBySubject,
  revealedLore,
  talentTierChosen,
  type CharacterSave,
  type ClassId,
  type GameSession,
  type ItemStack,
} from "@realm/core";
import { KEYBIND_LABELS, type GamePreferences, type KeybindAction } from "./preferences";
import { t } from "./text";
import {
  abilityIconHtml,
  charIconHtml,
  classPortrait,
  esc,
  formatNumber,
  formatTime,
  itemDetailHtml,
  itemIconHtml,
  questObjectiveText,
  statLines,
} from "./helpers";

const RARITY_ORDER = ["common", "uncommon", "rare", "epic", "legendary"];

export function characterSelectHtml(saves: CharacterSave[]): string {
  const cards = saves
    .map((save) => {
      const def = getClass(save.classId);
      const updated = new Date(save.updatedAt).toLocaleDateString();
      return `<article class="save-card" data-id="${esc(save.id)}">
        ${classPortrait(save.classId, 64)}
        <div>
          <h3>${esc(save.name)}</h3>
          <div class="muted">${esc(def.name)} · Level ${save.level}</div>
          <div class="meta">
            <span>${esc(ZONES[save.zone]?.name ?? save.zone)}</span>
            <span>Playtime ${formatTime(save.playtime)} · ${esc(updated)}</span>
            <span class="gold">${formatNumber(save.gold)} gold</span>
          </div>
          <div class="card-actions">
            <button class="btn small" data-action="play" data-id="${esc(save.id)}">${t("btnPlay")}</button>
            <button class="btn ghost small" data-action="export-save" data-id="${esc(save.id)}">${t("btnExport")}</button>
            <button class="btn ghost small" data-action="delete-save" data-id="${esc(save.id)}">${t("btnDelete")}</button>
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

export function createPanelHtml(selectedClass: ClassId, roleFilter: string = "all"): string {
  const roles = Array.from(new Set(CLASS_LIST.map((def) => def.role)));
  const filterButtons = ["all", ...roles]
    .map((role) => `<button class="chip-btn ${roleFilter === role ? "active" : ""}" data-action="class-role-filter" data-value="${esc(role)}">${role === "all" ? t("labelAll") : esc(role)}</button>`)
    .join("");
  const visibleClasses = CLASS_LIST.filter((def) => roleFilter === "all" || def.role === roleFilter);
  const cards = visibleClasses.map((def) => {
    const flagship = FLAGSHIP_CLASSES.includes(def.id);
    return `<button class="class-card ${def.id === selectedClass ? "selected" : ""}" data-action="select-class" data-class="${def.id}">
      ${classPortrait(def.id, 52, "card-portrait")}
      <span>
        <span class="class-name">${esc(def.name)}</span>
        <span class="class-role">${esc(def.role)} · ${esc(def.difficulty)}</span>
        ${flagship ? `<span class="badge">Recommended</span>` : ""}
      </span>
    </button>`;
  }).join("");
  const def = getClass(selectedClass);
  const previewStats = [
    ["Health", Math.round(def.base.maxHp)],
    ["Attack", Math.round(def.base.attack)],
    ["Defense", Math.round(def.base.defense)],
    ["Crit", `${Math.round(def.base.crit * 100)}%`],
  ]
    .map(([label, value]) => `<span class="preview-stat"><b>${esc(String(value))}</b>${esc(String(label))}</span>`)
    .join("");
  const previewAbilities = [
    `<span class="preview-ability"><b>${esc(def.basic.name)}</b><span>Basic</span></span>`,
    ...def.abilities.map((ability) => `<span class="preview-ability"><b>${esc(ability.name)}</b><span>Lv ${ability.unlockLevel}</span></span>`),
  ].join("");
  return `<div class="create-top">
    <div class="field">
      <label for="char-name">Hero name</label>
      <input id="char-name" type="text" maxlength="16" autocomplete="off" spellcheck="false" placeholder="Enter a name..." />
      <div id="create-error" class="small" style="color:#ff9fa0;min-height:16px"></div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn" data-action="create-character">${t("btnEnterEldoria")}</button>
      <button class="btn ghost" data-action="cancel-create">${t("btnBack")}</button>
    </div>
  </div>
  <div>
    <div class="section-title">Choose a class — ${esc(def.name)}</div>
    <div class="muted small" style="margin-bottom:10px">${esc(def.description)}</div>
    <div class="role-filters" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">${filterButtons}</div>
    <div class="class-grid">${cards}</div>
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

export function quickbarHtml(session: GameSession): string {
  const keys = ["Z", "X"];
  const cooldownPct = Math.min(100, session.potionCooldown * 100);
  return session.save.quickSlots
    .map((itemId, index) => {
      const def = itemId ? getItem(itemId) : null;
      const qty = itemId ? session.countItem(itemId) : 0;
      const label = def ? `${def.name} · Z/X to use` : "Empty quick slot · bind a potion in your inventory";
      return `<button class="quick-slot ${def ? "filled" : "empty"}" data-quickslot="${index}" title="${esc(label)}" aria-label="${esc(label)}">
        <span class="quick-key">${keys[index]}</span>
        ${def ? `<span class="quick-icon">${itemIconHtml(def.icon, 26)}</span>` : `<span class="quick-empty">+</span>`}
        ${def ? `<span class="qty">${qty}</span>` : ""}
        ${def && cooldownPct > 0 ? `<span class="quick-cd" style="height:${cooldownPct}%"></span>` : ""}
      </button>`;
    })
    .join("");
}

function stackCell(stack: ItemStack | null, index: number, selected: boolean): string {
  if (!stack) return `<button class="inv-slot empty" data-slot="${index}" aria-label="Empty slot"></button>`;
  const def = getItem(stack.itemId);
  return `<button class="inv-slot ${selected ? "selected" : ""}" data-slot="${index}" title="${esc(itemDisplayName(stack))}">
    <span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%)">${itemIconHtml(def.icon, 32)}</span>
    ${stack.qty > 1 ? `<span class="qty">${stack.qty}</span>` : ""}
  </button>`;
}

export type InventoryFilter = "all" | "weapon" | "armor" | "helm" | "boots" | "trinket" | "consumable" | "material";
export type InventorySort = "default" | "rarity" | "name" | "type";

const FILTERS: { id: InventoryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "weapon", label: "Weapons" },
  { id: "armor", label: "Armor" },
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
  const grid = entries.map(({ stack, index }) => stackCell(stack, index, selectedSlot === index)).join("");
  const fillers = Array.from({ length: Math.max(0, 24 - entries.length) }, () => `<div class="inv-slot empty" aria-hidden="true"></div>`).join("");
  const filterButtons = FILTERS.map(
    (entry) => `<button class="chip-btn ${filter === entry.id ? "active" : ""}" data-action="inv-filter" data-value="${entry.id}">${entry.label}</button>`,
  ).join("");
  const sortButtons = SORTS.map(
    (entry) => `<button class="chip-btn ${sort === entry.id ? "active" : ""}" data-action="inv-sort" data-value="${entry.id}">${entry.label}</button>`,
  ).join("");
  const equipSlots: (keyof CharacterSave["equipment"])[] = ["weapon", "armor", "helm", "boots", "trinket"];
  const equipment = equipSlots
    .map((slot) => {
      const stack = save.equipment[slot];
      const def = stack ? getItem(stack.itemId) : null;
      return `<button class="equip-slot ${stack ? "filled" : ""}" data-equip="${slot}" title="${stack ? esc(itemDisplayName(stack)) : `Empty ${slot} slot`}">
        ${stack ? itemIconHtml(def!.icon, 34) : `<span style="font-size:16px;color:#5f5668">·</span>`}
        <span>${slot}</span>
      </button>`;
    })
    .join("");
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
      const usable = canClassUse(def, save.classId);
      actions += `<button class="btn small" data-action="equip" data-slot="${selectedSlot}" ${usable ? "" : "disabled"}>Equip</button>`;
      if (!usable) actions += `<span class="small" style="color:#ff9fa0;align-self:center">Not usable by ${esc(getClass(save.classId).name)}</span>`;
    }
    actions += `<button class="btn ghost small" data-action="sell" data-slot="${selectedSlot}">Sell for ${itemSellValue(stack)}g</button>`;
  }
  return `<div class="panel-columns">
    <div style="display:grid;gap:16px">
      <div>
        <div class="section-title">Backpack · ${formatNumber(save.gold)} gold</div>
        <div class="inv-toolbar">
          <div class="chip-row">${filterButtons}</div>
          <div class="chip-row">${sortButtons}</div>
        </div>
        <div class="inv-grid">${grid}${fillers}</div>
        ${entries.length === 0 ? `<div class="small muted" style="margin-top:8px">No items match this filter.</div>` : ""}
      </div>
      <div>
        <div class="section-title">Equipped</div>
        <div class="equip-grid">${equipment}</div>
      </div>
    </div>
    <div style="display:grid;gap:12px;align-content:start">
      ${itemDetailHtml(stack, compareTo)}
      <div class="detail-actions">${actions}</div>
      <div class="small muted">Consumables can be bound to Z or X. Equipment changes apply immediately; comparison lines show gains and losses against your equipped item.</div>
    </div>
  </div>`;
}

function shopRow(session: GameSession, itemId: string): string {
  const def = getItem(itemId);
  const stats = statLines(def.stats).slice(0, 2).join(" · ");
  const canAfford = session.save.gold >= (def.buy ?? 0);
  return `<div class="shop-row">
    ${itemIconHtml(def.icon, 30)}
    <div>
      <div class="name rarity-${def.rarity}">${esc(def.name)}</div>
      <div class="sub">${stats || esc(def.description.slice(0, 46))}</div>
    </div>
    <div style="display:grid;gap:5px;justify-items:end">
      <span class="gold-line">${def.buy ?? "-"} g</span>
      <button class="btn small" data-action="buy" data-item="${def.id}" ${canAfford ? "" : "disabled"}>Buy</button>
    </div>
  </div>`;
}

function forgeSectionHtml(session: GameSession): string {
  const equipSlots: (keyof CharacterSave["equipment"])[] = ["weapon", "armor", "helm", "boots", "trinket"];
  const upgrades = equipSlots
    .map((slot) => {
      const stack = session.save.equipment[slot];
      if (!stack) return "";
      const cost = session.upgradeCost(slot);
      return `<div class="forge-row">
        ${itemIconHtml(getItem(stack.itemId).icon, 26)}
        <div>
          <div class="name">${esc(itemDisplayName(stack))}</div>
          <div class="sub">${cost ? `${cost.gold} gold · ${cost.ore}x Iron Ore` : "Masterwork"}</div>
        </div>
        <button class="btn small" data-action="upgrade-slot" data-slot="${slot}" ${cost ? "" : "disabled"}>${cost ? `Upgrade +${cost.next}` : `+${MAX_UPGRADE}`}</button>
      </div>`;
    })
    .join("");
  const recipes = RECIPES.map((recipe) => {
    const materials = recipe.materials.map((material) => `${session.countItem(material.itemId)}/${material.qty} ${esc(getItem(material.itemId).name)}`).join(" · ");
    const canCraft = session.save.gold >= recipe.gold && recipe.materials.every((material) => session.countItem(material.itemId) >= material.qty) && session.canAdd(recipe.resultItemId, 1);
    return `<div class="forge-row">
      ${itemIconHtml(getItem(recipe.resultItemId).icon, 26)}
      <div>
        <div class="name">${esc(recipe.name)}</div>
        <div class="sub">${materials} · ${recipe.gold}g</div>
        <div class="sub muted">Gather in ${esc(recipe.zone)}</div>
      </div>
      <button class="btn small" data-action="craft" data-recipe="${recipe.id}" ${canCraft ? "" : "disabled"}>Craft</button>
    </div>`;
  }).join("");
  return `<div class="forge-section">
    <div class="section-title">Borin's Forge · Upgrade equipment</div>
    <div class="forge-list">${upgrades || `<div class="small muted">Equip a weapon or armor to upgrade it.</div>`}</div>
    <div class="section-title" style="margin-top:14px">Crafting recipes</div>
    <div class="forge-list">${recipes}</div>
  </div>`;
}

export function shopPanelHtml(session: GameSession, shopId: string): string {
  const shop = SHOPS[shopId];
  if (!shop) return `<div class="empty-state">This shop is closed.</div>`;
  const buy = shop.itemIds.map((id) => shopRow(session, id)).join("");
  const sellGrid = session.save.inventory
    .map((stack, i) => {
      if (!stack) return `<div class="inv-slot empty"></div>`;
      const def = getItem(stack.itemId);
      return `<button class="inv-slot" data-action="sell-slot" data-slot="${i}" title="Sell ${esc(itemDisplayName(stack))} for ${itemSellValue(stack)}g">
        <span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%)">${itemIconHtml(def.icon, 32)}</span>
        ${stack.qty > 1 ? `<span class="qty">${stack.qty}</span>` : ""}
      </button>`;
    })
    .join("");
  return `<div class="shop-columns">
    <div>
      <div class="section-title">${esc(shop.name)} · <span class="gold">${formatNumber(session.save.gold)} gold</span></div>
      <div class="shop-list">${buy}</div>
    </div>
    <div>
      <div class="section-title">Sell from backpack</div>
      <div class="inv-grid">${sellGrid}</div>
      <div class="small muted" style="margin-top:10px">Click an item to sell one. Equipped gear cannot be sold here.</div>
    </div>
  </div>
  ${shopId === "forge" ? forgeSectionHtml(session) : ""}`;
}

function objectiveRow(questId: string, progress: number, objectiveIndex: number): string {
  const quest = QUESTS[questId];
  const objective = quest?.objectives[objectiveIndex];
  if (!objective) return "";
  const count = "count" in objective ? objective.count : 1;
  const done = progress >= count;
  const text = questObjectiveText(
    objective,
    progress,
    (id) => MONSTERS[id]?.name ?? id,
    (id) => ITEMS[id]?.name ?? id,
  );
  return `<div class="objective ${done ? "done" : ""}">${done ? "✓" : "•"} ${esc(text)}</div>`;
}

export function questsPanelHtml(session: GameSession): string {
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
  const loreSection = `<div class="lore-section">
      <div class="qtitle">Records of the Fallen</div>
      <div class="small muted">${lore.length} of ${LORE_ENTRIES.length} entries uncovered.</div>
      ${loreRows}
    </div>`;
  if (active.length === 0) {
    return `<div class="empty-state">No quests yet. Talk to Captain Rowan in Eldoria Village, or Elara at the healers.</div>
      <div class="small muted">Active quests appear on the right side of your HUD. Completed objectives can be turned in at the quest giver.</div>
      ${loreSection}`;
  }
  const rows = active
    .map((state) => {
      const quest = QUESTS[state.id];
      const giver = NPCS[quest.giverNpc]?.name ?? quest.giverNpc;
      const objectives = quest.objectives.map((_, i) => objectiveRow(state.id, state.progress[i] ?? 0, i)).join("");
      const finished = state.completed && (quest.repeatable || state.completions === 0);
      return `<div class="quest-row ${finished ? "ready" : ""} ${state.completions > 0 ? "done" : ""}">
        <div class="qtitle">${esc(quest.name)}</div>
        <div class="qdesc">${esc(quest.description)}</div>
        ${objectives}
        <div class="small muted">Giver: ${esc(giver)} · ${quest.rewards.xp} XP · ${quest.rewards.gold} gold${state.completions > 0 ? ` · completed x${state.completions}` : ""}</div>
        ${finished ? `<div class="qready">Ready to turn in.</div>` : ""}
      </div>`;
    })
    .join("");
  return `<div style="display:grid;gap:10px">${rows}</div>
    ${loreSection}
    <div class="small muted">Tip: quests with collect objectives count items in your backpack. Selling them before turning in can undo progress.</div>`;
}

/** Pick an NPC line that fits the player's level, accepted quests and beaten bosses. */
function npcDialogueFor(session: GameSession, npcId: string): string {
  const npc = NPCS[npcId];
  if (!npc || npc.dialogue.length === 0) return "";
  const save = session.save;
  // Once a New Game+ cycle has begun, each NPC remembers the earlier runs.
  if (save.ngPlus > 0 && NG_PLUS_DIALOGUE[npcId]) return NG_PLUS_DIALOGUE[npcId];
  const hasBoss = save.defeatedBosses.length > 0;
  const hasQuest = save.quests.some((q) => !q.completed);
  const lines = npc.dialogue;
  // Later lines are for players who have progressed further.
  if (hasBoss && lines.length > 2) return lines[2];
  if (hasQuest && lines.length > 1) return lines[1];
  if (save.level >= 5 && lines.length > 1) return lines[1];
  return lines[0];
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
        const label = claimed ? `${claimed.icon ?? "🎁"} Reward claimed` : "Reward claimed";
        action = `<span class="small muted">${esc(label)} - final</span>`;
      }
      else if (entry.canTurnIn && quest.choose) {
        action = `<div class="gift-list">${quest.choose
          .map((option, i) => {
            const items = (option.items ?? []).map((it) => `${it.qty}x ${it.itemId.replace(/_/g, " ")}`);
            const parts = [`${option.xp} XP`, `${option.gold} gold`, ...items];
            const icon = option.icon ?? "🎁";
            return `<button class="btn small" data-action="pick-reward" data-quest="${entry.questId}" data-index="${i}">${icon} ${esc(parts.join(" · "))}</button>`;
          })
          .join("")}</div>`;
      }
      else if (entry.canTurnIn) action = `<button class="btn small" data-action="turnin-quest" data-quest="${entry.questId}">${t("btnTurnIn")}</button>`;
      else if (state && state.completed && state.completions > 0 && !quest.repeatable) action = `<span class="small muted">Completed</span>`;
      else if (state) action = `<span class="small muted">In progress</span>`;
      else action = `<span class="small muted">Requires level ${entry.level}</span>`;
      return `<div class="quest-row ${entry.canTurnIn ? "ready" : ""}">
        <div class="qtitle">${esc(quest.name)} <span class="muted" style="font-size:8px">Lv ${entry.level}</span></div>
        <div class="qdesc">${esc(quest.description)}</div>
        ${objectives}
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          ${action}
          <span class="small muted">${quest.rewards.xp} XP · ${quest.rewards.gold} gold</span>
        </div>
      </div>`;
    })
    .join("");
  const choices = `<div class="gift-list">
    <button class="btn small" data-action="npc-choice" data-npc="${npc.id}" data-choice="kind">💬 Kind words</button>
    <button class="btn small" data-action="npc-choice" data-npc="${npc.id}" data-choice="rude">😠 Rude remark</button>
  </div>`;
  const trainer = npc.trainer
    ? `<div>
        <div class="section-title">Training</div>
        <div style="display:grid;gap:5px">
          ${session.classInfo.abilities.map((ability) => `<div class="stat-line"><span>${esc(ability.name)}</span><span>${session.save.level >= ability.unlockLevel ? "Unlocked" : `Level ${ability.unlockLevel}`}</span></div>`).join("")}
        </div>
        <div class="small muted" style="margin-top:8px">Talents are chosen with T. Master Kael can reset them for ${session.respecCost() || 0} gold.</div>
        <button class="btn ghost small" data-action="respec-talents" ${session.save.talents.length > 0 ? "" : "disabled"}>Reset talents${session.respecCost() > 0 ? ` · ${session.respecCost()}g` : ""}</button>
        ${session.canNewGamePlus() ? `<div class="small muted" style="margin-top:8px">The Hollow King has fallen. A harsher cycle awaits.</div><button class="btn small" data-action="new-game-plus">Begin New Game+ ${session.save.ngPlus + 1}</button>` : ""}
      </div>`
    : "";
  return `<div class="npc-head">
    ${charIconHtml(npc.sprite, 56)}
    <div>
      <h2 style="font-size:14px;color:${esc(npc.color)}">${esc(npc.name)}</h2>
      <div class="muted">${esc(npc.role)}</div>
    </div>
  </div>
  <div class="dialogue">"${esc(dialogue)}"</div>
  ${choices}
  ${questRows ? `<div style="display:grid;gap:9px"><div class="section-title">Quests</div>${questRows}</div>` : ""}
  ${trainer}
  <div style="display:flex;gap:8px;flex-wrap:wrap">
    ${npc.shop ? `<button class="btn" data-action="open-shop" data-shop="${npc.shop}">Browse ${esc(SHOPS[npc.shop]?.name ?? "shop")}</button>` : ""}
    ${npc.healer ? `<button class="btn" data-action="heal" ${session.healCost() > 0 ? "" : "disabled"}>${t("btnHeal", { cost: session.healCost() })}</button>` : ""}
    <button class="btn ghost" data-action="close-panel">${t("btnLeave")}</button>
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
          return `<button class="talent-choice ${selected ? "selected" : ""} ${locked ? "locked" : ""}" data-action="learn-talent" data-talent="${esc(choice.id)}" ${locked || chosen ? "disabled" : ""}>
            <span class="talent-choice-head"><b>${esc(choice.name)}</b><span>${locked ? `Lv ${choice.level}` : selected ? "Chosen" : taken ? "Locked" : "Available"}</span></span>
            <span class="talent-choice-desc">${esc(choice.description)}</span>
          </button>`;
        })
        .join("");
      return `<div class="talent-tier ${save.level >= tier.level ? "unlocked" : "locked"}">
        <div class="talent-tier-label">Tier ${tier.level}${save.level < tier.level ? ` · requires level ${tier.level}` : ""}</div>
        <div class="talent-choices">${choices}</div>
      </div>`;
    })
    .join("");
  return `<div class="talent-passive">
      <div class="section-title">${esc(passive.name)} · Class passive</div>
      <div class="small muted">${esc(passive.description)} ${esc(passive.stats ? Object.entries(passive.stats).map(([key, value]) => `+${key === "crit" ? `${Math.round(Number(value) * 100)}%` : Math.round(Number(value))} ${key}`).join(", ") : "")}</div>
    </div>
    <div class="small muted" style="margin-bottom:10px">Choose one talent at levels 5, 10, 15, 20, and 30. Choices are permanent until Master Kael resets them.</div>
    <div class="talent-tiers">${tiers}</div>`;
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
    <div class="setting-row">
      <div><strong>Sound</strong><div class="small muted">Synthesized effects and procedural music</div></div>
      <div class="settings-controls">
        <label class="small">Effects
          <input type="range" id="volume-range" min="0" max="100" value="${Math.round(volume * 100)}" />
        </label>
        <label class="small">Music
          <input type="range" id="music-range" min="0" max="100" value="${Math.round(musicVolume * 100)}" />
        </label>
        <label class="small"><input type="checkbox" id="mute-toggle" ${muted ? "checked" : ""} /> Mute effects</label>
      </div>
    </div>
    <div class="setting-row">
      <div><strong>Interface</strong><div class="small muted">Scale text and HUD without changing the world</div></div>
      <div class="settings-controls">
        <label class="small">UI scale
          <select id="ui-scale">
            <option value="1" ${preferences.uiScale === 1 ? "selected" : ""}>100%</option>
            <option value="1.25" ${preferences.uiScale === 1.25 ? "selected" : ""}>125%</option>
            <option value="1.5" ${preferences.uiScale === 1.5 ? "selected" : ""}>150%</option>
          </select>
        </label>
        <label class="small"><input type="checkbox" id="contrast-toggle" ${preferences.highContrast ? "checked" : ""} /> High contrast</label>
        <label class="small"><input type="checkbox" id="motion-toggle" ${preferences.reducedMotion ? "checked" : ""} /> Reduce motion</label>
        <label class="small"><input type="checkbox" id="damage-toggle" ${preferences.showDamage ? "checked" : ""} /> Floating damage</label>
        <label class="small"><input type="checkbox" id="shake-toggle" ${preferences.screenShake ? "checked" : ""} /> Screen shake</label>
        <label class="small"><input type="checkbox" id="touch-toggle" ${preferences.touchControls ? "checked" : ""} /> Touch controls</label>
        <label class="small">Camera zoom
          <select id="zoom-select">
            <option value="1.5" ${preferences.cameraZoom === 1.5 ? "selected" : ""}>Wide</option>
            <option value="2" ${preferences.cameraZoom === 2 ? "selected" : ""}>Normal</option>
            <option value="2.5" ${preferences.cameraZoom === 2.5 ? "selected" : ""}>Close</option>
          </select>
        </label>
        <label class="small">Effect size
          <select id="effect-select">
            <option value="0.5" ${preferences.effectIntensity === 0.5 ? "selected" : ""}>Subtle</option>
            <option value="1" ${preferences.effectIntensity === 1 ? "selected" : ""}>Normal</option>
            <option value="1.5" ${preferences.effectIntensity === 1.5 ? "selected" : ""}>Bold</option>
          </select>
        </label>
        <label class="small">Brightness
          <select id="brightness-select">
            <option value="1" ${preferences.brightness === 1 ? "selected" : ""}>Normal</option>
            <option value="1.2" ${preferences.brightness === 1.2 ? "selected" : ""}>Brighter</option>
            <option value="1.4" ${preferences.brightness === 1.4 ? "selected" : ""}>Brightest</option>
          </select>
        </label>
        <label class="small">Language
          <select id="language-select">
            <option value="en" ${preferences.language === "en" ? "selected" : ""}>English</option>
            <option value="tl" ${preferences.language === "tl" ? "selected" : ""}>Tagalog</option>
          </select>
        </label>
        <button class="btn ghost small" data-action="reset-tutorial">${t("btnShowTutorial")}</button>
      </div>
    </div>
    <div class="setting-row">
      <div><strong>Keybinds</strong><div class="small muted">Click a binding, then press a key. Arrow keys always move.</div></div>
      <div class="keybind-grid">
        ${(Object.keys(KEYBIND_LABELS) as KeybindAction[]).map((action) => `<button class="keybind-btn ${rebinding === action ? "listening" : ""}" data-action="rebind-key" data-key="${action}"><span>${KEYBIND_LABELS[action]}</span><b>${rebinding === action ? "Press a key" : preferences.keybinds[action]}</b></button>`).join("")}
        <button class="btn ghost small" data-action="reset-keys">${t("btnResetKeybinds")}</button>
      </div>
      <div class="small muted">If two actions share a key, the new key is refused and the message says which action already has it.</div>
    </div>
    <div class="setting-row">
      <div><strong>Gamepad buttons</strong><div class="small muted">Click a button, then press the gamepad button you want. Sticks always move and aim.</div></div>
      <div class="keybind-grid">
        ${(Object.keys(KEYBIND_LABELS) as KeybindAction[]).map((action) => `<button class="keybind-btn ${padListening === action ? "listening" : ""}" data-action="rebind-pad" data-key="${action}"><span>${KEYBIND_LABELS[action]}</span><b>${padListening === action ? "Press a button" : `Button ${preferences.padBinds[action]}`}</b></button>`).join("")}
        <button class="btn ghost small" data-action="reset-pad">${t("btnResetGamepad")}</button>
      </div>
    </div>
    ${session ? `<div class="setting-row">
      <div><strong>Difficulty</strong><div class="small muted">Story is forgiving, Nightmare is brutal. Change it any time while alive.</div></div>
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
      <div><strong>${esc(session.save.name)}</strong><div class="small muted">${classInfo?.name} · Level ${session.save.level} · ${esc(session.zone.name)}</div></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn ghost small" data-action="export-current">${t("btnExportHero")}</button>
        <button class="btn ghost small" data-action="export-all">${t("btnExportAll")}</button>
        <button class="btn ghost small" data-action="import-file">${t("btnImportSaves")}</button>
        <button class="btn ghost small" data-action="return-menu">${t("btnCharacterSelect")}</button>
        <button class="btn danger small" data-action="delete-current">${t("btnDeleteHero")}</button>
      </div>
    </div>` : ""}
    <div>
      <div class="section-title">Controls</div>
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

export function itemRarityOrder(rarity: string): number {
  return RARITY_ORDER.indexOf(rarity);
}
