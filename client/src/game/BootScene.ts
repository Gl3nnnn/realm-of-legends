import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  preload(): void {
    this.load.setBaseURL(import.meta.env.BASE_URL);
    const progress = document.getElementById("boot-progress");
    this.load.on("progress", (value: number) => {
      if (progress) progress.textContent = `${Math.round(value * 100)}%`;
    });
    this.load.on("loaderror", (file: Phaser.Loader.File) => {
      console.error("Failed to load asset", file.key);
      if (progress) progress.textContent = "Load failed";
      this.game.events.emit("boot-error");
    });
    this.load.spritesheet("tileset", "assets/tilesets/eldoria.png", { frameWidth: 16, frameHeight: 16 });
    for (const zone of ["forest", "dungeon", "marsh", "frost", "throne"]) {
      this.load.spritesheet(`tileset-${zone}`, `assets/tilesets/${zone}.png`, { frameWidth: 16, frameHeight: 16 });
    }
    this.load.spritesheet("characters", "assets/characters.png", { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet("monsters", "assets/monsters.png", { frameWidth: 32, frameHeight: 32 });
    this.load.image("portraits", "assets/portraits.png");
    this.load.spritesheet("items", "assets/items.png", { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet("abilities", "assets/abilities.png", { frameWidth: 16, frameHeight: 16 });
    this.load.tilemapTiledJSON("map-village", "assets/maps/village.json");
    this.load.tilemapTiledJSON("map-forest", "assets/maps/forest.json");
    this.load.tilemapTiledJSON("map-dungeon", "assets/maps/dungeon.json");
    this.load.tilemapTiledJSON("map-marsh", "assets/maps/marsh.json");
    this.load.tilemapTiledJSON("map-frost", "assets/maps/frost.json");
    this.load.tilemapTiledJSON("map-throne", "assets/maps/throne.json");
  }

  async create(): Promise<void> {
    try {
      await document.fonts.ready;
    } catch {
      /* fonts are optional */
    }
    // Hold the loading screen briefly so the bar and percentage can be seen.
    await new Promise((resolve) => setTimeout(resolve, 1800));
    this.game.events.emit("boot-ready");
  }
}
