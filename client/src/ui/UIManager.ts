import {
  MAX_CHARACTERS,
  MONSTERS,
  NPCS,
  QUESTS,
  SHOPS,
  ZONES,
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
import type { MusicTheme, Sfx } from "../audio/sfx";
import { downloadJson, readJsonFile, type SaveRepository } from "../persistence/db";
import { classColor, esc, formatNumber, questObjectiveText } from "./helpers";
import { STORY_CHAPTERS } from "../../../core/src/data/story";
import {
  abilityBarHtml,
  characterSelectHtml,
  createPanelHtml,
  inventoryPanelHtml,
  npcPanelHtml,
  quickbarHtml,
  questsPanelHtml,
  settingsPanelHtml,
  shopPanelHtml,
  talentsPanelHtml,
  type InventoryFilter,
  type InventorySort,
} from "./screens";
import {
  DEFAULT_KEYBINDS,
  KEYBIND_LABELS,
  TUTORIAL_STORAGE_KEY,
  applyPreferences,
  keyNameFromEvent,
  loadPreferences,
  updatePreferences,
  type GamePreferences,
  type KeybindAction,
} from "./preferences";

type PanelState =
  | { kind: "inventory" }
  | { kind: "quests" }
  | { kind: "talents" }
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
  private classRoleFilter = "all";
  private selectedSlot: number | null = null;
  private selectedEquip: string | null = null;
  private inventoryFilter: InventoryFilter = "all";
  private inventorySort: InventorySort = "default";
  private rebinding: KeybindAction | null = null;
  private touchMove = { x: 0, y: 0 };
  private touchPointer: number | null = null;
  public keybindVersion = 0;
  private preferences: GamePreferences = loadPreferences();

  private abilitySignature = "";
  private quickbarSignature = "";
  private questSignature = "";
  private buffSignature = "";
  private compassSignature = "";
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
    quickbar: must("quickbar"),
    prompt: must("interact-prompt"),
    log: must("combat-log"),
    questTracker: must("quest-tracker"),
    compass: must("quest-compass"),
    tutorial: must("tutorial"),
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
    cycle: must("hud-cycle"),
    gold: must("hud-gold"),
    touchControls: must("touch-controls"),
    touchStick: must("touch-stick"),
    touchKnob: must("touch-knob"),
    importFile: must<HTMLInputElement>("import-file"),
  };

  constructor(options: UIOptions) {
    this.repo = options.repo;
    this.sfx = options.sfx;
    this.onPlay = options.onPlay;
    this.onExitToMenu = options.onExitToMenu;
    applyPreferences(this.preferences);
    this.bindEvents();

    window.setInterval(() => {
      if (this.session && !this.session.dead) void this.persist();
    }, AUTOSAVE_MS);
  }

  get modalOpen(): boolean {
    return this.panel !== null;
  }

  get touchVector(): { x: number; y: number } {
    return this.touchMove;
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
    this.sfx.stopMusic();
    this.closePanel(false);
    this.dom.hud.classList.add("hidden");
    this.dom.boot.classList.add("hidden");
    this.dom.charSelect.classList.remove("hidden");
    this.dom.death.classList.add("hidden");
    this.dom.tutorial.classList.add("hidden");
    this.dom.compass.classList.add("hidden");
    this.dom.touchControls.classList.add("hidden");
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
    this.inventoryFilter = "all";
    this.inventorySort = "default";
    this.abilitySignature = "";
    this.quickbarSignature = "";
    this.questSignature = "";
    this.compassSignature = "";
    this.buffSignature = "";
    this.minimapZone = null;
    this.logLines = [];
    this.dom.log.innerHTML = "";
    this.showTutorialIfNeeded();
    this.refreshTouchVisibility();

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

  private showTutorialIfNeeded(): void {
    let seen = false;
    try {
      seen = localStorage.getItem(TUTORIAL_STORAGE_KEY) === "seen";
    } catch {
      seen = true;
    }
    this.dom.tutorial.classList.toggle("hidden", seen);
  }

  private dismissTutorial(): void {
    this.dom.tutorial.classList.add("hidden");
    this.refreshTouchVisibility();
    try {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, "seen");
    } catch {
      return;
    }
  }

  private bindEvents(): void {
    must("tutorial-close").addEventListener("click", () => this.dismissTutorial());
    this.dom.quickbar.addEventListener("click", (event) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>("[data-quickslot]");
      if (!target || !this.session) return;
      const index = Number(target.dataset.quickslot);
      if (!Number.isInteger(index)) return;
      this.session.useQuickSlot(index);
      this.updateHud(true);
      this.handleEvents(this.session.drainEvents());
    });

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
      } else if (action === "class-role-filter") {
        const currentName = (this.dom.createPanel.querySelector<HTMLInputElement>("#char-name")?.value) ?? "";
        this.classRoleFilter = target.dataset.value ?? "all";
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
      if (input.id === "music-range") this.sfx.setMusicVolume(Number(input.value) / 100);
    });
    this.dom.overlay.addEventListener("change", (event) => {
      const input = event.target as HTMLInputElement;
      if (input.id === "mute-toggle") this.sfx.setMuted(input.checked);
      if (input.id === "ui-scale") {
        const scale = Number(input.value) === 1.5 ? 1.5 : Number(input.value) === 1.25 ? 1.25 : 1;
        this.preferences = updatePreferences({ uiScale: scale });
      }
      if (input.id === "contrast-toggle") this.preferences = updatePreferences({ highContrast: input.checked });
      if (input.id === "motion-toggle") this.preferences = updatePreferences({ reducedMotion: input.checked });
      if (input.id === "damage-toggle") this.preferences = updatePreferences({ showDamage: input.checked });
      if (input.id === "shake-toggle") this.preferences = updatePreferences({ screenShake: input.checked });
      if (input.id === "touch-toggle") {
        this.preferences = updatePreferences({ touchControls: input.checked });
        this.refreshTouchVisibility();
      }
      if (input.id === "zoom-select") {
        const zoom = Number(input.value) === 1.5 ? 1.5 : Number(input.value) === 2.5 ? 2.5 : 2;
        this.preferences = updatePreferences({ cameraZoom: zoom });
      }
      if (input.id === "effect-select") {
        const strength = Number(input.value) === 0.5 ? 0.5 : Number(input.value) === 1.5 ? 1.5 : 1;
        this.preferences = updatePreferences({ effectIntensity: strength });
      }
      if (input.id === "difficulty-select" && this.session) {
        this.session.setDifficulty(input.value as "story" | "normal" | "nightmare");
        void this.persist();
        this.renderPanel();
      }
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
    this.setupTouchControls();
  }

  private setupTouchControls(): void {
    const stick = this.dom.touchStick;
    const knob = this.dom.touchKnob;
    const move = (event: PointerEvent) => {
      const rect = stick.getBoundingClientRect();
      const radius = rect.width / 2;
      let dx = event.clientX - (rect.left + radius);
      let dy = event.clientY - (rect.top + radius);
      const distance = Math.hypot(dx, dy);
      if (distance > radius * 0.8) {
        dx = (dx / distance) * radius * 0.8;
        dy = (dy / distance) * radius * 0.8;
      }
      this.touchMove = { x: dx / (radius * 0.8), y: dy / (radius * 0.8) };
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    const release = () => {
      this.touchPointer = null;
      this.touchMove = { x: 0, y: 0 };
      knob.style.transform = "translate(0, 0)";
    };
    stick.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      this.touchPointer = event.pointerId;
      stick.setPointerCapture(event.pointerId);
      move(event);
    });
    stick.addEventListener("pointermove", (event) => {
      if (this.touchPointer !== event.pointerId) return;
      event.preventDefault();
      move(event);
    });
    stick.addEventListener("pointerup", release);
    stick.addEventListener("pointercancel", release);
    for (const button of this.dom.touchControls.querySelectorAll<HTMLElement>("[data-touch]")) {
      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        const action = button.dataset.touch ?? "";
        window.dispatchEvent(new CustomEvent("realm-touch-action", { detail: action }));
      });
    }
    this.refreshTouchVisibility();
  }

  private refreshTouchVisibility(): void {
    const coarse = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
    const show = Boolean(this.session) && !this.modalOpen && this.dom.tutorial.classList.contains("hidden") && (coarse || this.preferences.touchControls);
    this.dom.touchControls.classList.toggle("hidden", !show);
    for (const [action, key] of [["quick1", "quick1"], ["quick2", "quick2"], ["interact", "interact"]] as const) {
      const button = this.dom.touchControls.querySelector<HTMLElement>(`[data-touch="${action}"]`);
      if (button) button.textContent = this.preferences.keybinds[key];
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.repeat) return;
    if (this.rebinding) {
      event.preventDefault();
      if (event.key === "Escape") {
        this.rebinding = null;
        this.renderPanel();
        return;
      }
      const key = keyNameFromEvent(event);
      if (!key) {
        this.toast("Use a letter, number, arrow, Space, Shift, or Tab.", "bad");
        return;
      }
      const action = this.rebinding;
      const keybinds = { ...this.preferences.keybinds, [action]: key };
      const duplicate = (Object.entries(keybinds) as [KeybindAction, string][]).find(([other, value]) => other !== action && value === key);
      if (duplicate) {
        this.toast(`${key} is already bound to ${KEYBIND_LABELS[duplicate[0]]}.`, "bad");
        return;
      }
      this.preferences = updatePreferences({ keybinds });
      this.keybindVersion += 1;
      this.rebinding = null;
      this.renderPanel();
      this.toast(`${KEYBIND_LABELS[action]} bound to ${key}.`, "good");
      return;
    }
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
    } else if (event.key === "t" || event.key === "T") {
      event.preventDefault();
      this.openPanel("talents");
    } else if (keyNameFromEvent(event) === this.preferences.keybinds.quick1 || keyNameFromEvent(event) === this.preferences.keybinds.quick2) {
      event.preventDefault();
      this.session.useQuickSlot(keyNameFromEvent(event) === this.preferences.keybinds.quick1 ? 0 : 1);
      this.updateHud(true);
      this.handleEvents(this.session.drainEvents());
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
    this.dom.createPanel.innerHTML = createPanelHtml(this.selectedClass, this.classRoleFilter);
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
    else if (kind === "talents") this.panel = { kind };
    else this.panel = { kind: "settings" };
    this.selectedSlot = null;
    this.selectedEquip = null;
    this.renderPanel();
    this.updateCompass();
    this.refreshTouchVisibility();
    this.sfx.ui();
  }

  closePanel(persist = true): void {
    if (!this.panel) return;
    this.panel = null;
    this.dom.overlay.classList.add("hidden");
    this.dom.overlay.innerHTML = "";
    this.updateHud(true);
    this.refreshTouchVisibility();
    if (persist) this.schedulePersist();
  }

  private renderPanel(): void {
    if (!this.panel) return;
    let title = "Panel";
    let body = "";
    let narrow = false;
    if (this.panel.kind === "inventory" && this.session) {
      title = "Backpack & Equipment";
      body = inventoryPanelHtml(this.session, this.selectedSlot, this.selectedEquip, this.inventoryFilter, this.inventorySort);
    } else if (this.panel.kind === "quests" && this.session) {
      title = "Quest Journal";
      body = questsPanelHtml(this.session);
      narrow = true;
    } else if (this.panel.kind === "talents" && this.session) {
      title = "Talents";
      body = talentsPanelHtml(this.session);
    } else if (this.panel.kind === "settings") {
      title = "Settings";
      body = settingsPanelHtml(this.session, this.sfx.currentVolume, this.sfx.isMuted, this.sfx.currentMusicVolume, this.preferences, this.rebinding);
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
    if (action === "rebind-key") {
      this.rebinding = (target.dataset.key ?? "") as KeybindAction;
      this.renderPanel();
      return;
    }
    if (action === "reset-keys") {
      this.preferences = updatePreferences({ keybinds: { ...DEFAULT_KEYBINDS } });
      this.keybindVersion += 1;
      this.renderPanel();
      this.toast("Keybinds restored to defaults.", "good");
      return;
    }
    if (action === "reset-tutorial") {
      try {
        localStorage.removeItem(TUTORIAL_STORAGE_KEY);
      } catch {
        return;
      }
      this.dismissTutorial();
      this.closePanel(false);
      this.dom.tutorial.classList.remove("hidden");
      this.refreshTouchVisibility();
      return;
    }
    if (this.panel?.kind === "inventory" && (action === "inv-filter" || action === "inv-sort")) {
      const value = target.dataset.value ?? "";
      if (action === "inv-filter") this.inventoryFilter = value as InventoryFilter;
      else this.inventorySort = value as InventorySort;
      this.renderPanel();
      this.sfx.ui();
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
    if (action === "new-game-plus") {
      if (!window.confirm("Begin a new cycle? Quests, bosses, and chests reset. Your level, gear, and talents remain.")) return;
      if (this.session.startNewGamePlus()) {
        await this.persist();
        this.closePanel();
        this.toast(`New Game+ ${this.session.save.ngPlus} begins.`, "good");
      }
      return;
    }
    const session = this.session;
    const slot = Number(target.dataset.slot ?? -1);
    let changed = false;

    if (this.panel?.kind === "inventory") {
      if (action === "use" && slot >= 0) changed = session.useItem(slot);
      else if (action === "equip" && slot >= 0) changed = session.equip(slot);
      else if (action === "sell" && slot >= 0) changed = session.sell(slot);
      else if (action === "bind-quick" && slot >= 0) {
        const stack = session.save.inventory[slot];
        const quick = Number(target.dataset.quick);
        if (stack && (quick === 0 || quick === 1)) {
          changed = session.bindQuickSlot(quick, stack.itemId);
          if (changed) this.toast(`${getItem(stack.itemId).name} bound to ${quick === 0 ? "Z" : "X"}.`, "good");
        }
      } else if (action === "unequip" && target.dataset.slot) {
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
      } else if (action === "upgrade-slot" && target.dataset.slot) {
        changed = session.upgradeEquipped(target.dataset.slot as keyof CharacterSave["equipment"]);
      } else if (action === "craft" && target.dataset.recipe) {
        changed = session.craft(target.dataset.recipe);
      }
      if (changed) this.sfx.coin();
      this.renderPanel();
    } else if (this.panel?.kind === "talents") {
      if (action === "learn-talent" && target.dataset.talent) {
        changed = session.learnTalent(target.dataset.talent);
        if (changed) this.sfx.level();
      }
      this.renderPanel();
    } else if (this.panel?.kind === "npc") {
      if (action === "accept-quest" && target.dataset.quest) {
        changed = session.acceptQuest(target.dataset.quest);
        if (changed) this.sfx.quest();
      } else if (action === "turnin-quest" && target.dataset.quest) {
        changed = session.turnInQuest(target.dataset.quest);
        if (changed) this.sfx.level();
      } else if (action === "pick-reward" && target.dataset.quest && target.dataset.index) {
        changed = session.pickQuestReward(target.dataset.quest, Number(target.dataset.index));
        if (changed) this.sfx.level();
      } else if (action === "npc-choice" && target.dataset.npc && target.dataset.choice) {
        changed = session.pickNpcChoice(target.dataset.npc, target.dataset.choice as "kind" | "rude");
        if (changed) this.sfx.level();
      } else if (action === "heal") {
        changed = session.healAtNpc();
        if (changed) this.sfx.heal();
      } else if (action === "respec-talents") {
        changed = session.respecTalents();
        if (changed) this.sfx.level();
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

  private rebuildQuickbar(): void {
    if (!this.session) return;
    const [a, b] = this.session.save.quickSlots;
    const signature = `${a ?? ""}:${a ? this.session.countItem(a) : 0}:${b ?? ""}:${b ? this.session.countItem(b) : 0}:${Math.ceil(this.session.potionCooldown * 10)}`;
    if (signature === this.quickbarSignature) return;
    this.quickbarSignature = signature;
    this.dom.quickbar.innerHTML = quickbarHtml(this.session);
  }

  private updateCompass(): void {
    const session = this.session;
    if (!session || session.dead || this.panel) {
      this.dom.compass.classList.add("hidden");
      this.compassSignature = "";
      return;
    }
    const save = session.save;
    let target: { x: number; y: number; label: string; zone?: string } | null = null;
    const portalToward = (zoneId: string) => {
      const direct = session.zone.portals.find((portal) => portal.targetZone === zoneId);
      const fallback = session.zone.portals[0];
      const portal = direct ?? fallback;
      if (!portal) return null;
      return {
        x: portal.x + portal.w / 2,
        y: portal.y + portal.h / 2,
        label: `Travel to ${ZONES[portal.targetZone]?.name ?? portal.targetZone}`,
        zone: ZONES[portal.targetZone]?.name,
      };
    };
    const npcTarget = (npcId: string, label: string) => {
      const zoneEntry = Object.values(ZONES).find((zone) => zone.npcs.some((npc) => npc.id === npcId));
      const npc = zoneEntry?.npcs.find((entry) => entry.id === npcId);
      if (!zoneEntry || !npc) return null;
      if (zoneEntry.id === session.zone.id) return { x: npc.x, y: npc.y, label };
      return portalToward(zoneEntry.id);
    };

    for (const state of save.quests) {
      const quest = QUESTS[state.id];
      if (!quest) continue;
      const ready = state.completed && (quest.repeatable || state.completions === 0);
      if (ready) {
        target = npcTarget(quest.giverNpc, `Turn in ${quest.name}`);
        if (target) break;
        continue;
      }
      for (let index = 0; index < quest.objectives.length; index += 1) {
        const objective = quest.objectives[index];
        const count = "count" in objective ? objective.count : 1;
        if ((state.progress[index] ?? 0) >= count) continue;
        if (objective.kind === "kill" || objective.kind === "boss") {
          const alive = session.monsters
            .filter((monster) => monster.defId === objective.monsterId && monster.state !== "dead")
            .sort((left, right) => Math.hypot(left.x - save.x, left.y - save.y) - Math.hypot(right.x - save.x, right.y - save.y));
          const spawn = alive[0];
          if (spawn) {
            target = { x: spawn.x, y: spawn.y, label: MONSTERS[objective.monsterId]?.name ?? objective.monsterId };
            break;
          }
          const staticSpawn = session.zone.monsterSpawns.find((entry) => entry.id === objective.monsterId);
          if (staticSpawn) {
            target = { x: staticSpawn.x, y: staticSpawn.y, label: MONSTERS[objective.monsterId]?.name ?? objective.monsterId };
            break;
          }
        } else if (objective.kind === "collect") {
          const nodes = session.zone.gatherNodes
            .filter((node) => node.itemId === objective.itemId && !session.isGathered(node.id))
            .sort((left, right) => Math.hypot(left.x - save.x, left.y - save.y) - Math.hypot(right.x - save.x, right.y - save.y));
          if (nodes[0]) {
            target = { x: nodes[0].x, y: nodes[0].y, label: getItem(objective.itemId).name };
            break;
          }
        } else if (objective.kind === "visit") {
          if (objective.zone !== session.zone.id) {
            target = portalToward(objective.zone);
            if (target) break;
          }
        }
      }
      if (target) break;
    }

    if (!target) {
      this.dom.compass.classList.add("hidden");
      this.compassSignature = "";
      return;
    }
    const dx = target.x - save.x;
    const dy = target.y - save.y;
    const distance = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    const dirs = ["E", "SE", "S", "SW", "W", "NW", "N", "NE"];
    const direction = dirs[(Math.round(angle / (Math.PI / 4)) + 8) % 8];
    const signature = `${target.label}:${Math.round(distance / 4)}:${direction}`;
    if (signature === this.compassSignature) return;
    this.compassSignature = signature;
    this.dom.compass.innerHTML = `<span class="compass-arrow" style="transform:rotate(${angle}rad)">➤</span>
      <span class="compass-copy"><b>${esc(target.label)}</b><span>${direction} · ${Math.max(1, Math.round(distance / 10))}m${target.zone ? ` · ${esc(target.zone)}` : ""}</span></span>`;
    this.dom.compass.classList.remove("hidden");
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
    const cycleLabel = `${save.difficulty[0].toUpperCase()}${save.difficulty.slice(1)}${save.ngPlus > 0 ? ` · NG+${save.ngPlus}` : ""}`;
    this.dom.cycle.textContent = cycleLabel;
    this.dom.cycle.classList.remove("hidden");
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

    this.rebuildQuickbar();
    this.updateQuestTracker();
    this.updateCompass();
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
    const storyIndex = this.session.save.storyChapter + 1;
    const nextStory = storyIndex < STORY_CHAPTERS.length ? STORY_CHAPTERS[storyIndex] : null;
    const storyKey = nextStory ? `story:${storyIndex}` : "story:done";
    const signature = `${storyKey}|` + active.map((state) => `${state.id}:${state.progress.join(",")}:${state.completed}:${state.completions}`).join("|");
    if (signature === this.questSignature) return;
    this.questSignature = signature;
    const storyBossId = nextStory?.bossId ?? "";
    const storyBossName = storyBossId ? (MONSTERS[storyBossId]?.name ?? storyBossId) : "";
    const storyLine = nextStory
      ? `<div class="quest-chip"><div class="qname">Story: ${esc(nextStory.title)}</div><div>Defeat the ${esc(storyBossName)} to continue the story.</div></div>`
      : "";
    this.dom.questTracker.innerHTML = storyLine + active
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
      return def?.boss && monster.state !== "dead" && (monster.hp < (monster.maxHp ?? def.maxHp) || monster.state === "chase" || monster.state === "attack");
    });
    if (!boss) {
      this.dom.bossBar.classList.add("hidden");
      this.sfx.playMusic(this.session.zone.ambience as MusicTheme);
      return;
    }
    this.sfx.playMusic("boss");
    const def = MONSTERS[boss.defId];
    const maxHp = boss.maxHp ?? def.maxHp;
    this.dom.bossName.textContent = `${def.name}${boss.phase ? ` · Phase ${boss.phase + 1}` : ""}`;
    this.dom.bossFill.style.width = `${Math.max(0, (boss.hp / maxHp) * 100)}%`;
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
      bctx.fillStyle = "#6e6150";
      bctx.fillRect(0, 0, w, h);
      const sx = w / zone.width;
      const sy = h / zone.height;
      for (let y = 0; y < zone.height; y += 1) {
        for (let x = 0; x < zone.width; x += 1) {
          if (!zone.blocked[y * zone.width + x]) continue;
          bctx.fillStyle = (x + y) % 2 === 0 ? "#2a2319" : "#322a1f";
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
      ctx.fillRect(px(portal.x + portal.w / 2) - 2, py(portal.y + portal.h / 2) - 2, 4, 4);
    }
    for (const npc of zone.npcs) {
      ctx.fillStyle = "#7fd4ff";
      ctx.fillRect(px(npc.x) - 2.5, py(npc.y) - 2.5, 5, 5);
    }
    for (const chest of zone.chests) {
      if (session.save.openedChests.includes(chest.id)) continue;
      ctx.fillStyle = "#ffd76a";
      ctx.fillRect(px(chest.x) - 2, py(chest.y) - 2, 4, 4);
    }
    for (const monster of session.monsters) {
      if (monster.state === "dead") continue;
      const boss = MONSTERS[monster.defId]?.boss;
      ctx.fillStyle = boss ? "#ff6b6b" : "#cf5f5f";
      const size = boss ? 8 : 4;
      ctx.fillRect(px(monster.x) - size / 2, py(monster.y) - size / 2, size, size);
      if (boss) {
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 1;
        ctx.strokeRect(px(monster.x) - size / 2, py(monster.y) - size / 2, size, size);
      }
    }
    const youX = px(session.save.x);
    const youY = py(session.save.y);
    ctx.fillStyle = "#fff4cf";
    ctx.fillRect(youX - 4, youY - 4, 8, 8);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.strokeRect(youX - 4, youY - 4, 8, 8);
    ctx.strokeStyle = "#fff4cf";
    ctx.lineWidth = 1;
    ctx.strokeRect(youX - 7.5, youY - 7.5, 15, 15);
  }

  showStoryBox(title: string, text: string, closing: string, bossIndex: number): void {
    const box = document.createElement("div");
    box.className = "story-box";
    box.innerHTML = `<div class="story-box-card"><div class="story-box-portrait"></div><h3></h3><p class="story-box-text"></p><p class="story-box-closing"></p><button type="button">Continue</button></div>`;
    const portrait = box.querySelector(".story-box-portrait") as HTMLElement;
    if (bossIndex >= 0 && bossIndex < 4) {
      portrait.style.backgroundImage = "url(assets/boss-portraits.png)";
      portrait.style.backgroundPosition = `${-bossIndex * 100}% 0`;
      portrait.style.backgroundSize = "400% 100%";
    }
    (box.querySelector("h3") as HTMLElement).textContent = title;
    const body = box.querySelector(".story-box-text") as HTMLElement;
    const closingLine = box.querySelector(".story-box-closing") as HTMLElement;
    closingLine.textContent = "";
    const button = box.querySelector("button") as HTMLButtonElement;
    let index = 0;
    let timer: number | null = null;
    const finish = () => {
      if (timer !== null) window.clearInterval(timer);
      timer = null;
      body.textContent = text;
      closingLine.textContent = closing;
      button.textContent = "Continue";
    };
    button.addEventListener("click", () => {
      if (timer !== null) finish();
      else box.remove();
    });
    timer = window.setInterval(() => {
      index += 1;
      body.textContent = text.slice(0, index);
      if (index >= text.length) finish();
    }, 28);
    document.body.appendChild(box);
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
        case "story":
          this.showStoryBox(event.title, event.text, event.closing, event.bossIndex);
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
            if (event.source === "hatchling") this.sfx.hatchling();
            else if (event.crit) this.sfx.crit();
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
