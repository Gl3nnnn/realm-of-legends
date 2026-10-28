import { ZONES } from "../generated/world-data";
import { getMonster } from "../data/monsters";
import { RESPAWN_SECONDS } from "../constants";
import type { GameSession } from "./GameSession";
import type { MonsterInstance } from "../types";

// Player death: the hero falls, pets and projectiles clear, and the respawn timer starts.
export function killPlayer(session: GameSession, _source: string): void {
  if (session.dead) return;
  session.dead = true;
  session.moving = false;
  session.respawnTimer = RESPAWN_SECONDS;
  session.pets = [];
  session.projectiles = [];
  session.emit({ type: "death", who: "player", x: session.save.x, y: session.save.y });
  session.emit({ type: "log", text: "You have fallen. You will wake in Eldoria Village in a few seconds, fully healed. You lose no gold, items or experience.", tone: "bad" });
}

// Player respawn: back in Eldoria Village, fully healed, with no loss.
export function respawn(session: GameSession): void {
  const zone = ZONES.village;
  session.save.zone = "village";
  session.save.x = zone.spawn.x;
  session.save.y = zone.spawn.y;
  const stats = session.stats;
  session.save.hp = stats.maxHp;
  session.save.resource = session.classDef.resource === "rage" ? 0 : stats.maxResource;
  session.dead = false;
  session.shield = 0;
  session.loadZone();
  session.emit({ type: "respawn" });
  session.emit({ type: "zone", zone: "village" });
  session.emit({ type: "log", text: "Elara's light pulls you back. You wake in Eldoria Village.", tone: "good" });
}

// Monster respawn: the monster returns to its spawn point at full health.
export function respawnMonster(_session: GameSession, monster: MonsterInstance): void {
  const def = getMonster(monster.defId);
  monster.x = monster.spawnX;
  monster.y = monster.spawnY;
  monster.hp = monster.maxHp ?? def.maxHp;
  monster.state = "idle";
  monster.attackTimer = 0;
  monster.statuses = [];
  monster.respawnTimer = 0;
}
