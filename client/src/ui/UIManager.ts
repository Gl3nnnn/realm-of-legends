import {
  MAX_CHARACTERS,
  MONSTERS,
  NPCS,
  QUESTS,
  SHOPS,
  createCharacter,
  getItem,
  migrateSave,
  portraitFrame,
  xpToNext,
  type CharacterSave,
  type ClassId,
  type GameSession,
  type SimEvent,
} from "@realm/core";
import type { Sfx } from "../audio/sfx";
import { downloadJson, readJsonFile, type SaveRepository } from "../persistence/db";
import { classColor, esc, formatNumber, questObjectiveText } from "./helpers";
import {
  abilityBarHtml,
  characterSelectHtml,
  createPanelHtml,
  inventoryPanelHtml,
  npcPanelHtml,
  questsPanelHtml,
  settingsPanelHtml,
  shopPanelHtml,
} from "./screens";

type PanelState =
  | { kind: "inventory" }
  | { kind: "quests" }
  | { kind: "settings" }
  | { kind: "npc"; id: string }
  | { kind: "shop"; id: string };

interface UIOptions {
  repo: SaveRepository;
  sfx: Sfx;
  onPlay: (save: CharacterSave) => void | Promise<void>;
  onExitToMenu: () => void;
}

const IMPORTS_MAX_BYTES = 2 * 1024 * 1024;
const AUTOSAVE_MS = 30_000;

function must<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing UI element #${id}`);
  return el as T;
}

export class UIManager {
  private readonly repo: SaveRepository;
  private readonly sfx: Sfx;
  private readonly onPlay: UIOptions["onPlay"];
  private readonly onExitToMenu: () => void;

  private session: GameSession | null = null;
  private panel: PanelState | null = null;
  private saves: CharacterSave[] = [];
  private selectedClass: ClassId = "warrior";
  private selectedSlot: number | null = null;
  private selectedEquip: string | null = null;

  private abilitySignature = "";
  private questSignature = "";
  private buffSignature = "";
  private minimapZone: string | null = null;
  private minimapBase: HTMLCanvasElement | null = null;
  private lastHud = 0;
  private lastMinimap = 0;
  private lastHitSound = 0;
  private lastCoinSound = 0;
  private lastPickupSound = 0;
  private persistTimer: number | null = null;

  private readonly dom = {
    boot: must("boot-screen"),
    charSelect: must("char-select"),
    saveList: must("save-list"),
    createPanel: must("create-panel"),
    saveCount: must("save-count"),
    hud: must("hud"),
    overlay: must("overlay"),
    toasts: must("toasts"),
    abilityBar: must("ability-bar"),
    prompt: must("interact-prompt"),
    log: must("combat-log"),
    questTracker: must("quest-tracker"),
    buffBar: must("buff-bar"),
    bossBar: must("boss-bar"),
    bossName: must("boss-name"),
    bossFill: must("boss-fill"),
    death: must("death-overlay"),
    deathTimer: must("death-timer"),
    minimap: must<HTMLCanvasElement>("minimap"),
    portrait: must("hud-portrait"),
    name: must("hud-name"),
    level: must("hud-level"),
    classLabel: must("hud-class"),
    hpFill: must("hp-fill"),
    hpText: must("hp-text"),
    resFill: must("res-fill"),
    resText: must("res-text"),
    xpFill: must("xp-fill"),
    xpText: must("xp-text"),
    zone: must("hud-zone"),
    safe: must("hud-safe"),
    gold: must("hud-gold"),
    importFile: must<HTMLInputElement>("import-file"),
  };

  constructor(options: UIOptions) {
    this.repo = options.repo;
    this.sfx = options.sfx;
    this.onPlay = options.onPlay;
    this.onExitToMenu = options.onExitToMenu;
    this.bindEvents();

    window.setInterval(() => {
      if (this.session && !this.session.dead) void this.persist();
    }, AUTOSAVE_MS);
  }

  get modalOpen(): boolean {
    return this.panel !== null;
  }

  private async renderSelect(): Promise<void> {
    try {
      this.saves = await this.repo.list();
    } catch {
      this.dom.saveList.innerHTML = `<div class="empty-state">Could not open browser storage. Private browsing may block IndexedDB. Try a normal window.</div>`;
      return;
    }
    this.dom.saveList.innerHTML = characterSelectHtml(this.saves);
    this.dom.saveCount.textContent = `${this.saves.length}/${MAX_CHARACTERS} heroes`;
  }

  async showCharacterSelect(): Promise<void> {
    this.session = null;
    this.closePanel(false);
    this.dom.hud.classList.add("hidden");
    this.dom.boot.classList.add("hidden");
    this.dom.charSelect.classList.remove("hidden");
    this.dom.death.classList.add("hidden");
    this.dom.log.innerHTML = "";
    await this.renderSelect();
  }

  attachSession(session: GameSession): void {
    this.session = session;
    this.panel = null;
    this.dom.overlay.classList.add("hidden");
    this.dom.overlay.innerHTML = "";
    this.dom.charSelect.classList.add("hidden");
    this.dom.boot.classList.add("hidden");
    this.dom.hud.classList.remove("hidden");
    this.selectedSlot = null;
    this.selectedEquip = null;
    this.abilitySignature = "";
    this.questSignature = "";
    this.buffSignature = "";
    this.minimapZone = null;
    this.logLines = [];
    this.dom.log.innerHTML = "";

    const def = session.classInfo;
    this.dom.portrait.style.borderColor = classColor(def.id);
    const frame = portraitFrame(def.sprite);
    this.dom.portrait.style.backgroundImage = `url('${import.meta.env.BASE_URL}assets/portraits.png')`;
    this.dom.portrait.style.backgroundSize = "320px auto";
    this.dom.portrait.style.backgroundPosition = `-${frame.col * 64}px -${frame.row * 64}px`;
    this.dom.name.textContent = session.save.name;
    this.dom.classLabel.textContent = `${def.name} · ${def.role}`;
    const resourceBar = this.dom.resFill.parentElement;
    if (resourceBar) {
      resourceBar.classList.remove("rage", "energy");
      if (def.resource === "rage") resourceBar.classList.add("rage");
      if (def.resource === "energy") resourceBar.classList.add("energy");
    }
    this.rebuildAbilityBar();
    this.pushLog(`Entered ${session.zone.name}.`, "info");
    this.updateHud(true);
    this.schedulePersist();
  }

  private bindEvents(): void {
    this.dom.saveList.addEventListener("click", (event) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>("[data-action]");
      if (!target) return;
      void this.onSelectAction(target.dataset.action ?? "", target.dataset.id ?? "", target.dataset.class as ClassId | undefined);
    });

    this.dom.createPanel.addEventListener("click", (event) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>("[data-action]");
      if (!target) return;
      const action = target.dataset.action ?? "";
      if (action === "select-class" && target.dataset.class) {
        const currentName = (this.dom.createPanel.querySelector<HTMLInputElement>("#char-name")?.value) ?? "";
        this.selectedClass = target.dataset.class as ClassId;
        this.renderCreate(currentName);
        this.sfx.ui();
      } else if (action === "cancel-create") {
        this.dom.createPanel.classList.add("hidden");
        this.dom.saveList.classList.remove("hidden");
        this.sfx.ui();
      } else if (action === "create-character") {
        void this.createHero();
      }
    });

    must("btn-import-save").addEventListener("click", () => this.dom.importFile.click());
    this.dom.importFile.addEventListener("change", () => {
      const file = this.dom.importFile.files?.[0];
      this.dom.importFile.value = "";
      if (file) void this.importFile(file);
    });

    this.dom.abilityBar.addEventListener("click", (event) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>("[data-cast]");
      const cast = target?.dataset.cast;
      if (!cast) return;
      this.sfx.ui();
      window.dispatchEvent(new CustomEvent("realm:cast", { detail: cast }));
    });

    for (const button of Array.from(document.querySelectorAll<HTMLElement>("[data-panel]"))) {
      button.addEventListener("click", () => this.openPanel(button.dataset.panel as PanelState["kind"]));
    }

    this.dom.overlay.addEventListener("click", (event) => {
      if (event.target === this.dom.overlay) {
        this.closePanel();
        return;
      }
      const target = (event.target as HTMLElement).closest<HTMLElement>("[data-action]");
      if (!target) {
        const equip = (event.target as HTMLElement).closest<HTMLElement>("[data-equip]");
        if (equip && this.panel?.kind === "inventory") {
          this.selectedEquip = equip.dataset.equip ?? null;
          this.selectedSlot = null;
          this.renderPanel();
          return;
        }
        const slot = (event.target as HTMLElement).closest<HTMLElement>("[data-slot]");
        if (slot && this.panel?.kind === "inventory") {
          this.selectedSlot = Number(slot.dataset.slot);
          if (Number.isNaN(this.selectedSlot)) this.selectedSlot = null;
          this.selectedEquip = null;
          this.renderPanel();
        }
        return;
      }
      void this.onPanelAction(target.dataset.action ?? "", target);
    });

    this.dom.overlay.addEventListener("input", (event) => {
      const input = event.target as HTMLInputElement;
      if (input.id === "volume-range") this.sfx.setVolume(Number(input.value) / 100);
    });
    this.dom.overlay.addEventListener("change", (event) => {
      const input = event.target as HTMLInputElement;
      if (input.id === "mute-toggle") this.sfx.setMuted(input.checked);
      if (input.id === "settings-import" && input.files?.[0]) {
        const file = input.files[0];
        input.value = "";
        void this.importFile(file);
      }
    });

    window.addEventListener("keydown", (event) => this.onKeyDown(event));
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) void this.persist();
    });
    window.addEventListener("beforeunload", () => {
      if (this.session && !this.session.dead) void this.repo.put(this.session.snapshot()).catch(() => undefined);
    });
    window.addEventListener("pointerdown", () => this.sfx.resume(), { once: true });
    window.addEventListener("keydown", () => this.sfx.resume(), { once: true });
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.repeat) return;
    const tag = (event.target as HTMLElement | null)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") {
      if (event.key === "Escape") (event.target as HTMLElement).blur();
      return;
    }
    if (!this.dom.charSelect.classList.contains("hidden")) {
      if (event.key === "Escape" && !this.dom.createPanel.classList.contains("hidden")) {
        this.dom.createPanel.classList.add("hidden");
        this.dom.saveList.classList.remove("hidden");
      }
      return;
    }
    if (!this.session) return;
    if (event.key === "Escape") {
      event.preventDefault();
      if (this.panel) this.closePanel();
      else if (!this.session.dead) this.openPanel("settings");
      return;
    }
    if (this.panel) return;
    if (event.key === "i" || event.key === "I") {
      event.preventDefault();
      this.openPanel("inventory");
    } else if (event.key === "q" || event.key === "Q") {
      event.preventDefault();
      this.openPanel("quests");
    }
  }

  private async onSelectAction(action: string, id: string, classId?: ClassId): Promise<void> {
    if (action === "new-character") {
      this.selectedClass = "warrior";
      this.renderCreate("");
      this.dom.createPanel.classList.remove("hidden");
      this.dom.saveList.classList.add("hidden");
      this.sfx.ui();
      return;
    }
    if (action === "select-class" && classId) {
      this.selectedClass = classId;
      this.renderCreate("");
      return;
    }
    if (!id) return;
    const save = this.saves.find((s) => s.id === id) ?? (await this.repo.get(id));
    if (!save) {
      this.toast("That hero could not be found.", "bad");
      return;
    }
    if (action === "play") {
      this.sfx.ui();
      this.dom.charSelect.classList.add("hidden");
      try {
        await this.onPlay(save);
      } catch {
        this.dom.charSelect.classList.remove("hidden");
        this.toast("Could not start that hero.", "bad");
      }
    } else if (action === "export-save") {
      downloadJson(`realm-${save.name.replace(/[^a-z0-9_-]+/gi, "-")}.json`, save);
      this.toast("Save exported.", "good");
    } else if (action === "delete-save") {
      if (!window.confirm(`Delete ${save.name}? This cannot be undone.`)) return;
      await this.repo.delete(save.id);
      this.toast(`${save.name} was deleted.`, "info");
      await this.renderSelect();
    }
  }

  private renderCreate(name: string): void {
    this.dom.createPanel.innerHTML = createPanelHtml(this.selectedClass);
    const input = this.dom.createPanel.querySelector<HTMLInputElement>("#char-name");
    if (input) {
      input.value = name;
      input.focus();
      input.setSelectionRange(name.length, name.length);
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") void this.createHero();
      });
    }
  }

  private async createHero(): Promise<void> {
    const input = this.dom.createPanel.querySelector<HTMLInputElement>("#char-name");
    const error = this.dom.createPanel.querySelector<HTMLElement>("#create-error");
    const name = input?.value ?? "";
    try {
      const save = createCharacter(name, this.selectedClass);
      await this.repo.put(save);
      this.sfx.quest();
      this.dom.charSelect.classList.add("hidden");
      await this.onPlay(save);
    } catch (err) {
      if (error) error.textContent = err instanceof Error ? err.message : "Could not create that hero.";
    }
  }

  private async importFile(file: File): Promise<void> {
    if (file.size > IMPORTS_MAX_BYTES) {
      this.toast("That save file is too large.", "bad");
      return;
    }
    try {
      const data = await readJsonFile(file);
      const raw = Array.isArray(data)
        ? data
        : data && typeof data === "object" && Array.isArray((data as { saves?: unknown[] }).saves)
          ? (data as { saves: unknown[] }).saves
          : [data];
      let imported = 0;
      let failed = 0;
      const existing = await this.repo.count();
      for (const entry of raw.slice(0, MAX_CHARACTERS)) {
        if (existing + imported >= MAX_CHARACTERS) break;
        try {
          const save = migrateSave(entry);
          await this.repo.put(save);
          imported += 1;
        } catch {
          failed += 1;
        }
      }
      await this.renderSelect();
      this.toast(
        imported > 0 ? `Imported ${imported} save${imported === 1 ? "" : "s"}${failed ? `, ${failed} invalid` : ""}.` : "No valid saves found in that file.",
        imported > 0 ? "good" : "bad",
      );
      if (this.panel?.kind === "settings") this.renderPanel();
    } catch (err) {
      this.toast(err instanceof Error ? err.message : "Could not import that file.", "bad");
    }
  }

  openPanel(kind: PanelState["kind"], id?: string): void {
    if (!this.session && kind !== "settings") return;
    if (kind === "npc" && id) this.panel = { kind, id };
    else if (kind === "shop" && id) this.panel = { kind, id };
    else if (kind === "inventory") this.panel = { kind };
    else if (kind === "quests") this.panel = { kind };
    else this.panel = { kind: "settings" };
    this.selectedSlot = null;
    this.selectedEquip = null;
    this.renderPanel();
    this.sfx.ui();
  }

  closePanel(persist = true): void {
    if (!this.panel) return;
    this.panel = null;
    this.dom.overlay.classList.add("hidden");
    this.dom.overlay.innerHTML = "";
    this.updateHud(true);
    if (persist) this.schedulePersist();
  }

  private renderPanel(): void {
    if (!this.panel) return;
    let title = "Panel";
    let body = "";
    let narrow = false;
    if (this.panel.kind === "inventory" && this.session) {
      title = "Backpack & Equipment";
      body = inventoryPanelHtml(this.session, this.selectedSlot, this.selectedEquip);
    } else if (this.panel.kind === "quests" && this.session) {
      title = "Quest Journal";
      body = questsPanelHtml(this.session);
      narrow = true;
    } else if (this.panel.kind === "settings") {
      title = "Settings";
      body = settingsPanelHtml(this.session, this.sfx.currentVolume, this.sfx.isMuted);
      narrow = true;
    } else if (this.panel.kind === "npc" && this.session) {
      const npc = NPCS[this.panel.id];
      title = npc?.name ?? "Conversation";
      body = npcPanelHtml(this.session, this.panel.id);
      narrow = true;
    } else if (this.panel.kind === "shop") {
      title = SHOPS[this.panel.id]?.name ?? "Shop";
      body = this.session ? shopPanelHtml(this.session, this.panel.id) : "";
    }
    this.dom.overlay.innerHTML = `<section class="panel ${narrow ? "narrow" : ""}" role="document">
      <header class="panel-head"><h2>${esc(title)}</h2><button class="panel-close" data-action="close-panel" aria-label="Close">X</button></header>
      <div class="panel-body">${body}</div>
    </section>`;
    this.dom.overlay.classList.remove("hidden");
  }

  private async onPanelAction(action: string, target: HTMLElement): Promise<void> {
    if (action === "close-panel") {
      this.closePanel();
      return;
    }
    if (action === "export-current") {
      if (this.session) {
        const save = this.session.snapshot();
        downloadJson(`realm-${save.name.replace(/[^a-z0-9_-]+/gi, "-")}.json`, save);
        this.toast("Hero exported.", "good");
      }
      return;
    }
    if (action === "export-all") {
      const saves = await this.repo.list();
      downloadJson("realm-of-legends-saves.json", { version: 1, saves });
      this.toast(`Exported ${saves.length} save${saves.length === 1 ? "" : "s"}.`, "good");
      return;
    }
    if (action === "import-file") {
      const fileInput = this.dom.overlay.querySelector<HTMLInputElement>("#settings-import");
      fileInput?.click();
      return;
    }
    if (action === "return-menu") {
      await this.persist();
      this.closePanel(false);
      this.onExitToMenu();
      await this.showCharacterSelect();
      return;
    }
    if (action === "delete-current") {
      if (!this.session) return;
      const name = this.session.save.name;
      if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
      await this.repo.delete(this.session.save.id);
      this.closePanel(false);
      this.onExitToMenu();
      this.toast(`${name} was deleted.`, "info");
      await this.showCharacterSelect();
      return;
    }
    if (!this.session) return;
    const session = this.session;
    const slot = Number(target.dataset.slot ?? -1);
    let changed = false;

    if (this.panel?.kind === "inventory") {
      if (action === "use" && slot >= 0) changed = session.useItem(slot);
      else if (action === "equip" && slot >= 0) changed = session.equip(slot);
      else if (action === "sell" && slot >= 0) changed = session.sell(slot);
      else if (action === "unequip" && target.dataset.slot) {
        changed = session.unequip(target.dataset.slot as keyof CharacterSave["equipment"]);
      }
      if (!changed) this.selectedSlot = null;
      else {
        this.selectedSlot = null;
        this.selectedEquip = null;
        this.sfx.ui();
      }
      this.renderPanel();
    } else if (this.panel?.kind === "shop") {
      if (action === "buy" && target.dataset.item) {
        changed = session.buy(this.panel.id, target.dataset.item);
      } else if (action === "sell-slot" && slot >= 0) {
        changed = session.sell(slot);
      }
      if (changed) this.sfx.coin();
      this.renderPanel();
    } else if (this.panel?.kind === "npc") {
      if (action === "accept-quest" && target.dataset.quest) {
        changed = session.acceptQuest(target.dataset.quest);
        if (changed) this.sfx.quest();
      } else if (action === "turnin-quest" && target.dataset.quest) {
        changed = session.turnInQuest(target.dataset.quest);
        if (changed) this.sfx.level();
      } else if (action === "heal") {
        changed = session.healAtNpc();
        if (changed) this.sfx.heal();
      } else if (action === "open-shop" && target.dataset.shop) {
        this.openPanel("shop", target.dataset.shop);
        return;
      }
      this.renderPanel();
    }

    this.updateHud(true);
    if (changed) this.schedulePersist();
    this.handleEvents(session.drainEvents());
  }

  private rebuildAbilityBar(): void {
    if (!this.session) return;
    const signature = `${this.session.classInfo.id}:${this.session.save.level}`;
    if (signature === this.abilitySignature) return;
    this.abilitySignature = signature;
    this.dom.abilityBar.innerHTML = abilityBarHtml(this.session);
  }

  update(dt?: number): void {
    if (!this.session) return;
    const now = performance.now();
    if (now - this.lastHud > 80) {
      this.lastHud = now;
      this.updateHud();
    }
    if (now - this.lastMinimap > 170) {
      this.lastMinimap = now;
      this.drawMinimap();
    }
    if (dt !== undefined && this.session.dead) {
      this.dom.deathTimer.textContent = String(Math.max(0, Math.ceil(this.session.respawnTimer)));
    }
  }

  updateHud(_force = false): void {
    const session = this.session;
    if (!session) return;
    const save = session.save;
    const stats = session.stats;
    const hpPct = Math.max(0, Math.min(100, (save.hp / stats.maxHp) * 100));
    const resPct = Math.max(0, Math.min(100, (save.resource / stats.maxResource) * 100));
    const next = xpToNext(save.level);
    const xpPct = next <= 0 ? 100 : Math.max(0, Math.min(100, (save.xp / next) * 100));
    this.dom.hpFill.style.width = `${hpPct}%`;
    this.dom.hpText.textContent = `${Math.ceil(save.hp)} / ${stats.maxHp}`;
    this.dom.resFill.style.width = `${resPct}%`;
    this.dom.resText.textContent = `${Math.floor(save.resource)} / ${stats.maxResource}`;
    this.dom.xpFill.style.width = `${xpPct}%`;
    this.dom.xpText.textContent = next <= 0 ? "Max level" : `${formatNumber(save.xp)} / ${formatNumber(next)} XP`;
    this.dom.name.textContent = save.name;
    this.dom.level.textContent = `Lv ${save.level}`;
    this.dom.zone.textContent = session.zone.name;
    this.dom.safe.textContent = session.zone.safe ? "Safe" : "Hostile";
    this.dom.safe.classList.toggle("danger", !session.zone.safe);
    this.dom.gold.textContent = `${formatNumber(save.gold)} g`;
    this.rebuildAbilityBar();

    for (const ability of session.classInfo.abilities.slice(0, 5)) {
      const unlocked = save.level >= ability.unlockLevel;
      const button = this.dom.abilityBar.querySelector<HTMLElement>(`[data-cast="${ability.id}"]`);
      if (!button) continue;
      button.classList.toggle("no-resource", unlocked && save.resource < ability.cost);
      const overlay = button.querySelector<HTMLElement>(`[data-cd="${ability.id}"]`);
      if (overlay) {
        const remaining = session.abilityCooldown(ability.id);
        const pct = ability.cooldown > 0 ? Math.min(100, (remaining / ability.cooldown) * 100) : 0;
        overlay.style.height = `${pct}%`;
      }
    }

    this.updateQuestTracker();
    this.updateBuffs();
    this.updateBoss();
    this.updatePrompt();
    this.dom.death.classList.toggle("hidden", !session.dead);
  }

  private updateQuestTracker(): void {
    if (!this.session) return;
    const active = this.session.save.quests
      .filter((state) => QUESTS[state.id] && (!state.completed || (QUESTS[state.id].repeatable && state.completions >= 0)))
      .filter((state) => !(state.completed && !QUESTS[state.id].repeatable && state.completions > 0))
      .slice(0, 5);
    const signature = active.map((state) => `${state.id}:${state.progress.join(",")}:${state.completed}:${state.completions}`).join("|");
    if (signature === this.questSignature) return;
    this.questSignature = signature;
    this.dom.questTracker.innerHTML = active
      .map((state) => {
        const quest = QUESTS[state.id];
        const lines = quest.objectives
          .map((objective, i) =>
            questObjectiveText(
              objective,
              state.progress[i] ?? 0,
              (id) => MONSTERS[id]?.name ?? id,
              (id) => getItem(id).name,
            ),
          )
          .map((line) => `<div>${esc(line)}</div>`)
          .join("");
        const ready = state.completed && (quest.repeatable || state.completions === 0);
        return `<div class="quest-chip"><div class="qname">${esc(quest.name)}</div>${lines}${ready ? `<div class="qready">Ready to turn in</div>` : ""}</div>`;
      })
      .join("");
  }

  private updateBuffs(): void {
    if (!this.session) return;
    const buffs = this.session.buffs.slice(0, 6);
    const signature = buffs.map((buff) => `${buff.name}:${Math.ceil(buff.remaining)}`).join("|");
    if (signature === this.buffSignature) return;
    this.buffSignature = signature;
    this.dom.buffBar.innerHTML = buffs
      .map((buff) => `<span class="buff-chip">${esc(buff.name)} ${Math.ceil(buff.remaining)}s</span>`)
      .join("");
  }

  private updateBoss(): void {
    if (!this.session) return;
    const boss = this.session.monsters.find((monster) => {
      const def = MONSTERS[monster.defId];
      return def?.boss && monster.state !== "dead" && (monster.hp < def.maxHp || monster.state === "chase" || monster.state === "attack");
    });
    if (!boss) {
      this.dom.bossBar.classList.add("hidden");
      return;
    }
    const def = MONSTERS[boss.defId];
    this.dom.bossName.textContent = def.name;
    this.dom.bossFill.style.width = `${Math.max(0, (boss.hp / def.maxHp) * 100)}%`;
    this.dom.bossBar.classList.remove("hidden");
  }

  private updatePrompt(): void {
    if (!this.session || this.session.dead || this.panel) {
      this.dom.prompt.classList.add("hidden");
      return;
    }
    const target = this.session.findInteractable();
    if (!target) {
      this.dom.prompt.classList.add("hidden");
      return;
    }
    this.dom.prompt.textContent = `E · ${target.label}`;
    this.dom.prompt.classList.remove("hidden");
  }

  private drawMinimap(): void {
    const session = this.session;
    if (!session) return;
    const canvas = this.dom.minimap;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const zone = session.zone;
    const w = canvas.width;
    const h = canvas.height;
    if (this.minimapZone !== zone.id || !this.minimapBase) {
      this.minimapZone = zone.id;
      const base = document.createElement("canvas");
      base.width = w;
      base.height = h;
      const bctx = base.getContext("2d");
      if (!bctx) return;
      bctx.fillStyle = "#2b2538";
      bctx.fillRect(0, 0, w, h);
      const sx = w / zone.width;
      const sy = h / zone.height;
      for (let y = 0; y < zone.height; y += 1) {
        for (let x = 0; x < zone.width; x += 1) {
          if (!zone.blocked[y * zone.width + x]) continue;
          bctx.fillStyle = (x + y) % 2 === 0 ? "#15121d" : "#1a1622";
          bctx.fillRect(Math.floor(x * sx), Math.floor(y * sy), Math.ceil(sx), Math.ceil(sy));
        }
      }
      this.minimapBase = base;
    }
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(this.minimapBase, 0, 0);
    const px = (x: number) => (x / (zone.width * zone.tileWidth)) * w;
    const py = (y: number) => (y / (zone.height * zone.tileHeight)) * h;
    for (const portal of zone.portals) {
      ctx.fillStyle = "#e8c05a";
      ctx.fillRect(px(portal.x + portal.w / 2) - 1.5, py(portal.y + portal.h / 2) - 1.5, 3, 3);
    }
    for (const npc of zone.npcs) {
      ctx.fillStyle = "#7fd4ff";
      ctx.fillRect(px(npc.x) - 1.5, py(npc.y) - 1.5, 3, 3);
    }
    for (const chest of zone.chests) {
      if (session.save.openedChests.includes(chest.id)) continue;
      ctx.fillStyle = "#ffd76a";
      ctx.fillRect(px(chest.x) - 1, py(chest.y) - 1, 2, 2);
    }
    for (const monster of session.monsters) {
      if (monster.state === "dead") continue;
      const boss = MONSTERS[monster.defId]?.boss;
      ctx.fillStyle = boss ? "#ff6b6b" : "#cf5f5f";
      const size = boss ? 5 : 2.5;
      ctx.fillRect(px(monster.x) - size / 2, py(monster.y) - size / 2, size, size);
    }
    ctx.fillStyle = "#fff4cf";
    ctx.fillRect(px(session.save.x) - 2, py(session.save.y) - 2, 4, 4);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;
    ctx.strokeRect(px(session.save.x) - 2.5, py(session.save.y) - 2.5, 5, 5);
  }

  handleEvents(events: SimEvent[]): void {
    const session = this.session;
    if (!session) return;
    let shouldPersist = false;
    for (const event of events) {
      switch (event.type) {
        case "log":
          this.pushLog(event.text, event.tone ?? "info");
          break;
        case "damage": {
          if (event.target === "player") {
            this.pushLog(`You take ${Math.round(event.amount)} damage.`, "bad");
          } else if (event.crit) {
            this.pushLog(`Critical hit for ${Math.round(event.amount)}.`, "good");
          }
          const now = performance.now();
          if (now - this.lastHitSound > 55) {
            this.lastHitSound = now;
            if (event.crit) this.sfx.crit();
            else this.sfx.hit();
          }
          break;
        }
        case "death":
          if (event.who === "player") {
            this.sfx.death();
            this.toast("You have fallen. Returning to Eldoria Village...", "bad");
          } else if (event.defId && MONSTERS[event.defId]?.boss) {
            this.pushLog(`${MONSTERS[event.defId].name} has been defeated!`, "quest");
            this.sfx.level();
            shouldPersist = true;
          }
          break;
        case "levelup":
          this.pushLog(`Level up! You are now level ${event.level}.`, "good");
          this.toast(`Level ${event.level}!`, "good");
          this.sfx.level();
          this.abilitySignature = "";
          shouldPersist = true;
          break;
        case "quest":
          this.toast(event.text, "quest");
          this.pushLog(event.text, "quest");
          this.sfx.quest();
          shouldPersist = true;
          break;
        case "zone":
          this.toast(`Entered ${session.zone.name}.`, "info");
          this.sfx.portal();
          this.minimapZone = null;
          shouldPersist = true;
          break;
        case "gold": {
          const now = performance.now();
          if (now - this.lastCoinSound > 120) {
            this.lastCoinSound = now;
            this.sfx.coin();
          }
          break;
        }
        case "pickup": {
          const now = performance.now();
          if (now - this.lastPickupSound > 90) {
            this.lastPickupSound = now;
            this.sfx.pickup();
          }
          if (event.qty > 0) this.pushLog(`Picked up ${event.qty}x ${getItem(event.itemId).name}.`, "info");
          break;
        }
        case "loot":
          break;
        case "heal":
          this.sfx.heal();
          break;
        case "cast":
          this.sfx.cast();
          break;
        case "respawn":
          this.toast("Elara's light restores you.", "good");
          this.sfx.heal();
          shouldPersist = true;
          break;
        case "interact":
          if (event.kind === "npc") {
            this.openPanel("npc", event.id);
          } else if (event.kind === "chest") {
            this.sfx.coin();
          }
          break;
        case "save":
          shouldPersist = true;
          break;
        case "error":
          this.toast(event.message, "bad");
          break;
        default:
          break;
      }
    }
    this.updateHud(true);
    if (shouldPersist) this.schedulePersist();
  }

  private logLines: { text: string; tone: string }[] = [];

  pushLog(text: string, tone = "info"): void {
    this.logLines.push({ text, tone });
    while (this.logLines.length > 30) this.logLines.shift();
    this.dom.log.innerHTML = this.logLines
      .map((line) => `<div class="log-line ${esc(line.tone)}">${esc(line.text)}</div>`)
      .join("");
    this.dom.log.scrollTop = this.dom.log.scrollHeight;
  }

  toast(text: string, tone: "info" | "good" | "bad" | "quest" = "info"): void {
    const node = document.createElement("div");
    node.className = `toast ${tone}`;
    node.textContent = text;
    this.dom.toasts.appendChild(node);
    while (this.dom.toasts.children.length > 4) this.dom.toasts.firstElementChild?.remove();
    window.setTimeout(() => node.remove(), 3600);
  }

  requestSave(): void {
    this.schedulePersist();
  }

  private schedulePersist(): void {
    if (this.persistTimer !== null) window.clearTimeout(this.persistTimer);
    this.persistTimer = window.setTimeout(() => {
      this.persistTimer = null;
      void this.persist();
    }, 700);
  }

  async persist(): Promise<void> {
    if (!this.session || this.session.dead) return;
    try {
      await this.repo.put(this.session.snapshot());
    } catch (err) {
      this.toast(err instanceof Error ? err.message : "Autosave failed.", "bad");
    }
  }
}
