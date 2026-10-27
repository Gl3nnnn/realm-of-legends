import Phaser from "phaser";
import {
  MONSTERS,
  NPCS,
  charFrame,
  getItem,
  itemIcon,
  monsterFrame,
  type Direction,
  type GameSession,
  type MonsterInstance,
  type ProjectileInstance,
  type SimEvent,
} from "@realm/core";
import type { UIManager } from "../ui/UIManager";
import { loadPreferences, type GamePreferences, type KeybindAction } from "../ui/preferences";
import { damageColor, projectileStyle, resolveAbilityVfx, type VfxDescriptor } from "./vfx";
import { PET_SPECIES } from "@realm/core";

const DAMAGE_TEXT_COLORS: Record<string, string> = {
  physical: "#fff0cc",
  fire: "#ff9a4a",
  ice: "#7fd4ff",
  arcane: "#c99aff",
  holy: "#ffe89a",
  shadow: "#b07ae8",
  nature: "#8ef0a0",
  poison: "#a6e87a",
};

interface WorldData {
  session: GameSession;
  ui: UIManager;
}

interface KeyMap {
  UP: Phaser.Input.Keyboard.Key;
  DOWN: Phaser.Input.Keyboard.Key;
  LEFT: Phaser.Input.Keyboard.Key;
  RIGHT: Phaser.Input.Keyboard.Key;
  ONE: Phaser.Input.Keyboard.Key;
  TWO: Phaser.Input.Keyboard.Key;
  THREE: Phaser.Input.Keyboard.Key;
  FOUR: Phaser.Input.Keyboard.Key;
  FIVE: Phaser.Input.Keyboard.Key;
}

interface GamepadState {
  moveX: number;
  moveY: number;
  aimX: number;
  aimY: number;
  attack: boolean;
  dodge: boolean;
  interact: boolean;
  quick1: boolean;
  quick2: boolean;
  menu: boolean;
}

export class WorldScene extends Phaser.Scene {
  private session!: GameSession;
  private ui!: UIManager;
  private keys!: KeyMap;
  private boundKeys: Partial<Record<KeybindAction, Phaser.Input.Keyboard.Key>> = {};
  private keybindVersion = -1;
  private padPrev: boolean[] = [];
  private touchHandler: ((event: Event) => void) | null = null;
  private floatPool: Phaser.GameObjects.Text[] = [];
  private burstPool: Phaser.GameObjects.Arc[] = [];
  private player!: Phaser.GameObjects.Sprite;
  private eggFollower?: Phaser.GameObjects.Container;
  private playerShadow!: Phaser.GameObjects.Ellipse;
  private gearIcons!: Phaser.GameObjects.Sprite[];
  private npcSprites: { id: string; sprite: Phaser.GameObjects.Sprite; marker: Phaser.GameObjects.Text; baseY: number; lastMark: string }[] = [];
  private buffGlow!: Phaser.GameObjects.Ellipse;
  private floorFx!: Phaser.GameObjects.Graphics;
  private barFx!: Phaser.GameObjects.Graphics;
  private monsterSprites = new Map<string, Phaser.GameObjects.Sprite>();
  private monsterOutlines = new Map<string, Phaser.GameObjects.Sprite>();
  private petSprites = new Map<string, Phaser.GameObjects.Sprite>();
  private lootSprites = new Map<string, { icon: Phaser.GameObjects.Sprite; glow: Phaser.GameObjects.Arc }>();
  private chestSprites = new Map<string, Phaser.GameObjects.Image>();
  private gatherSprites = new Map<string, Phaser.GameObjects.Container>();
  private aim = { x: 0, y: 0 };
  private hitPauseLeft = 0;
  private pointerMoved = false;
  private zoneId = "";

  constructor() {
    super("world");
  }

  init(data: WorldData): void {
    if (!data?.session || !data?.ui) {
      this.scene.stop();
      return;
    }
    this.session = data.session;
    this.ui = data.ui;
    this.zoneId = data.session.zone.id;
    this.monsterSprites.clear();
    this.monsterOutlines.clear();
    this.petSprites.clear();
    this.lootSprites.clear();
    this.chestSprites.clear();
    this.gatherSprites.clear();
    this.pointerMoved = false;
    this.floatPool = [];
    this.burstPool = [];
    this.padPrev = [];
    this.keybindVersion = -1;
  }

  create(): void {
    const session = this.session;
    const bg = session.zone.ambience === "dungeon" || session.zone.ambience === "throne"
      ? "#0d0a12"
      : session.zone.ambience === "forest" || session.zone.ambience === "marsh"
        ? "#111a13"
        : session.zone.ambience === "frost"
          ? "#15263a"
          : "#141a17";
    this.cameras.main.setBackgroundColor(bg);
    this.buildMap();
    this.createPortals();
    this.createChests();
    this.createGatherNodes();
    this.createNpcs();
    this.createPlayer();
    this.createAmbience();
    this.floorFx = this.add.graphics().setDepth(4);
    this.barFx = this.add.graphics().setDepth(9000);

    for (const monster of session.monsters) this.spawnMonster(monster);
    for (const pet of session.pets) this.spawnPet(pet.uid, pet.kind);

    this.cameras.main.setBounds(0, 0, session.zone.width * session.zone.tileWidth, session.zone.height * session.zone.tileHeight);
    this.cameras.main.startFollow(this.player, true, 0.16, 0.16);
    this.cameras.main.setZoom(loadPreferences().cameraZoom);
    this.cameras.main.roundPixels = true;
    this.cameras.main.fadeIn(260, 10, 8, 14);
    const vignette = this.add.graphics().setScrollFactor(0).setDepth(9500);
    const vw = this.scale.width;
    const vh = this.scale.height;
    vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.45, 0.45, 0, 0);
    vignette.fillRect(0, 0, vw, vh * 0.25);
    vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.45, 0.45);
    vignette.fillRect(0, vh * 0.75, vw, vh * 0.25);

    if (session.zone.ambience === "dungeon" || session.zone.ambience === "throne") {
      const shade = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x06040a, 0.2);
      shade.setOrigin(0, 0).setScrollFactor(0).setDepth(9500);
      const onResize = () => shade.setSize(this.scale.width, this.scale.height);
      this.scale.on("resize", onResize);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off("resize", onResize));
    }
    this.keys = this.input.keyboard!.addKeys("UP,DOWN,LEFT,RIGHT,ONE,TWO,THREE,FOUR,FIVE") as KeyMap;
    this.input.keyboard!.addCapture(["UP", "DOWN", "LEFT", "RIGHT", "SPACE", "SHIFT"]);
    this.syncKeybinds(true);
    this.touchHandler = (event: Event) => this.onTouchAction((event as CustomEvent<string>).detail);
    window.addEventListener("realm-touch-action", this.touchHandler);
    this.events.once("shutdown", () => {
      if (this.touchHandler) window.removeEventListener("realm-touch-action", this.touchHandler);
      this.touchHandler = null;
    });
    this.aim = { x: session.save.x + 80, y: session.save.y + 40 };

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      this.pointerMoved = true;
      const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      this.aim = { x: point.x, y: point.y };
    });
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (!pointer.leftButtonDown() || this.ui.modalOpen) return;
      const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      this.aim = { x: point.x, y: point.y };
      this.pointerMoved = true;
      this.cast("basic");
    });

    const onUiCast = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      if (id && !this.ui.modalOpen) this.cast(id);
    };
    window.addEventListener("realm:cast", onUiCast);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener("realm:cast", onUiCast);
    });

    this.syncEntities();
    this.ui.update(0);
  }

  private buildMap(): void {
    const zone = this.session.zone;
    const map = this.make.tilemap({ key: `map-${zone.id}` });
    const palette = zone.id === "village" ? "eldoria" : zone.id;
    const tilesetKey = zone.id === "village" ? "tileset" : `tileset-${zone.id}`;
    const tileset = map.addTilesetImage(palette, tilesetKey, 16, 16, 0, 0);
    if (!tileset) throw new Error("Tileset could not be loaded.");
    const ground = map.createLayer("ground", tileset, 0, 0);
    const decor = map.createLayer("decor", tileset, 0, 0);
    if (!ground || !decor) throw new Error("Map layers are missing.");
    ground.setDepth(-10);
    decor.setDepth(-5);

    // Blocked-tile highlight: a faint red mark on every tile the player cannot walk onto.
    const blockedMarks = this.add.graphics().setDepth(-6);
    for (let ty = 0; ty < zone.height; ty += 1) {
      for (let tx = 0; tx < zone.width; tx += 1) {
        if (!zone.blocked[ty * zone.width + tx]) continue;
        blockedMarks.fillStyle(0xff3b3b, 0.12);
        blockedMarks.fillRect(tx * zone.tileWidth, ty * zone.tileHeight, zone.tileWidth, zone.tileHeight);
      }
    }

    for (const chest of zone.chests) {
      const tx = Math.floor(chest.x / zone.tileWidth);
      const ty = Math.floor(chest.y / zone.tileHeight);
      decor.removeTileAt(tx, ty);
    }

    // Automatic tall-tile split: a decor tile with another decor tile directly
    // above it is part of a tall object (tree, wall, house). Those tiles move to
    // a y-sorted layer so characters can walk behind them; flat decor stays put.
    const tallTiles: { x: number; y: number }[] = [];
    decor.forEachTile((tile) => {
      if (tile.index < 0) return;
      const above = decor.getTileAt(tile.x, tile.y - 1);
      if (above && above.index >= 0) tallTiles.push({ x: tile.x, y: tile.y });
    });
    for (const t of tallTiles) {
      const tile = decor.getTileAt(t.x, t.y);
      if (!tile) continue;
      const frame = tile.index;
      decor.removeTileAt(t.x, t.y);
      this.add
        .image((t.x + 0.5) * zone.tileWidth, (t.y + 1) * zone.tileHeight, tilesetKey, frame)
        .setOrigin(0.5, 1)
        .setDepth((t.y + 1) * zone.tileHeight);
    }

    // Torch glows: a soft warm light on every torch tile, drawn above the ground
    // but behind characters so it never hides them.
    const torchTile = 28;
    decor.forEachTile((tile) => {
      if (tile.index !== torchTile) return;
      const glow = this.add
        .circle((tile.x + 0.5) * zone.tileWidth, (tile.y + 0.5) * zone.tileHeight, 22, 0xffb347, 0.22)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(-6);
      this.tweens.add({
        targets: glow,
        alpha: { from: 0.16, to: 0.28 },
        duration: 900 + ((tile.x * 37 + tile.y * 13) % 300),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    });
  }

  private createPortals(): void {
    for (const portal of this.session.zone.portals) {
      const cx = portal.x + portal.w / 2;
      const cy = portal.y + portal.h / 2;
      const pad = this.add.rectangle(cx, cy, portal.w, portal.h, 0x7a5ac0, 0.2).setDepth(2);
      pad.setStrokeStyle(2, 0xe8c05a, 0.9);
      this.tweens.add({ targets: pad, alpha: { from: 0.35, to: 0.9 }, duration: 1200, yoyo: true, repeat: -1 });
      this.add
        .text(cx, portal.y - 6, portal.label, {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: "6px",
          color: "#e8c05a",
          stroke: "#000000",
          strokeThickness: 3,
          align: "center",
        })
        .setOrigin(0.5, 1)
        .setDepth(9200);
    }
  }

  private createChests(): void {
    for (const chest of this.session.zone.chests) {
      if (this.session.save.openedChests.includes(chest.id)) continue;
      const image = this.add.image(chest.x, chest.y, "tileset", 25).setDepth(chest.y);
      this.chestSprites.set(chest.id, image);
    }
  }

  private createGatherNodes(): void {
    for (const node of this.session.zone.gatherNodes) {
      const def = getItem(node.itemId);
      const glow = this.add.circle(0, 4, 8, 0x8ef0a0, 0.16);
      const icon = this.add.sprite(0, 0, "items", itemIcon(def.icon)).setScale(1);
      const container = this.add.container(node.x, node.y, [glow, icon]).setDepth(node.y);
      this.tweens.add({ targets: icon, y: -2, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      this.tweens.add({ targets: glow, alpha: { from: 0.1, to: 0.3 }, duration: 900, yoyo: true, repeat: -1 });
      this.gatherSprites.set(node.id, container);
    }
  }

  private createNpcs(): void {
    for (const spawn of this.session.zone.npcs) {
      const def = NPCS[spawn.id];
      if (!def) continue;
      this.add.ellipse(spawn.x, spawn.y + 12, 20, 7, 0x000000, 0.28).setDepth(spawn.y - 1);
      const sprite = this.add
        .sprite(spawn.x, spawn.y, "characters", charFrame(def.sprite, "down", 0))
        .setDepth(spawn.y);
      this.tweens.add({ targets: sprite, scaleY: { from: 1, to: 1.015 }, duration: 1700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      // Idle life: a gentle bob with a staggered start, so NPCs do not move in step.
      this.tweens.add({
        targets: sprite,
        y: { from: spawn.y, to: spawn.y - 2 },
        duration: 1300 + (spawn.x % 5) * 120,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
        delay: (spawn.x % 7) * 150,
      });
      // Quest marker above the NPC: "!" when a quest is free, "?" when one is ready to turn in.
      const marker = this.add
        .text(spawn.x, spawn.y - 34, "", {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: "10px",
          color: "#ffd76a",
          stroke: "#000000",
          strokeThickness: 3,
        })
        .setOrigin(0.5, 1)
        .setDepth(9200)
        .setVisible(false);
      this.tweens.add({ targets: marker, y: { from: spawn.y - 34, to: spawn.y - 38 }, duration: 600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      this.npcSprites.push({ id: spawn.id, sprite, marker, baseY: spawn.y, lastMark: "" });
      this.add
        .text(spawn.x, spawn.y - 20, def.name, {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: "6px",
          color: def.color,
          stroke: "#000000",
          strokeThickness: 3,
        })
        .setOrigin(0.5, 1)
        .setDepth(9200);
    }
  }

  // Shows the right quest marker above each NPC, and hops an NPC when a quest is ready to turn in.
  private updateNpcQuestMarks(): void {
    for (const entry of this.npcSprites) {
      const quests = this.session.getNpcQuestStates(entry.id);
      const canTurnIn = quests.some((q) => q.canTurnIn);
      const available = quests.some((q) => q.available);
      const mark = canTurnIn ? "?" : available ? "!" : "";
      if (mark !== entry.lastMark) {
        entry.lastMark = mark;
        entry.marker.setText(mark).setVisible(mark !== "");
        if (canTurnIn) {
          // A short hop when the quest is ready, so the player notices.
          this.tweens.add({ targets: entry.sprite, y: { from: entry.baseY, to: entry.baseY - 6 }, duration: 180, yoyo: true, repeat: 2, ease: "Quad.easeOut" });
        }
      }
    }
  }

  private createPlayer(): void {
    const save = this.session.save;
    const sprite = this.session.classInfo.sprite;
    this.playerShadow = this.add.ellipse(save.x, save.y + 12, 20, 7, 0x000000, 0.32).setDepth(save.y - 1);
    this.buffGlow = this.add.ellipse(save.x, save.y + 12, 34, 14, 0xffd76a, 0.28).setVisible(false).setDepth(save.y - 1);
    this.player = this.add
      .sprite(save.x, save.y, "characters", charFrame(sprite, "down", 0))
      .setDepth(save.y)
      .setOrigin(0.5, 0.6);
    // Row of floating icons above the hero: weapon, armor, helm, boots.
    this.gearIcons = [0, 1, 2, 3].map((i) =>
      this.add.sprite(save.x, save.y - 40, "items", 0).setScale(2).setVisible(false).setDepth(save.y + 1).setData("slot", i),
    );
  }

  private updateGearIcon(): void {
    const save = this.session.save;
    const slots = [save.equipment.weapon, save.equipment.armor, save.equipment.helm, save.equipment.boots];
    // Spread the icons out in a row, centred over the hero and raised above the head.
    const gap = 22;
    const startX = save.x - ((slots.length - 1) * gap) / 2;
    slots.forEach((item, i) => {
      const icon = this.gearIcons[i];
      if (!item || this.session.dead) {
        icon.setVisible(false);
        return;
      }
      const def = getItem(item.itemId);
      icon
        .setFrame(itemIcon(def.icon))
        .setPosition(startX + i * gap, save.y - 40)
        .setDepth(save.y + 1)
        .setVisible(true);
    });
  }

  private statusMarkers = new Map<string, Phaser.GameObjects.Text>();

  private updateStatusMarkers(uid: string, x: number, y: number, kinds: string[]): void {
    const glyphs: Record<string, string> = { poison: "☠", burn: "🔥", slow: "❄", stun: "★" };
    const shown = kinds.filter((kind) => glyphs[kind]);
    const existing = this.statusMarkers.get(uid);
    if (shown.length === 0) {
      existing?.destroy();
      this.statusMarkers.delete(uid);
      return;
    }
    const text = shown.map((kind) => glyphs[kind]).join(" ");
    let marker = existing;
    if (!marker) {
      marker = this.add.text(x, y - 30, text, { fontSize: "12px" }).setOrigin(0.5, 1);
      this.statusMarkers.set(uid, marker);
    }
    marker.setText(text).setPosition(x, y - 30).setDepth(y + 1);
  }

  private updateBuffGlow(active: boolean): void {
    const save = this.session.save;
    this.buffGlow.setPosition(save.x, save.y + 12).setDepth(save.y - 1);
    if (!active) {
      this.buffGlow.setVisible(false);
      return;
    }
    this.buffGlow.setVisible(true);
    if (loadPreferences().reducedMotion) {
      this.buffGlow.setAlpha(0.28);
      return;
    }
    const pulse = 0.5 + 0.5 * Math.sin(this.session.animationTime * 4);
    this.buffGlow.setAlpha(0.18 + pulse * 0.2);
  }

  private spawnMonster(monster: MonsterInstance): void {
    const def = MONSTERS[monster.defId];
    if (!def) return;
    const sprite = this.add
      .sprite(monster.x, monster.y, "monsters", monsterFrame(def.sprite, 0))
      .setDepth(monster.y)
      .setOrigin(0.5, 0.6);
    if (def.boss) sprite.setScale(1.55);
    else if (monster.elite) sprite.setScale(1.2);
    // Bosses and elites get a coloured glow behind them so they read as special.
    if (def.boss || monster.elite) {
      const glowColor = def.boss ? 0xffb347 : 0x9b6bff;
      const glow = this.add
        .ellipse(monster.x, monster.y, def.boss ? 60 : 40, def.boss ? 44 : 30, glowColor, def.boss ? 0.35 : 0.25)
        .setDepth(monster.y - 2);
      this.tweens.add({
        targets: glow,
        alpha: { from: def.boss ? 0.35 : 0.25, to: def.boss ? 0.12 : 0.08 },
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
    this.add
      .ellipse(monster.x, monster.y + 10, 18, 6, 0x000000, 0.3)
      .setDepth(monster.y - 1);
    // Dark outline behind the sprite so monsters stand out from the ground.
    const outline = this.add
      .sprite(monster.x, monster.y, "monsters", monsterFrame(def.sprite, 0))
      .setOrigin(0.5, 0.6)
      .setTint(0x05060a)
      .setAlpha(0.85)
      .setScale(sprite.scaleX * 1.12, sprite.scaleY * 1.12)
      .setDepth(monster.y - 0.5);
    this.monsterOutlines.set(monster.uid, outline);
    this.monsterSprites.set(monster.uid, sprite);
  }

  private spawnPet(uid: string, kind: "skeleton" | "wolf" | "familiar"): void {
    if (this.petSprites.has(uid)) return;
    const sprite = kind === "skeleton" ? "skeleton" : kind === "wolf" ? "wolf" : "familiar";
    const image = this.add.sprite(0, 0, "monsters", monsterFrame(sprite, 0)).setDepth(500).setScale(0.9);
    this.petSprites.set(uid, image);
  }

  private cast(id: string): void {
    if (this.session.dead || this.ui.modalOpen) return;
    const abilities = [this.session.classInfo.basic, ...this.session.classInfo.abilities];
    const ability = abilities.find((entry) => entry.id === id);
    if (!ability) return;
    if (this.session.castAbility(id, this.aim)) {
      const events = this.session.drainEvents();
      this.handleSimEvents(events);
    }
  }

  private castSlot(index: number): void {
    const ability = this.session.classInfo.abilities[index];
    if (ability) this.cast(ability.id);
  }

  private syncKeybinds(force = false): void {
    if (!force && this.keybindVersion === this.ui.keybindVersion) return;
    this.keybindVersion = this.ui.keybindVersion;
    const prefs = loadPreferences();
    const next: Partial<Record<KeybindAction, Phaser.Input.Keyboard.Key>> = {};
    for (const [action, key] of Object.entries(prefs.keybinds) as [KeybindAction, string][]) {
      next[action] = this.input.keyboard!.addKey(key, true, false);
    }
    this.boundKeys = next;
    this.input.keyboard!.addCapture(Object.values(prefs.keybinds));
  }

  private isDown(action: KeybindAction): boolean {
    return Boolean(this.boundKeys[action]?.isDown);
  }

  private justDown(action: KeybindAction): boolean {
    const key = this.boundKeys[action];
    return Boolean(key && Phaser.Input.Keyboard.JustDown(key));
  }

  private readGamepad(): GamepadState {
    const state: GamepadState = {
      moveX: 0, moveY: 0, aimX: 0, aimY: 0,
      attack: false, dodge: false, interact: false, quick1: false, quick2: false, menu: false,
    };
    const pads = typeof navigator.getGamepads === "function" ? navigator.getGamepads() : [];
    const pad = pads ? Array.from(pads).find((entry) => entry && entry.connected) : null;
    if (!pad) {
      this.padPrev = [];
      return state;
    }
    const dead = (value: number) => Math.abs(value) < 0.25 ? 0 : value;
    state.moveX = dead(pad.axes[0] ?? 0) + (pad.buttons[15]?.pressed ? 1 : 0) - (pad.buttons[14]?.pressed ? 1 : 0);
    state.moveY = dead(pad.axes[1] ?? 0) + (pad.buttons[13]?.pressed ? 1 : 0) - (pad.buttons[12]?.pressed ? 1 : 0);
    const aimX = dead(pad.axes[2] ?? 0);
    const aimY = dead(pad.axes[3] ?? 0);
    if (Math.hypot(aimX, aimY) > 0) {
      state.aimX = aimX;
      state.aimY = aimY;
    }
    const pressed = (index: number) => Boolean(pad.buttons[index]?.pressed);
    const edge = (index: number) => pressed(index) && !this.padPrev[index];
    state.attack = pressed(0) || pressed(7);
    state.dodge = edge(1);
    state.interact = edge(2);
    state.quick1 = edge(3) || edge(4);
    state.quick2 = edge(5) || edge(6);
    state.menu = edge(9);
    this.padPrev = pad.buttons.map((button) => button.pressed);
    return state;
  }

  private onTouchAction(action: string): void {
    if (this.ui.modalOpen || this.session.dead) return;
    if (action === "attack") {
      this.cast("basic");
    } else if (action === "dodge") {
      const move = this.ui.touchVector;
      this.session.dodge(move.x, move.y);
      this.handleSimEvents(this.session.drainEvents());
    } else if (action === "interact") {
      this.interact();
    } else if (action === "quick1" || action === "quick2") {
      this.session.useQuickSlot(action === "quick1" ? 0 : 1);
      this.handleSimEvents(this.session.drainEvents());
      this.ui.requestSave();
    }
  }

  private interact(): void {
    const target = this.session.interact();
    const interactEvents = this.session.drainEvents();
    this.handleSimEvents(interactEvents);
    if (!target && this.session.save.companion && !this.session.save.companion.hatched) {
      this.session.hatchCompanion();
      this.handleSimEvents(this.session.drainEvents());
      this.ui.requestSave();
      return;
    }
    if (target?.kind === "chest") {
      this.removeChest(target.id);
      this.ui.requestSave();
    }
    if (target?.kind === "gather") {
      this.gatherSprites.get(target.id)?.destroy();
      this.gatherSprites.delete(target.id);
      this.ui.requestSave();
    }
  }

  private createAmbience(): void {
    const ambience = this.session.zone.ambience;
    const config = {
      village: { color: 0xe8d8a0, count: 5, radius: 1.2, drift: 10, alpha: 0.1 },
      forest: { color: 0xa8e8a0, count: 8, radius: 1.4, drift: 14, alpha: 0.11 },
      marsh: { color: 0x9fe8a0, count: 10, radius: 1.8, drift: 8, alpha: 0.09 },
      dungeon: { color: 0xc9b8e8, count: 7, radius: 1.2, drift: 6, alpha: 0.08 },
      frost: { color: 0xd8f0ff, count: 12, radius: 1.5, drift: 18, alpha: 0.14 },
      throne: { color: 0xffb070, count: 9, radius: 1.4, drift: 12, alpha: 0.12 },
    }[ambience];
    const zone = this.session.zone;
    for (let i = 0; i < config.count; i += 1) {
      const x = Math.random() * zone.width * zone.tileWidth;
      const y = Math.random() * zone.height * zone.tileHeight;
      const dot = this.add.circle(x, y, config.radius + Math.random(), config.color, config.alpha).setDepth(-2);
      this.tweens.add({
        targets: dot,
        y: y - config.drift - Math.random() * 12,
        alpha: { from: config.alpha, to: 0.02 },
        duration: 2200 + Math.random() * 2600,
        repeat: -1,
        yoyo: true,
        ease: "Sine.easeInOut",
        delay: Math.random() * 1800,
      });
    }
  }

  update(time: number, delta: number): void {
    if (!this.session) return;
    this.syncKeybinds();
    if (this.ui.modalOpen) {
      this.ui.update(0);
      return;
    }
    const pad = this.readGamepad();
    if (pad.menu) {
      this.ui.openPanel("settings");
      return;
    }
    if (!this.pointerMoved) {
      const facing = this.facingVector(this.session.facing);
      this.aim = { x: this.session.save.x + facing.x * 120, y: this.session.save.y + facing.y * 120 };
    } else {
      const pointer = this.input.activePointer;
      const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      this.aim = { x: point.x, y: point.y };
    }
    if (pad.aimX !== 0 || pad.aimY !== 0) {
      const len = Math.hypot(pad.aimX, pad.aimY) || 1;
      this.aim = { x: this.session.save.x + (pad.aimX / len) * 160, y: this.session.save.y + (pad.aimY / len) * 160 };
    }

    const touch = this.ui.touchVector;
    const left = this.keys.LEFT.isDown || this.isDown("left") || touch.x < -0.25 || pad.moveX < -0.25;
    const right = this.keys.RIGHT.isDown || this.isDown("right") || touch.x > 0.25 || pad.moveX > 0.25;
    const up = this.keys.UP.isDown || this.isDown("up") || touch.y < -0.25 || pad.moveY < -0.25;
    const down = this.keys.DOWN.isDown || this.isDown("down") || touch.y > 0.25 || pad.moveY > 0.25;
    const moveX = Math.max(-1, Math.min(1, (right ? 1 : 0) - (left ? 1 : 0) + (Math.abs(touch.x) > 0.25 ? touch.x : 0) + (Math.abs(pad.moveX) > 0.25 ? pad.moveX : 0)));
    const moveY = Math.max(-1, Math.min(1, (down ? 1 : 0) - (up ? 1 : 0) + (Math.abs(touch.y) > 0.25 ? touch.y : 0) + (Math.abs(pad.moveY) > 0.25 ? pad.moveY : 0)));
    if (this.justDown("dodge") || pad.dodge) {
      this.session.dodge(moveX, moveY);
      this.handleSimEvents(this.session.drainEvents());
    }

    // Hit pause: for a moment after a heavy hit, freeze the simulation so the impact lands.
    this.hitPauseLeft = Math.max(0, this.hitPauseLeft - delta / 1000);
    if (this.hitPauseLeft <= 0) {
      const events = this.session.step(Math.min(delta / 1000, 0.05), {
        moveX,
        moveY,
        aimX: this.aim.x,
        aimY: this.aim.y,
      });
      this.handleSimEvents(events);
    }

    if (!this.session.dead) {
      if (this.isDown("attack") || pad.attack || (this.input.activePointer.isDown && this.pointerMoved)) this.cast("basic");
      if (Phaser.Input.Keyboard.JustDown(this.keys.ONE)) this.castSlot(0);
      if (Phaser.Input.Keyboard.JustDown(this.keys.TWO)) this.castSlot(1);
      if (Phaser.Input.Keyboard.JustDown(this.keys.THREE)) this.castSlot(2);
      if (Phaser.Input.Keyboard.JustDown(this.keys.FOUR)) this.castSlot(3);
      if (Phaser.Input.Keyboard.JustDown(this.keys.FIVE)) this.castSlot(4);
      if (this.justDown("interact") || pad.interact) this.interact();
      if (pad.quick1) {
        this.session.useQuickSlot(0);
        this.handleSimEvents(this.session.drainEvents());
        this.ui.requestSave();
      }
      if (pad.quick2) {
        this.session.useQuickSlot(1);
        this.handleSimEvents(this.session.drainEvents());
        this.ui.requestSave();
      }
    }

    if (this.session.zone.id !== this.zoneId) {
      this.scene.restart({ session: this.session, ui: this.ui });
      return;
    }

    this.syncEntities();
    this.renderFloorEffects(time);
    this.ui.update(delta / 1000);
  }

  private handleSimEvents(events: SimEvent[]): void {
    const preferences = loadPreferences();
    for (const event of events) {
      switch (event.type) {
        case "damage":
          if (preferences.showDamage) {
            const color = event.target === "player" ? "#ff8f8f" : event.crit ? "#ffd76a" : DAMAGE_TEXT_COLORS[event.damageType] ?? "#fff0cc";
            this.floatText(event.x, event.y - 12, `-${Math.round(event.amount)}${event.crit ? "!" : ""}`, color, event.crit ? 11 : 9);
          }
          if (event.target === "player" && preferences.screenShake && !preferences.reducedMotion) {
            this.cameras.main.shake(90, Math.min(0.004, event.amount / 30_000));
          }
          if (event.target === "player" && !preferences.reducedMotion) {
            this.player.setTint(0xff5555);
            this.time.delayedCall(120, () => this.player.clearTint());
          }
          if (event.source === "hatchling" && event.target === "monster") {
            this.burst(event.x, event.y, 0x8ef0a0, 9, 1.4);
            if (!preferences.reducedMotion) {
              const ring = this.add.circle(event.x, event.y, 6).setStrokeStyle(2, 0x8ef0a0, 0.9).setDepth(event.y + 1);
              ring.setFillStyle(0x000000, 0);
              this.tweens.add({ targets: ring, radius: 34, alpha: 0, duration: 600, onComplete: () => ring.destroy() });
            }
          }
          if (!preferences.reducedMotion && (event.crit || event.target === "player")) {
            this.hitPauseLeft = Math.max(this.hitPauseLeft, event.crit ? 0.07 : 0.04);
          }
          this.flashMonster(event.x, event.y);
          this.burst(event.x, event.y, Phaser.Display.Color.HexStringToColor(damageColor(event.damageType)).color, 4, 0.6);
          break;
        case "heal":
          if (preferences.showDamage) this.floatText(event.x, event.y - 12, `+${Math.round(event.amount)}`, "#8ef0a0", 9);
          this.healSparkle(event.x, event.y);
          break;
        case "dodge":
          this.floatText(event.x, event.y - 18, "DODGE", "#9ecbff", 8);
          this.burst(event.x, event.y, 0x7fd4ff);
          break;
        case "immune":
          this.floatText(event.x, event.y - 18, "IMMUNE", "#9ecbff", 8);
          break;
        case "death":
          if (event.who === "monster") this.burst(event.x, event.y, 0xb24a4a);
          break;
        case "cast":
          this.playCastVfx(event, preferences);
          break;
        case "levelup":
          this.floatText(this.session.save.x, this.session.save.y - 24, "LEVEL UP", "#ffe27a", 12);
          this.burst(this.session.save.x, this.session.save.y, 0xe8c05a);
          break;
        case "respawn":
          if (!preferences.reducedMotion) this.cameras.main.flash(260, 232, 192, 90);
          break;
        case "zone":
          this.cameras.main.fadeOut(160, 10, 8, 14);
          break;
        default:
          break;
      }
    }
    this.ui.handleEvents(events);
  }

  private removeChest(id: string): void {
    const sprite = this.chestSprites.get(id);
    if (sprite) {
      this.burst(sprite.x, sprite.y, 0xffd76a);
      sprite.destroy();
      this.chestSprites.delete(id);
    }
  }

  private syncEntities(): void {
    this.updateNpcQuestMarks();
    const session = this.session;
    const save = session.save;
    const playerFrame = session.moving ? Math.floor(session.animationTime * 9) % 4 : 0;
    this.player.setPosition(save.x, save.y);
    this.player.setFrame(charFrame(session.classInfo.sprite, session.facing, playerFrame));
    this.player.setDepth(save.y);
    this.player.setAlpha(session.dead ? 0.25 : 1);
    this.updateGearIcon();
    this.playerShadow.setPosition(save.x, save.y + 12).setDepth(save.y - 1).setAlpha(session.dead ? 0.12 : 0.32);
    this.updateBuffGlow(session.buffs.length > 0 && !session.dead);

    const activeMonsters = new Set<string>();
    for (const monster of session.monsters) {
      let sprite = this.monsterSprites.get(monster.uid);
      if (!sprite) {
        this.spawnMonster(monster);
        sprite = this.monsterSprites.get(monster.uid);
      }
      if (!sprite) continue;
      const def = MONSTERS[monster.defId];
      const dead = monster.state === "dead";
      sprite.setVisible(!dead);
      if (dead) continue;
      activeMonsters.add(monster.uid);
      sprite.setPosition(monster.x, monster.y);
      sprite.setDepth(monster.y);
      this.monsterOutlines.get(monster.uid)?.setPosition(monster.x, monster.y).setDepth(monster.y - 0.5).setFrame(monsterFrame(def?.sprite ?? "slime", Math.floor(this.time.now / 180) + (def?.boss ? 0 : 1))).setFlipX(monster.facing < 0);
      sprite.setFrame(monsterFrame(def?.sprite ?? "slime", Math.floor(this.time.now / 180) + (def?.boss ? 0 : 1)));
      sprite.setFlipX(monster.facing < 0);
      if (monster.statuses.some((status) => status.kind === "poison")) sprite.setTint(0x9fe8a0);
      else if (monster.statuses.some((status) => status.kind === "burn")) sprite.setTint(0xffb070);
      else if (monster.statuses.some((status) => status.kind === "slow")) sprite.setTint(0x9ecbff);
      else if (monster.statuses.some((status) => status.kind === "stun")) sprite.setTint(0xaaaaaa);
      else if (monster.elite === "swift") sprite.setTint(0xffe27a);
      else if (monster.elite === "armored") sprite.setTint(0x9ecbff);
      else if (monster.elite === "venomous") sprite.setTint(0x9fe8a0);
      else if (monster.elite === "volatile") sprite.setTint(0xff9a6a);
      else sprite.clearTint();
      this.updateStatusMarkers(monster.uid, monster.x, monster.y, monster.statuses.map((status) => status.kind));
    }
    for (const [uid, sprite] of this.monsterSprites) {
      const dead = !activeMonsters.has(uid) && session.monsters.find((m) => m.uid === uid)?.state === "dead";
      if (dead) sprite.setVisible(false);
      this.monsterOutlines.get(uid)?.setVisible(!dead);
    }

    const activePets = new Set<string>();
    for (const pet of session.pets) {
      activePets.add(pet.uid);
      this.spawnPet(pet.uid, pet.kind);
      const sprite = this.petSprites.get(pet.uid);
      if (!sprite) continue;
      sprite.setPosition(pet.x, pet.y);
      sprite.setDepth(pet.y);
      sprite.setFrame(monsterFrame(pet.kind === "skeleton" ? "skeleton" : pet.kind === "wolf" ? "wolf" : "familiar", Math.floor(this.time.now / 160)));
    }
    for (const [uid, sprite] of this.petSprites) {
      if (!activePets.has(uid)) {
        sprite.destroy();
        this.petSprites.delete(uid);
      }
    }

    // The saved egg companion follows the player: a drawn egg, then a hatchling once hatched.
    const companion = this.session.save.companion;
    if (companion && !this.eggFollower) {
      this.eggFollower = this.add.container(0, 0).setDepth(500);
      const shell = this.add.ellipse(0, 0, 18, 23, 0xf5e6b8, 1).setStrokeStyle(2, 0x8a6a2a);
      const spotA = this.add.ellipse(-3, -4, 4, 4, 0xc9a86a, 0.9);
      const spotB = this.add.ellipse(4, 3, 3, 3, 0xc9a86a, 0.9);
      this.eggFollower.add([shell, spotA, spotB]);
      this.eggFollower.setData("kind", "egg");
    }
    if (!companion && this.eggFollower) {
      this.eggFollower.destroy();
      this.eggFollower = undefined;
    }
    if (companion && this.eggFollower) {
      const bob = Math.sin(this.time.now / 300) * 2;
      if (companion.hatched && this.eggFollower.getData("kind") === "egg") {
        // Swap the egg for a small hatchling.
        this.eggFollower.removeAll(true);
        const species = PET_SPECIES.find((s) => s.id === companion.species) ?? PET_SPECIES[0];
        const body = this.add.ellipse(0, 0, 14, 12, species.color, 1).setStrokeStyle(1, 0x000000);
        const eyeL = this.add.circle(-3, -2, 1.4, 0x1a1a1a);
        const eyeR = this.add.circle(3, -2, 1.4, 0x1a1a1a);
        const label = this.add.text(0, -14, species.name, { fontSize: "13px", color: "#ffffff", stroke: "#000000", strokeThickness: 3 }).setOrigin(0.5, 1);
        this.eggFollower.add([body, eyeL, eyeR, label]);
        this.eggFollower.setData("kind", "hatchling");
      }
      this.eggFollower.setPosition(save.x - 22, save.y + 4 + bob).setDepth(save.y);
    }

    const activeLoot = new Set<string>();
    for (const drop of session.loot) {
      activeLoot.add(drop.uid);
      let entry = this.lootSprites.get(drop.uid);
      if (!entry) {
        const def = getItem(drop.itemId);
        const glow = this.add.circle(drop.x, drop.y + 3, 8, 0xffd76a, 0.18).setDepth(drop.y - 1);
        const icon = this.add.sprite(drop.x, drop.y, "items", itemIcon(def.icon)).setDepth(drop.y);
        this.tweens.add({ targets: icon, y: drop.y - 3, duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        this.tweens.add({ targets: glow, alpha: { from: 0.1, to: 0.32 }, duration: 700, yoyo: true, repeat: -1 });
        entry = { icon, glow };
        this.lootSprites.set(drop.uid, entry);
      }
    }
    for (const [uid, entry] of this.lootSprites) {
      if (!activeLoot.has(uid)) {
        entry.icon.destroy();
        entry.glow.destroy();
        this.lootSprites.delete(uid);
      }
    }
  }

  private renderFloorEffects(time: number): void {
    const g = this.floorFx;
    g.clear();
    for (const portal of this.session.zone.portals) {
      g.fillStyle(0xd9b45a, 0.05);
      g.fillCircle(portal.x + portal.w / 2, portal.y + portal.h / 2, 20 + Math.sin(time / 350) * 3);
    }
    for (const trap of this.session.traps) {
      if (!trap.armed) continue;
      g.fillStyle(0xff7a4a, 0.08);
      g.fillCircle(trap.x, trap.y, trap.radius);
      g.lineStyle(1, 0xff9a6a, 0.3);
      g.strokeCircle(trap.x, trap.y, trap.radius);
    }
    for (const telegraph of this.session.telegraphs) {
      const progress = 1 - Math.max(0, telegraph.remaining) / Math.max(0.001, telegraph.total);
      const fillColor = telegraph.kind === "boss" ? 0xd94a4a : 0xe08a3a;
      const shape = telegraph.shape ?? "ring";
      const angle = telegraph.angle ?? 0;
      g.fillStyle(fillColor, 0.1 + progress * 0.2);
      g.lineStyle(2, 0xff6a6a, 0.9);
      if (shape === "line") {
        const half = 14;
        const len = telegraph.radius;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const ox = telegraph.x;
        const oy = telegraph.y;
        const px = -sin * half;
        const py = cos * half;
        const corners = [
          new Phaser.Math.Vector2(ox + px, oy + py),
          new Phaser.Math.Vector2(ox + cos * len + px, oy + sin * len + py),
          new Phaser.Math.Vector2(ox + cos * len - px, oy + sin * len - py),
          new Phaser.Math.Vector2(ox - px, oy - py),
        ];
        g.fillPoints(corners, true);
        g.strokePoints(corners, true);
      } else if (shape === "cone") {
        const spread = Math.PI / 2;
        g.beginPath();
        g.moveTo(telegraph.x, telegraph.y);
        g.arc(telegraph.x, telegraph.y, telegraph.radius, angle - spread / 2, angle + spread / 2, false);
        g.closePath();
        g.fillPath();
        g.strokePath();
      } else if (shape === "spot") {
        g.fillCircle(telegraph.x, telegraph.y, telegraph.radius);
        g.strokeCircle(telegraph.x, telegraph.y, telegraph.radius);
      } else {
        g.fillCircle(telegraph.x, telegraph.y, telegraph.radius);
        g.strokeCircle(telegraph.x, telegraph.y, telegraph.radius);
      }
      g.lineStyle(3, 0xffd0a0, 0.5);
      g.beginPath();
      g.arc(telegraph.x, telegraph.y, telegraph.radius - 2, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
      g.strokePath();
    }
    for (const projectile of this.session.projectiles) {
      this.drawProjectile(g, projectile);
    }

    const bars = this.barFx;
    bars.clear();
    for (const monster of this.session.monsters) {
      if (monster.state === "dead") continue;
      const def = MONSTERS[monster.defId];
      if (!def || monster.hp >= def.maxHp) continue;
      const boss = def.boss;
      const width = boss ? 64 : 26;
      const y = monster.y - (boss ? 44 : 24);
      bars.fillStyle(0x08060c, 0.85);
      bars.fillRect(monster.x - width / 2 - 1, y - 1, width + 2, boss ? 5 : 4);
      bars.fillStyle(boss ? 0xd95454 : 0xc04a4a, 1);
      bars.fillRect(monster.x - width / 2, y, width * Math.max(0, monster.hp / def.maxHp), boss ? 3 : 2);
    }
  }

  /** Short body motion on cast: a lunge for melee classes, a raised-arm pulse for casters. */
  private castMotion(classId: string, y: number, angle: number, preferences: GamePreferences): void {
    if (preferences.reducedMotion || !this.player) return;
    const sprite = this.player;
    const casters = ["mage", "priest", "necromancer", "druid", "summoner", "spellblade"];
    this.tweens.killTweensOf(sprite);
    if (casters.includes(classId)) {
      // Raised-arm pulse: a quick lift and settle, held a little longer.
      this.tweens.add({
        targets: sprite,
        y: y - 6,
        scaleX: 1.08,
        scaleY: 1.08,
        duration: 140,
        yoyo: true,
        hold: 220,
        ease: "Sine.easeOut",
      });
    } else {
      // Melee lunge: a short step toward the target and back.
      const dx = Math.cos(angle) * 6;
      const dy = Math.sin(angle) * 6;
      this.tweens.add({
        targets: sprite,
        x: sprite.x + dx,
        y: sprite.y + dy,
        duration: 90,
        yoyo: true,
        ease: "Quad.easeOut",
      });
    }
  }

  private floatText(x: number, y: number, text: string, color: string, size: number): void {
    const label = this.floatPool.pop() ?? this.add
      .text(0, 0, "", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: `${size}px`,
        color,
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setDepth(9400);
    this.tweens.killTweensOf(label);
    label
      .setText(text)
      .setColor(color)
      .setFontSize(size)
      .setPosition(x, y)
      .setAlpha(1)
      .setVisible(true);
    this.tweens.add({
      targets: label,
      y: y - 20,
      alpha: 0,
      duration: 720,
      ease: "Cubic.easeOut",
      onComplete: () => {
        label.setVisible(false);
        this.floatPool.push(label);
      },
    });
  }

  private playCastVfx(event: Extract<SimEvent, { type: "cast" }>, preferences: GamePreferences): void {
    const ability =
      event.abilityId === "basic"
        ? this.session.classInfo.basic
        : this.session.classInfo.abilities.find((entry) => entry.id === event.abilityId);
    if (!ability) return;
    const vfx: VfxDescriptor = resolveAbilityVfx(this.session.save.classId, ability, event.color);
    const color = this.hexColor(vfx.color);
    const accent = this.hexColor(vfx.accent);
    const angle = Math.atan2(event.targetY - event.y, event.targetX - event.x);
    if (!preferences.reducedMotion && preferences.screenShake && vfx.shake > 0) {
      this.cameras.main.shake(80, vfx.shake);
    }
    if (this.session.save.classId === "ranger" && event.abilityId === "basic") {
      this.bowDrawFx(event.x, event.y, angle, color, vfx.duration);
    }
    this.castMotion(this.session.save.classId, event.y, angle, preferences);
    switch (vfx.style) {
      case "slash":
        this.arcFx(event.x, event.y, angle, color, 34, 4, 0.95, vfx.duration);
        this.burst(event.targetX, event.targetY, color, 3, 0.6);
        break;
      case "cleave":
        this.arcFx(event.x, event.y, angle, color, 50, 6, 1.35, vfx.duration);
        this.arcFx(event.x, event.y, angle, 0xffffff, 42, 2, 1.1, vfx.duration - 40);
        this.burst(event.targetX, event.targetY, color, 6, 0.9);
        break;
      case "thrust":
        this.thrustFx(event.x, event.y, event.targetX, event.targetY, color, accent, vfx.duration);
        break;
      case "bash":
        this.ringFx(event.targetX, event.targetY, 20, color, 3, vfx.duration);
        this.arcFx(event.x, event.y, angle, accent, 24, 5, 1.1, vfx.duration);
        break;
      case "flurry":
        this.flurryFx(event.targetX, event.targetY, color, angle, vfx.duration);
        break;
      case "fist":
        this.ringFx(event.targetX, event.targetY, 14, color, 2, vfx.duration);
        this.burst(event.targetX, event.targetY, color, 5, 0.8);
        break;
      case "arrow":
        this.arcFx(event.x, event.y, angle, accent, 20, 3, 1.2, 180);
        this.burst(event.x + Math.cos(angle) * 14, event.y + Math.sin(angle) * 14, color, 2, 0.3);
        break;
      case "arrowVolley":
        for (let i = -1; i <= 1; i += 1) {
          this.arcFx(event.x, event.y, angle + i * 0.16, accent, 22, 2, 1.1, 220);
        }
        break;
      case "gun":
      case "gunVolley":
        this.muzzleFx(event.x, event.y, angle, color, vfx.style === "gunVolley" ? 3 : 1);
        break;
      case "bolt":
        this.orbFx(event.x, event.y, color, accent, 10);
        this.burst(event.x + Math.cos(angle) * 16, event.y + Math.sin(angle) * 16, color, 3, 0.35);
        break;
      case "beam":
        this.beamFx(event.x, event.y, event.targetX, event.targetY, color, vfx.duration);
        break;
      case "nova":
        this.novaFx(event.x, event.y, vfx.radius, color, accent, vfx.duration);
        break;
      case "rune":
      case "trap":
        this.runeFx(event.targetX, event.targetY, vfx.radius, color, accent, vfx.duration);
        break;
      case "meteor":
        this.meteorFx(event.targetX, event.targetY, vfx.radius, color, vfx.duration);
        break;
      case "rain":
        this.rainFx(event.targetX, event.targetY, vfx.radius, color, vfx.duration);
        break;
      case "summon":
        this.summonFx(event.x, event.y, color, accent, vfx.duration);
        break;
      case "dash":
        this.dashFx(event.x, event.y, event.targetX, event.targetY, color, accent, vfx.duration);
        break;
      case "heal":
        this.healSparkle(event.x, event.y);
        this.ringFx(event.x, event.y, 24, color, 2, vfx.duration);
        break;
      case "shield":
        this.bubbleFx(event.x, event.y, color, accent, vfx.duration);
        break;
      case "buff":
        this.buffFx(event.x, event.y, color, accent, vfx.duration);
        break;
      case "smoke":
        this.smokeFx(event.x, event.y, color, vfx.duration);
        break;
      case "mark":
        this.markFx(event.targetX, event.targetY, color, accent, vfx.duration);
        break;
      case "cone":
        this.coneFx(event.x, event.y, event.targetX, event.targetY, color, vfx.duration);
        break;
      case "chain":
        this.chainFx(event.x, event.y, event.targetX, event.targetY, color, vfx.duration);
        break;
      default:
        this.burst(event.x, event.y, color, 5, 0.8);
        break;
    }
    // Extra sparks for ultimates and the six strongest normal skills, in the skill's own colour.
    const sparkSkills = ["dragon_breath", "infernal_strike", "holy_nova", "elemental_burst", "meteor", "ground_slam"];
    if (ability.signature === true || sparkSkills.includes(ability.id)) {
      this.burst(event.targetX, event.targetY, color, 10, 1.6);
    }
  }

  private drawProjectile(g: Phaser.GameObjects.Graphics, projectile: ProjectileInstance): void {
    const style = projectileStyle(projectile.abilityId, this.session.save.classId);
    const color = this.hexColor(projectile.color);
    const length = Math.hypot(projectile.dirX, projectile.dirY) || 1;
    const dx = projectile.dirX / length;
    const dy = projectile.dirY / length;
    const tail = 14 + projectile.radius * 1.5;
    const tx = projectile.x - dx * tail;
    const ty = projectile.y - dy * tail;
    if (style === "arrow" || style === "arrowVolley") {
      g.lineStyle(2, color, 0.35);
      g.lineBetween(tx, ty, projectile.x, projectile.y);
      g.lineStyle(1, 0xffffff, 0.9);
      g.lineBetween(tx, ty, projectile.x, projectile.y);
      g.fillStyle(color, 1);
      g.fillTriangle(
        projectile.x + dx * 6,
        projectile.y + dy * 6,
        projectile.x - dy * 3,
        projectile.y + dx * 3,
        projectile.x + dy * 3,
        projectile.y - dx * 3,
      );
    } else if (style === "gun" || style === "gunVolley") {
      g.lineStyle(1, color, 0.55);
      g.lineBetween(projectile.x - dx * 24, projectile.y - dy * 24, projectile.x, projectile.y);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(projectile.x, projectile.y, Math.max(1.5, projectile.radius * 0.5));
    } else if (style === "thrust") {
      g.lineStyle(3, color, 0.8);
      g.lineBetween(tx, ty, projectile.x, projectile.y);
      g.lineStyle(1, 0xffffff, 0.9);
      g.lineBetween(tx, ty, projectile.x, projectile.y);
      g.fillStyle(color, 1);
      g.fillTriangle(
        projectile.x + dx * 7,
        projectile.y + dy * 7,
        projectile.x - dy * 4,
        projectile.y + dx * 4,
        projectile.x + dy * 4,
        projectile.y - dx * 4,
      );
    } else {
      g.fillStyle(color, 0.16);
      g.fillCircle(projectile.x, projectile.y, projectile.radius + 7);
      g.lineStyle(2, color, 0.45);
      g.lineBetween(tx, ty, projectile.x, projectile.y);
      g.fillStyle(color, 1);
      g.fillCircle(projectile.x, projectile.y, projectile.radius);
      g.fillStyle(0xffffff, 0.8);
      g.fillCircle(projectile.x - dx * 2, projectile.y - dy * 2, Math.max(1, projectile.radius * 0.4));
    }
  }

  private bowDrawFx(x: number, y: number, angle: number, color: number, duration: number): void {
    // A bow arc in front of the Ranger that bends back as it is drawn,
    // then a thin arrow that flies out along the aim line.
    const bow = this.add.graphics().setPosition(x, y).setDepth(y + 3);
    bow.rotation = angle;
    bow.lineStyle(3, color, 1);
    bow.beginPath();
    bow.arc(0, 0, 18, -Math.PI / 2.6, Math.PI / 2.6, false);
    bow.strokePath();
    bow.lineStyle(1, 0xffffff, 0.7);
    bow.beginPath();
    bow.moveTo(18 * Math.cos(-Math.PI / 2.6), 18 * Math.sin(-Math.PI / 2.6));
    bow.lineTo(4, 0);
    bow.lineTo(18 * Math.cos(Math.PI / 2.6), 18 * Math.sin(Math.PI / 2.6));
    bow.strokePath();
    this.tweens.add({
      targets: bow,
      alpha: 0,
      duration: Math.max(120, duration * 0.6),
      onComplete: () => bow.destroy(),
    });

    const arrow = this.add.graphics().setPosition(x, y).setDepth(y + 4);
    arrow.rotation = angle;
    arrow.lineStyle(2, color, 1);
    arrow.beginPath();
    arrow.moveTo(0, 0);
    arrow.lineTo(26, 0);
    arrow.strokePath();
    this.tweens.add({
      targets: arrow,
      x: x + Math.cos(angle) * 60,
      y: y + Math.sin(angle) * 60,
      alpha: 0,
      duration: Math.max(160, duration),
      onComplete: () => arrow.destroy(),
    });
  }

  private arcFx(x: number, y: number, angle: number, color: number, radius: number, width: number, spread: number, duration: number): void {
    const g = this.add.graphics().setPosition(x, y).setDepth(y + 3);
    g.rotation = angle;
    g.lineStyle(width, color, 0.9);
    g.beginPath();
    g.arc(0, 0, radius, -spread, spread);
    g.strokePath();
    g.lineStyle(Math.max(1, width - 2), 0xffffff, 0.75);
    g.beginPath();
    g.arc(0, 0, radius - 2, -spread * 0.8, spread * 0.8);
    g.strokePath();
    this.tweens.add({
      targets: g,
      alpha: 0,
      scaleX: 1.25,
      scaleY: 1.25,
      duration,
      ease: "Cubic.easeOut",
      onComplete: () => g.destroy(),
    });
  }

  private lineFx(x1: number, y1: number, x2: number, y2: number, color: number, width: number, alpha: number, duration: number): void {
    const g = this.add.graphics().setDepth(Math.max(y1, y2) + 3);
    g.lineStyle(width, color, alpha);
    g.lineBetween(x1, y1, x2, y2);
    this.tweens.add({ targets: g, alpha: 0, duration, ease: "Cubic.easeOut", onComplete: () => g.destroy() });
  }

  private ringFx(x: number, y: number, radius: number, color: number, width: number, duration: number): void {
    const ring = this.add.circle(x, y, radius, color, 0.08).setDepth(y + 3);
    ring.setStrokeStyle(width, color, 0.9);
    this.tweens.add({
      targets: ring,
      scale: 1.45,
      alpha: 0,
      duration,
      ease: "Cubic.easeOut",
      onComplete: () => ring.destroy(),
    });
  }

  private thrustFx(x: number, y: number, tx: number, ty: number, color: number, accent: number, duration: number): void {
    const angle = Math.atan2(ty - y, tx - x);
    const sx = x + Math.cos(angle) * 10;
    const sy = y + Math.sin(angle) * 10;
    this.lineFx(sx, sy, tx, ty, color, 5, 0.8, duration);
    this.lineFx(sx, sy, tx, ty, 0xffffff, 2, 0.95, duration - 40);
    this.burst(tx, ty, accent, 4, 0.6);
  }

  private flurryFx(x: number, y: number, color: number, angle: number, duration: number): void {
    for (let i = 0; i < 3; i += 1) {
      this.time.delayedCall(i * 55, () => {
        this.arcFx(x, y, angle + i * 2.1, color, 20, 3, 1.2, 180);
      });
    }
    this.burst(x, y, color, 5, 0.7);
    this.ringFx(x, y, 18, color, 2, duration);
  }

  private muzzleFx(x: number, y: number, angle: number, color: number, count: number): void {
    for (let i = 0; i < count; i += 1) {
      const spread = (i - (count - 1) / 2) * 0.08;
      const a = angle + spread;
      const mx = x + Math.cos(a) * 26;
      const my = y + Math.sin(a) * 26;
      this.lineFx(x, y, mx, my, color, 2, 0.9, 120);
      this.burst(mx, my, color, 3, 0.35);
    }
  }

  private orbFx(x: number, y: number, color: number, accent: number, radius: number): void {
    const orb = this.add.circle(x, y, radius, color, 0.35).setDepth(y + 4);
    orb.setStrokeStyle(2, accent, 0.9);
    this.tweens.add({
      targets: orb,
      scale: 1.7,
      alpha: 0,
      duration: 260,
      ease: "Cubic.easeOut",
      onComplete: () => orb.destroy(),
    });
  }

  private beamFx(x1: number, y1: number, x2: number, y2: number, color: number, duration: number): void {
    this.lineFx(x1, y1, x2, y2, color, 7, 0.25, duration);
    this.lineFx(x1, y1, x2, y2, color, 3, 0.85, duration);
    this.lineFx(x1, y1, x2, y2, 0xffffff, 1, 0.9, duration - 60);
    this.burst(x2, y2, color, 5, 0.7);
  }

  private novaFx(x: number, y: number, radius: number, color: number, accent: number, duration: number): void {
    this.ringFx(x, y, radius, color, 4, duration);
    this.ringFx(x, y, radius * 0.6, accent, 2, duration - 80);
    const flash = this.add.circle(x, y, radius * 0.45, color, 0.22).setDepth(y + 2);
    this.tweens.add({
      targets: flash,
      scale: 2.2,
      alpha: 0,
      duration,
      ease: "Cubic.easeOut",
      onComplete: () => flash.destroy(),
    });
    this.burst(x, y, color, 10, 1.4);
  }

  private runeFx(x: number, y: number, radius: number, color: number, accent: number, duration: number): void {
    const g = this.add.graphics().setPosition(x, y).setDepth(y + 2);
    g.lineStyle(2, color, 0.8);
    g.strokeCircle(0, 0, radius);
    g.lineStyle(1, accent, 0.7);
    g.strokeCircle(0, 0, radius * 0.68);
    for (let i = 0; i < 4; i += 1) {
      const a = (Math.PI / 2) * i + Math.PI / 4;
      g.lineBetween(Math.cos(a) * radius * 0.25, Math.sin(a) * radius * 0.25, Math.cos(a) * radius * 0.9, Math.sin(a) * radius * 0.9);
    }
    this.tweens.add({
      targets: g,
      angle: 45,
      alpha: 0,
      scaleX: 1.2,
      scaleY: 1.2,
      duration,
      ease: "Cubic.easeOut",
      onComplete: () => g.destroy(),
    });
    this.burst(x, y, color, 4, 0.5);
  }

  private meteorFx(x: number, y: number, radius: number, color: number, duration: number): void {
    this.lineFx(x - 16, y - 120, x, y, color, 8, 0.35, 180);
    this.lineFx(x - 16, y - 120, x, y, 0xffffff, 2, 0.8, 160);
    this.time.delayedCall(120, () => {
      this.ringFx(x, y, radius, color, 5, duration);
      this.burst(x, y, color, 14, 1.6);
    });
  }

  private rainFx(x: number, y: number, radius: number, color: number, duration: number): void {
    this.ringFx(x, y, radius, color, 2, duration);
    for (let i = 0; i < 7; i += 1) {
      const ox = (Math.random() * 2 - 1) * radius * 0.8;
      const oy = (Math.random() * 2 - 1) * radius * 0.6;
      this.time.delayedCall(i * 60, () => {
        this.lineFx(x + ox, y + oy - 26, x + ox, y + oy, color, 2, 0.75, 180);
      });
    }
  }

  private summonFx(x: number, y: number, color: number, accent: number, duration: number): void {
    this.runeFx(x, y, 28, color, accent, duration);
    for (let i = 0; i < 8; i += 1) {
      const a = (Math.PI * 2 * i) / 8;
      const dot = this.add.circle(x + Math.cos(a) * 18, y + Math.sin(a) * 10, 2, color, 0.9).setDepth(y + 4);
      this.tweens.add({
        targets: dot,
        y: y - 28 - Math.random() * 18,
        alpha: 0,
        duration: 420 + i * 30,
        ease: "Cubic.easeOut",
        onComplete: () => dot.destroy(),
      });
    }
  }

  private dashFx(x1: number, y1: number, x2: number, y2: number, color: number, accent: number, duration: number): void {
    this.lineFx(x1, y1, x2, y2, accent, 6, 0.25, duration);
    for (let i = 1; i <= 3; i += 1) {
      const t = i / 4;
      const ghost = this.add.circle(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, 7, color, 0.18).setDepth(y1 + 2);
      this.tweens.add({ targets: ghost, alpha: 0, scale: 1.6, duration: 220 + i * 40, onComplete: () => ghost.destroy() });
    }
    this.burst(x2, y2, color, 4, 0.5);
  }

  private healSparkle(x: number, y: number): void {
    for (let i = 0; i < 6; i += 1) {
      const dot = this.add.circle(x + (Math.random() * 2 - 1) * 18, y + 6, 1.8, 0x8ef0a0, 0.9).setDepth(y + 5);
      this.tweens.add({
        targets: dot,
        y: y - 26 - Math.random() * 18,
        alpha: 0,
        duration: 480 + Math.random() * 220,
        ease: "Cubic.easeOut",
        onComplete: () => dot.destroy(),
      });
    }
  }

  private bubbleFx(x: number, y: number, color: number, accent: number, duration: number): void {
    const bubble = this.add.circle(x, y, 26, color, 0.1).setDepth(y + 3);
    bubble.setStrokeStyle(3, accent, 0.8);
    this.tweens.add({
      targets: bubble,
      scale: 1.25,
      alpha: 0,
      duration,
      ease: "Cubic.easeOut",
      onComplete: () => bubble.destroy(),
    });
    this.ringFx(x, y, 18, color, 2, duration - 80);
  }

  private buffFx(x: number, y: number, color: number, accent: number, duration: number): void {
    this.ringFx(x, y, 22, color, 3, duration);
    for (let i = 0; i < 5; i += 1) {
      const dot = this.add.circle(x + (Math.random() * 2 - 1) * 16, y + 8, 2, accent, 0.9).setDepth(y + 4);
      this.tweens.add({
        targets: dot,
        y: y - 24 - Math.random() * 16,
        alpha: 0,
        duration: 450 + i * 50,
        ease: "Cubic.easeOut",
        onComplete: () => dot.destroy(),
      });
    }
  }

  private smokeFx(x: number, y: number, color: number, duration: number): void {
    for (let i = 0; i < 5; i += 1) {
      const puff = this.add.circle(x + (Math.random() * 2 - 1) * 12, y + (Math.random() * 2 - 1) * 8, 6 + Math.random() * 5, color, 0.28).setDepth(y + 3);
      this.tweens.add({
        targets: puff,
        scale: 2.4,
        alpha: 0,
        x: puff.x + (Math.random() * 2 - 1) * 20,
        y: puff.y - 12 - Math.random() * 12,
        duration: duration + i * 40,
        ease: "Cubic.easeOut",
        onComplete: () => puff.destroy(),
      });
    }
  }

  private markFx(x: number, y: number, color: number, accent: number, duration: number): void {
    const g = this.add.graphics().setDepth(y + 3);
    g.lineStyle(2, accent, 0.9);
    g.strokeCircle(x, y, 18);
    g.lineBetween(x - 26, y, x - 8, y);
    g.lineBetween(x + 8, y, x + 26, y);
    g.lineBetween(x, y - 26, x, y - 8);
    g.lineBetween(x, y + 8, x, y + 26);
    g.lineStyle(1, color, 0.8);
    g.strokeCircle(x, y, 10);
    this.tweens.add({
      targets: g,
      angle: 90,
      alpha: 0,
      scaleX: 1.3,
      scaleY: 1.3,
      duration,
      ease: "Cubic.easeOut",
      onComplete: () => g.destroy(),
    });
  }

  private coneFx(x1: number, y1: number, x2: number, y2: number, color: number, duration: number): void {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const length = Math.max(60, Math.hypot(x2 - x1, y2 - y1));
    const spread = 0.42;
    const g = this.add.graphics().setDepth(Math.max(y1, y2) + 2);
    g.fillStyle(color, 0.18);
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x1 + Math.cos(angle - spread) * length, y1 + Math.sin(angle - spread) * length);
    g.lineTo(x1 + Math.cos(angle + spread) * length, y1 + Math.sin(angle + spread) * length);
    g.closePath();
    g.fillPath();
    g.lineStyle(2, color, 0.65);
    g.beginPath();
    g.arc(x1, y1, length, angle - spread, angle + spread);
    g.strokePath();
    this.tweens.add({ targets: g, alpha: 0, duration, ease: "Cubic.easeOut", onComplete: () => g.destroy() });
    this.burst(x1 + Math.cos(angle) * length * 0.7, y1 + Math.sin(angle) * length * 0.7, color, 7, 1.1);
  }

  private chainFx(x1: number, y1: number, x2: number, y2: number, color: number, duration: number): void {
    const g = this.add.graphics().setDepth(Math.max(y1, y2) + 3);
    g.lineStyle(3, color, 0.8);
    g.beginPath();
    g.moveTo(x1, y1);
    const steps = 4;
    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps;
      const jitter = i === steps ? 0 : (i % 2 === 0 ? 1 : -1) * 12;
      g.lineTo(x1 + (x2 - x1) * t + jitter, y1 + (y2 - y1) * t - jitter);
    }
    g.strokePath();
    g.lineStyle(1, 0xffffff, 0.9);
    g.beginPath();
    g.moveTo(x1, y1);
    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps;
      const jitter = i === steps ? 0 : (i % 2 === 0 ? 1 : -1) * 8;
      g.lineTo(x1 + (x2 - x1) * t + jitter, y1 + (y2 - y1) * t - jitter);
    }
    g.strokePath();
    this.tweens.add({ targets: g, alpha: 0, duration, ease: "Cubic.easeOut", onComplete: () => g.destroy() });
    this.burst(x2, y2, color, 5, 0.7);
  }

  private hexColor(value: string): number {
    return Phaser.Display.Color.HexStringToColor(value).color;
  }

  private burst(x: number, y: number, color: number, count = 7, spread = 1): void {
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const dot = this.burstPool.pop() ?? this.add.circle(x, y, 2, color, 0.95).setDepth(9300);
      this.tweens.killTweensOf(dot);
      dot
        .setPosition(x, y)
        .setRadius(2.6 + Math.random() * 2.2)
        .setFillStyle(color, 0.95)
        .setAlpha(1)
        .setVisible(true);
      this.tweens.add({
        targets: dot,
        x: x + Math.cos(angle) * (12 + Math.random() * 16) * spread,
        y: y + Math.sin(angle) * (10 + Math.random() * 14) * spread,
        alpha: 0,
        duration: 380 + Math.random() * 160,
        ease: "Cubic.easeOut",
        onComplete: () => {
          dot.setVisible(false);
          this.burstPool.push(dot);
        },
      });
    }
  }

  private flashMonster(x: number, y: number): void {
    let best: Phaser.GameObjects.Sprite | null = null;
    let bestDistance = 22;
    for (const [uid, sprite] of this.monsterSprites) {
      const monster = this.session.monsters.find((entry) => entry.uid === uid);
      if (!monster) continue;
      const distance = Math.hypot(monster.x - x, monster.y - y);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = sprite;
      }
    }
    if (!best) return;
    const target = best as Phaser.GameObjects.Sprite;
    target.setTintFill(0xffffff);
    this.time.delayedCall(70, () => {
      if (target.active) target.clearTint();
    });
  }

  private facingVector(direction: Direction): { x: number; y: number } {
    if (direction === "left") return { x: -1, y: 0 };
    if (direction === "right") return { x: 1, y: 0 };
    if (direction === "up") return { x: 0, y: -1 };
    return { x: 0, y: 1 };
  }
}
