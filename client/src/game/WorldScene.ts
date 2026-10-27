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
  type SimEvent,
} from "@realm/core";
import type { UIManager } from "../ui/UIManager";
import { loadPreferences, type KeybindAction } from "../ui/preferences";

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
  private playerShadow!: Phaser.GameObjects.Ellipse;
  private floorFx!: Phaser.GameObjects.Graphics;
  private barFx!: Phaser.GameObjects.Graphics;
  private monsterSprites = new Map<string, Phaser.GameObjects.Sprite>();
  private petSprites = new Map<string, Phaser.GameObjects.Sprite>();
  private lootSprites = new Map<string, { icon: Phaser.GameObjects.Sprite; glow: Phaser.GameObjects.Arc }>();
  private chestSprites = new Map<string, Phaser.GameObjects.Image>();
  private gatherSprites = new Map<string, Phaser.GameObjects.Container>();
  private aim = { x: 0, y: 0 };
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
          ? "#111a24"
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
    this.cameras.main.setZoom(2);
    this.cameras.main.roundPixels = true;
    this.cameras.main.fadeIn(260, 10, 8, 14);

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
    const tileset = map.addTilesetImage("eldoria", "tileset", 16, 16, 0, 0);
    if (!tileset) throw new Error("Tileset could not be loaded.");
    const ground = map.createLayer("ground", tileset, 0, 0);
    const decor = map.createLayer("decor", tileset, 0, 0);
    if (!ground || !decor) throw new Error("Map layers are missing.");
    ground.setDepth(-10);
    decor.setDepth(-5);

    for (const chest of zone.chests) {
      const tx = Math.floor(chest.x / zone.tileWidth);
      const ty = Math.floor(chest.y / zone.tileHeight);
      decor.removeTileAt(tx, ty);
    }
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

  private createPlayer(): void {
    const save = this.session.save;
    const sprite = this.session.classInfo.sprite;
    this.playerShadow = this.add.ellipse(save.x, save.y + 12, 20, 7, 0x000000, 0.32).setDepth(save.y - 1);
    this.player = this.add
      .sprite(save.x, save.y, "characters", charFrame(sprite, "down", 0))
      .setDepth(save.y)
      .setOrigin(0.5, 0.6);
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
      village: { color: 0xe8d8a0, count: 8, radius: 1.2, drift: 10, alpha: 0.16 },
      forest: { color: 0xa8e8a0, count: 14, radius: 1.4, drift: 14, alpha: 0.18 },
      marsh: { color: 0x9fe8a0, count: 18, radius: 1.8, drift: 8, alpha: 0.14 },
      dungeon: { color: 0xc9b8e8, count: 12, radius: 1.2, drift: 6, alpha: 0.12 },
      frost: { color: 0xd8f0ff, count: 22, radius: 1.5, drift: 18, alpha: 0.24 },
      throne: { color: 0xffb070, count: 16, radius: 1.4, drift: 12, alpha: 0.2 },
    }[ambience];
    const zone = this.session.zone;
    for (let i = 0; i < config.count; i += 1) {
      const x = Math.random() * zone.width * zone.tileWidth;
      const y = Math.random() * zone.height * zone.tileHeight;
      const dot = this.add.circle(x, y, config.radius + Math.random(), config.color, config.alpha).setDepth(9100);
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

    const events = this.session.step(Math.min(delta / 1000, 0.05), {
      moveX,
      moveY,
      aimX: this.aim.x,
      aimY: this.aim.y,
    });
    this.handleSimEvents(events);

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
          this.flashMonster(event.x, event.y);
          break;
        case "heal":
          if (preferences.showDamage) this.floatText(event.x, event.y - 12, `+${Math.round(event.amount)}`, "#8ef0a0", 9);
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
          this.castFlash(event.x, event.y, event.color);
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
    const session = this.session;
    const save = session.save;
    const playerFrame = session.moving ? Math.floor(session.animationTime * 9) % 4 : 0;
    this.player.setPosition(save.x, save.y);
    this.player.setFrame(charFrame(session.classInfo.sprite, session.facing, playerFrame));
    this.player.setDepth(save.y);
    this.player.setAlpha(session.dead ? 0.25 : 1);
    this.playerShadow.setPosition(save.x, save.y + 12).setDepth(save.y - 1).setAlpha(session.dead ? 0.12 : 0.32);

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
    }
    for (const [uid, sprite] of this.monsterSprites) {
      if (!activeMonsters.has(uid) && session.monsters.find((m) => m.uid === uid)?.state === "dead") sprite.setVisible(false);
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
      g.fillStyle(telegraph.kind === "boss" ? 0xd94a4a : 0xe08a3a, 0.1 + progress * 0.2);
      g.fillCircle(telegraph.x, telegraph.y, telegraph.radius);
      g.lineStyle(2, 0xff6a6a, 0.9);
      g.strokeCircle(telegraph.x, telegraph.y, telegraph.radius);
      g.lineStyle(3, 0xffd0a0, 0.5);
      g.beginPath();
      g.arc(telegraph.x, telegraph.y, telegraph.radius - 2, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
      g.strokePath();
    }
    for (const projectile of this.session.projectiles) {
      const color = Phaser.Display.Color.HexStringToColor(projectile.color).color;
      g.fillStyle(color, 0.2);
      g.fillCircle(projectile.x, projectile.y, projectile.radius + 5);
      g.fillStyle(color, 1);
      g.fillCircle(projectile.x, projectile.y, projectile.radius);
      g.fillStyle(0xffffff, 0.7);
      g.fillCircle(projectile.x - projectile.dirX * 4, projectile.y - projectile.dirY * 4, Math.max(1, projectile.radius * 0.4));
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

  private castFlash(x: number, y: number, color: string): void {
    const tint = Phaser.Display.Color.HexStringToColor(color).color;
    const circle = this.add.circle(x, y, 16, tint, 0.3).setDepth(y + 1);
    this.tweens.add({ targets: circle, scale: 2.2, alpha: 0, duration: 300, ease: "Cubic.easeOut", onComplete: () => circle.destroy() });
  }

  private burst(x: number, y: number, color: number): void {
    for (let i = 0; i < 7; i += 1) {
      const angle = (Math.PI * 2 * i) / 7 + Math.random() * 0.4;
      const dot = this.burstPool.pop() ?? this.add.circle(x, y, 2, color, 0.95).setDepth(9300);
      this.tweens.killTweensOf(dot);
      dot
        .setPosition(x, y)
        .setRadius(1.6 + Math.random() * 1.4)
        .setFillStyle(color, 0.95)
        .setAlpha(1)
        .setVisible(true);
      this.tweens.add({
        targets: dot,
        x: x + Math.cos(angle) * (12 + Math.random() * 16),
        y: y + Math.sin(angle) * (10 + Math.random() * 14),
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
