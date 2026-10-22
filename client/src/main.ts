import Phaser from "phaser";
import { GameSession } from "@realm/core";
import { registerSW } from "virtual:pwa-register";
import "./styles/main.css";
import { Sfx } from "./audio/sfx";
import { createGameConfig } from "./game/config";
import { SaveRepository } from "./persistence/db";
import { UIManager } from "./ui/UIManager";

const repo = new SaveRepository();
const sfx = new Sfx();
const game = new Phaser.Game(createGameConfig("game"));

const ui = new UIManager({
  repo,
  sfx,
  onPlay: async (save) => {
    const session = new GameSession(save);
    if (game.scene.isActive("world")) game.scene.stop("world");
    game.scene.start("world", { session, ui });
    ui.attachSession(session);
  },
  onExitToMenu: () => {
    if (game.scene.isActive("world")) game.scene.stop("world");
  },
});

game.events.once("boot-ready", () => {
  game.scene.stop("boot");
  void ui.showCharacterSelect();
});

game.events.once("boot-error", () => {
  ui.toast("The game failed to load. Refresh the page to try again.", "bad");
});

if (import.meta.env.PROD) {
  registerSW({ immediate: true });
}
