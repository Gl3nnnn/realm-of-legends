import { ZONES } from "../generated/world-data";
import { getMonster } from "../data/monsters";
import { RESPAWN_SECONDS } from "../constants";
import { writeDiary } from "./diary";
import type { GameSession } from "./GameSession";
import type { MonsterInstance } from "../types";

// Player death: the hero falls, pets and projectiles clear, and the respawn timer starts.
export function killPlayer(session: GameSession, _source: string, killerId = ""): void {
  if (session.dead) return;
  session.dead = true;
  session.moving = false;
  session.respawnTimer = RESPAWN_SECONDS;
  session.pets = [];
  session.projectiles = [];
  session.save.stats.deaths += 1;
  session.resetKillStreak();
  session.breakCombo();
  // A hardcore hero does not come back: the wall keeps the name and the save is gone.
  if (session.save.hardcore) {
    session.emit({ type: "hardcore-end", entry: session.memorialEntry(killerId) });
  }
  // A run in the Hollow Ring ends with the hero: the ring clears and starts again from wave one.
  session.arenaActive = false;
  session.arenaWaveNumber = 0;
  session.arenaAlive = 0;
  // The Descent run also ends here, but the shards and deepest wave already earned stay.
  if (session.descentActive) session.leaveDescent();
  // The thing that did it becomes the hero's rival: a grudge worth settling later.
  session.pickRivalOnDeath(killerId);
  // A gauntlet run dies with the hero, but the rounds already cleared stay paid.
  if (session.gauntletActive) session.leaveGauntlet();
  // A bounty streak only counts while the hero keeps their feet, so falling resets it.
  session.save.bountyStreak = 0;
  writeDiary(session.save, "death", `Fell in ${session.zone.name} to ${_source || "the dark"}.`);
  session.emit({ type: "death", who: "player", x: session.save.x, y: session.save.y });
  if (session.save.hardcore) {
    session.emit({ type: "log", text: "Hardcore: this hero is gone for good. Their name goes on the memorial wall in the village.", tone: "bad" });
  } else {
    session.emit({ type: "log", text: "You have fallen. You will wake in Eldoria Village in a few seconds, fully healed. You lose no gold, items or experience.", tone: "bad" });
  }
}

// Player respawn: back in Eldoria Village, fully healed, with no loss.
export function respawn(session: GameSession): void {
  // A hardcore hero never respawns: the shell takes them off the roster instead.
  if (session.save.hardcore) return;
  const zone = ZONES.village;
  session.save.zone = "village";
  session.save.x = zone.spawn.x;
  session.save.y = zone.spawn.y;
  session.unlockWaypoint("village");
  const stats = session.stats;
  session.save.hp = stats.maxHp;
  session.save.resource = session.classDef.resource === "rage" ? 0 : stats.maxResource;
  session.dead = false;
  session.shield = 0;
  session.dodgeCooldown = 0;
  session.dodgeTimer = 0;
  session.invulnerable = 0;
  session.perfectDodgeTimer = 0;
  session.potionCooldown = 0;
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
