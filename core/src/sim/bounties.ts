import { MONSTERS } from "../data/monsters";
import { getZone, ZONES } from "../generated/world-data";
import type { CharacterSave, ZoneId } from "../types";

/**
 * Bounties are three small, always-fresh jobs pinned to the journal: kill a handful
 * of a monster and come back for a purse of gold and experience. They are picked from
 * the clock and the hero's level, so there is never a moment with nothing to chase,
 * and there is no extra save data beyond the progress counters.
 */

export interface BountyDef {
  /** Stable id: the block and the slot it was rolled in. */
  key: string;
  monsterId: string;
  monsterName: string;
  need: number;
  gold: number;
  xp: number;
  zone: ZoneId;
  zoneName: string;
  level: number;
}

export interface BountyState {
  key: string;
  progress: number;
  claimed: boolean;
}

/** A new set of bounties is posted every ten minutes of play. */
export const BOUNTY_BLOCK_SECONDS = 600;

function hash(text: string): number {
  let value = 0x9e3779b9;
  for (let i = 0; i < text.length; i += 1) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 0x85ebca6b) >>> 0;
  }
  return value >>> 0;
}

/** Monsters worth hunting right now: near the hero's level and not a boss or a summon. */
function huntable(save: CharacterSave): string[] {
  const ids: string[] = [];
  for (const monster of Object.values(MONSTERS)) {
    if (monster.boss) continue;
    if (monster.level > save.level + 3) continue;
    if (monster.level < save.level - 8) continue;
    ids.push(monster.id);
  }
  // A hero who has out-levelled everything still needs bounties, so fall back to all monsters.
  if (ids.length === 0) return Object.values(MONSTERS).filter((monster) => !monster.boss).map((monster) => monster.id);
  return ids;
}

function zoneOf(monsterId: string): { id: ZoneId; name: string } {
  const zone = Object.values(ZONES).find((candidate) => candidate.monsterSpawns.some((spawn) => spawn.id === monsterId));
  return zone ? { id: zone.id as ZoneId, name: zone.name } : { id: "forest", name: getZone("forest").name };
}

/** The three bounties on the board for this hero right now. */
export function currentBounties(save: CharacterSave): BountyDef[] {
  const block = Math.max(0, Math.floor(save.playtime / BOUNTY_BLOCK_SECONDS));
  const pool = huntable(save);
  if (pool.length === 0) return [];
  const out: BountyDef[] = [];
  const used = new Set<string>();
  for (let slot = 0; slot < 3; slot += 1) {
    const key = `b${block}_${slot}`;
    let monsterId = pool[hash(`${save.id}:${key}`) % pool.length]!;
    // Two slots should not ask for the same monster, so walk forward until it is new.
    let guard = 0;
    while (used.has(monsterId) && guard < pool.length) {
      monsterId = pool[(pool.indexOf(monsterId) + 1) % pool.length]!;
      guard += 1;
    }
    used.add(monsterId);
    const monster = MONSTERS[monsterId];
    if (!monster) continue;
    const zone = zoneOf(monsterId);
    const need = monster.level >= 8 ? 4 : monster.level >= 4 ? 6 : 8;
    const base = 12 + monster.level * 6;
    out.push({
      key,
      monsterId,
      monsterName: monster.name,
      need,
      gold: Math.round(base * (1 + slot * 0.15)),
      xp: Math.round(base * 1.5 * (1 + slot * 0.15)),
      zone: zone.id,
      zoneName: zone.name,
      level: monster.level,
    });
  }
  return out;
}

/** The saved progress for one bounty, if the hero has started it. */
export function bountyProgress(save: CharacterSave, key: string): number {
  return save.bounties.find((entry) => entry.key === key)?.progress ?? 0;
}

export function bountyClaimed(save: CharacterSave, key: string): boolean {
  return save.bounties.find((entry) => entry.key === key)?.claimed ?? false;
}

/** Count one kill toward every open bounty that wants it. Returns the keys that changed. */
export function addBountyKill(save: CharacterSave, monsterId: string, open: BountyDef[]): string[] {
  const touched: string[] = [];
  for (const bounty of open) {
    if (bounty.monsterId !== monsterId) continue;
    const existing = save.bounties.find((entry) => entry.key === bounty.key);
    if (existing?.claimed) continue;
    if (!existing) save.bounties.push({ key: bounty.key, progress: 1, claimed: false });
    else existing.progress = Math.min(bounty.need, existing.progress + 1);
    touched.push(bounty.key);
  }
  // Old blocks are dropped so the save does not grow forever.
  if (save.bounties.length > 12) {
    const keep = new Set(open.map((bounty) => bounty.key));
    save.bounties = save.bounties.filter((entry) => keep.has(entry.key));
  }
  return touched;
}

export function markBountyClaimed(save: CharacterSave, key: string, need: number): boolean {
  const existing = save.bounties.find((entry) => entry.key === key);
  if (!existing) {
    save.bounties.push({ key, progress: need, claimed: true });
    return true;
  }
  if (existing.claimed) return false;
  existing.claimed = true;
  return true;
}

/** How many bounties are finished and waiting for the hero to collect. */
export function readyBounties(save: CharacterSave, open: BountyDef[]): number {
  return open.filter((bounty) => bountyProgress(save, bounty.key) >= bounty.need && !bountyClaimed(save, bounty.key)).length;
}
