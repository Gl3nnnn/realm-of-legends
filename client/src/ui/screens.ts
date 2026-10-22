import {
  CLASS_LIST,
  FLAGSHIP_CLASSES,
  ITEMS,
  MAX_CHARACTERS,
  MONSTERS,
  NPCS,
  QUESTS,
  SHOPS,
  ZONES,
  canClassUse,
  getClass,
  getItem,
  isEquippable,
  type CharacterSave,
  type ClassId,
  type GameSession,
  type ItemStack,
} from "@realm/core";
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
            <button class="btn small" data-action="play" data-id="${esc(save.id)}">Play</button>
            <button class="btn ghost small" data-action="export-save" data-id="${esc(save.id)}">Export</button>
            <button class="btn ghost small" data-action="delete-save" data-id="${esc(save.id)}">Delete</button>
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

export function createPanelHtml(selectedClass: ClassId): string {
  const cards = CLASS_LIST.map((def) => {
    const flagship = FLAGSHIP_CLASSES.includes(def.id);
    return `<button class="class-card ${def.id === selectedClass ? "selected" : ""}" data-action="select-class" data-class="${def.id}">
      ${classPortrait(def.id, 46)}
      <span>
        <span class="class-name">${esc(def.name)}</span>
        <span class="class-role">${esc(def.role)} · ${esc(def.difficulty)}</span>
        ${flagship ? `<span class="badge">Recommended</span>` : ""}
      </span>
    </button>`;
  }).join("");
  const def = getClass(selectedClass);
  return `<div class="create-top">
    <div class="field">
      <label for="char-name">Hero name</label>
      <input id="char-name" type="text" maxlength="16" autocomplete="off" spellcheck="false" placeholder="Enter a name..." />
      <div id="create-error" class="small" style="color:#ff9fa0;min-height:16px"></div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn" data-action="create-character">Enter Eldoria</button>
      <button class="btn ghost" data-action="cancel-create">Back</button>
    </div>
  </div>
  <div>
    <div class="section-title">Choose a class — ${esc(def.name)}</div>
    <div class="muted small" style="margin-bottom:10px">${esc(def.description)}</div>
    <div class="class-grid">${cards}</div>
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

function stackCell(stack: ItemStack | null, index: number, selected: boolean): string {
  if (!stack) return `<button class="inv-slot empty" data-slot="${index}" aria-label="Empty slot"></button>`;
  const def = getItem(stack.itemId);
  return `<button class="inv-slot ${selected ? "selected" : ""}" data-slot="${index}" title="${esc(def.name)}">
    <span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%)">${itemIconHtml(def.icon, 32)}</span>
    ${stack.qty > 1 ? `<span class="qty">${stack.qty}</span>` : ""}
  </button>`;
}

export function inventoryPanelHtml(session: GameSession, selectedSlot: number | null, selectedEquip: string | null): string {
  const save = session.save;
  const grid = save.inventory.map((stack, i) => stackCell(stack, i, selectedSlot === i)).join("");
  const equipSlots: (keyof CharacterSave["equipment"])[] = ["weapon", "armor", "helm", "boots", "trinket"];
  const equipment = equipSlots
    .map((slot) => {
      const stack = save.equipment[slot];
      const def = stack ? getItem(stack.itemId) : null;
      return `<button class="equip-slot ${stack ? "filled" : ""}" data-equip="${slot}" title="${def ? esc(def.name) : `Empty ${slot} slot`}">
        ${stack ? itemIconHtml(def!.icon, 34) : `<span style="font-size:16px;color:#5f5668">·</span>`}
        <span>${slot}</span>
      </button>`;
    })
    .join("");
  const stack = selectedEquip ? save.equipment[selectedEquip as keyof CharacterSave["equipment"]] ?? null : selectedSlot !== null ? save.inventory[selectedSlot] : null;
  let actions = "";
  if (stack && selectedEquip) {
    actions = `<button class="btn small" data-action="unequip" data-slot="${selectedEquip}">Unequip</button>`;
  } else if (stack && selectedSlot !== null) {
    const def = getItem(stack.itemId);
    if (def.type === "consumable") actions += `<button class="btn small" data-action="use" data-slot="${selectedSlot}">Use</button>`;
    if (isEquippable(def)) {
      const usable = canClassUse(def, save.classId);
      actions += `<button class="btn small" data-action="equip" data-slot="${selectedSlot}" ${usable ? "" : "disabled"}>Equip</button>`;
      if (!usable) actions += `<span class="small" style="color:#ff9fa0;align-self:center">Not usable by ${esc(getClass(save.classId).name)}</span>`;
    }
    actions += `<button class="btn ghost small" data-action="sell" data-slot="${selectedSlot}">Sell for ${def.sell}g</button>`;
  }
  return `<div class="panel-columns">
    <div style="display:grid;gap:16px">
      <div>
        <div class="section-title">Backpack · ${formatNumber(save.gold)} gold</div>
        <div class="inv-grid">${grid}</div>
      </div>
      <div>
        <div class="section-title">Equipped</div>
        <div class="equip-grid">${equipment}</div>
      </div>
    </div>
    <div style="display:grid;gap:12px;align-content:start">
      ${itemDetailHtml(stack)}
      <div class="detail-actions">${actions}</div>
      <div class="small muted">Potions can be used from here or bound to your quick bar later. Equipment changes apply immediately.</div>
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

export function shopPanelHtml(session: GameSession, shopId: string): string {
  const shop = SHOPS[shopId];
  if (!shop) return `<div class="empty-state">This shop is closed.</div>`;
  const buy = shop.itemIds.map((id) => shopRow(session, id)).join("");
  const sellGrid = session.save.inventory
    .map((stack, i) => {
      if (!stack) return `<div class="inv-slot empty"></div>`;
      const def = getItem(stack.itemId);
      return `<button class="inv-slot" data-action="sell-slot" data-slot="${i}" title="Sell ${esc(def.name)} for ${def.sell}g">
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
  </div>`;
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
  if (active.length === 0) {
    return `<div class="empty-state">No quests yet. Talk to Captain Rowan in Eldoria Village, or Elara at the healers.</div>
      <div class="small muted">Active quests appear on the right side of your HUD. Completed objectives can be turned in at the quest giver.</div>`;
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
    <div class="small muted">Tip: quests with collect objectives count items in your backpack. Selling them before turning in can undo progress.</div>`;
}

export function npcPanelHtml(session: GameSession, npcId: string): string {
  const npc = NPCS[npcId];
  if (!npc) return `<div class="empty-state">This person is not here.</div>`;
  const dialogue = npc.dialogue[session.save.id.length % npc.dialogue.length] ?? npc.dialogue[0] ?? "";
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
      if (entry.available) action = `<button class="btn small" data-action="accept-quest" data-quest="${entry.questId}">Accept quest</button>`;
      else if (entry.canTurnIn) action = `<button class="btn small" data-action="turnin-quest" data-quest="${entry.questId}">Turn in</button>`;
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
  const trainer = npc.trainer
    ? `<div>
        <div class="section-title">Training</div>
        <div style="display:grid;gap:5px">
          ${session.classInfo.abilities.map((ability) => `<div class="stat-line"><span>${esc(ability.name)}</span><span>${session.save.level >= ability.unlockLevel ? "Unlocked" : `Level ${ability.unlockLevel}`}</span></div>`).join("")}
        </div>
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
  ${questRows ? `<div style="display:grid;gap:9px"><div class="section-title">Quests</div>${questRows}</div>` : ""}
  ${trainer}
  <div style="display:flex;gap:8px;flex-wrap:wrap">
    ${npc.shop ? `<button class="btn" data-action="open-shop" data-shop="${npc.shop}">Browse ${esc(SHOPS[npc.shop]?.name ?? "shop")}</button>` : ""}
    ${npc.healer ? `<button class="btn" data-action="heal" ${session.healCost() > 0 ? "" : "disabled"}>Heal for ${session.healCost()} gold</button>` : ""}
    <button class="btn ghost" data-action="close-panel">Leave</button>
  </div>`;
}

export function settingsPanelHtml(session: GameSession | null, volume: number, muted: boolean): string {
  const classInfo = session ? getClass(session.save.classId) : null;
  return `<div class="settings-grid">
    <div class="setting-row">
      <div><strong>Sound</strong><div class="small muted">Synthesized chiptune effects</div></div>
      <div style="display:flex;align-items:center;gap:10px">
        <input type="range" id="volume-range" min="0" max="100" value="${Math.round(volume * 100)}" />
        <label class="small"><input type="checkbox" id="mute-toggle" ${muted ? "checked" : ""} /> Mute</label>
      </div>
    </div>
    ${session ? `<div class="setting-row">
      <div><strong>${esc(session.save.name)}</strong><div class="small muted">${classInfo?.name} · Level ${session.save.level} · ${esc(session.zone.name)}</div></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn ghost small" data-action="export-current">Export hero</button>
        <button class="btn ghost small" data-action="export-all">Export all</button>
        <button class="btn ghost small" data-action="import-file">Import saves</button>
        <button class="btn ghost small" data-action="return-menu">Character select</button>
        <button class="btn danger small" data-action="delete-current">Delete hero</button>
      </div>
    </div>` : ""}
    <div>
      <div class="section-title">Controls</div>
      <div class="controls-help">
        <span>WASD / Arrows — move</span>
        <span>Left click / Space — basic attack</span>
        <span>1-5 — class abilities</span>
        <span>E — interact / portal / chest</span>
        <span>I — inventory</span>
        <span>Q — quests</span>
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
