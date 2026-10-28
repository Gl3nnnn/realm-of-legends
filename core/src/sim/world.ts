// World actions: portals (travel), chests and gather nodes.
// Each function takes the game session as its first argument, so the
// session's saved data and helpers stay in one place.
import { ITEMS } from "../data/items";
import { QUESTS } from "../data/quests";
import { ZONES } from "../generated/world-data";
import type { GameSession } from "./GameSession";
import type { ItemStack, PortalDef } from "../types";

export function travel(session: GameSession, portal: PortalDef): void {
  session.save.zone = portal.targetZone;
  session.save.x = portal.targetX;
  session.save.y = portal.targetY;
  session.loadZone();
  session.emit({ type: "zone", zone: session.save.zone });
  session.emit({ type: "log", text: `Entered ${ZONES[session.save.zone].name}.`, tone: "info" });
  for (const state of session.save.quests) {
    if (state.completed) continue;
    const quest = QUESTS[state.id];
    if (!quest) continue;
    quest.objectives.forEach((objective, i) => {
      if (objective.kind === "visit" && objective.zone === session.save.zone) state.progress[i] = 1;
      if (objective.kind === "explore" && objective.zones.includes(session.save.zone)) {
        const explored = state.exploredZones ?? [];
        if (!explored.includes(session.save.zone)) {
          state.exploredZones = [...explored, session.save.zone];
          state.progress[i] = Math.min(objective.zones.length, new Set(state.exploredZones.filter((zone) => objective.zones.includes(zone))).size);
        }
      }
    });
    session.refreshQuestCompletion(state);
  }
}

export function openChest(session: GameSession, id: string): void {
  const chest = session.zone.chests.find((c) => c.id === id);
  if (!chest) return;
  if (session.save.openedChests.includes(id)) return;
  session.save.openedChests.push(id);
  const gold = session.save.zone === "dungeon" ? session.rng.int(90, 170) : session.rng.int(45, 90);
  const gained = session.gainGold(gold);
  const items: ItemStack[] = session.save.zone === "dungeon"
    ? [{ itemId: "greater_health_potion", qty: 1 }, { itemId: "iron_ore", qty: session.rng.int(1, 3) }]
    : [{ itemId: "health_potion", qty: 2 }, { itemId: "herb", qty: session.rng.int(1, 2) }];
  if (session.rng.chance(0.35)) items.push({ itemId: "gemstone", qty: 1 });
  for (const item of items) {
    const leftover = session.addItem(item.itemId, item.qty);
    if (leftover > 0) {
      session.loot.push({ uid: session.nextUid("l"), itemId: item.itemId, qty: leftover, x: chest.x, y: chest.y, ttl: 120 });
    }
    session.emit({ type: "loot", itemId: item.itemId, qty: item.qty - leftover, x: chest.x, y: chest.y });
  }
  session.emit({ type: "log", text: `Opened a chest: ${gained} gold and supplies.`, tone: "good" });
}

export function gatherNode(session: GameSession, id: string): void {
  const node = session.zone.gatherNodes.find((n) => n.id === id);
  if (!node || session.gathered.has(id) || (session.save.gatherCooldowns[`${session.zone.id}:${id}`] ?? 0) > session.save.playtime) return;
  const leftover = session.addItem(node.itemId, 1);
  if (leftover > 0) {
    session.emit({ type: "log", text: "Your inventory is full.", tone: "bad" });
    return;
  }
  session.gathered.add(id);
  session.save.gatherCooldowns[`${session.zone.id}:${id}`] = session.save.playtime + 180;
  const def = ITEMS[node.itemId];
  session.emit({ type: "pickup", itemId: node.itemId, qty: 1 });
  session.emit({ type: "log", text: `Gathered ${def?.name ?? "an herb"}.`, tone: "good" });
}
