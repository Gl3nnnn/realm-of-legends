import Phaser from "phaser";
import { BootScene } from "./BootScene";
import { WorldScene } from "./WorldScene";

export function createGameConfig(parent: string): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: 1280,
    height: 720,
    backgroundColor: "#11101a",
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: "100%",
      height: "100%",
    },
    render: {
      antialias: false,
      pixelArt: true,
    },
    scene: [BootScene, WorldScene],
  };
}
