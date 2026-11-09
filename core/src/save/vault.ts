import { STASH_CAPACITIES, STASH_SIZE } from "../constants";
import { ITEMS } from "../data/items";
import type { CharacterSave, ItemStack } from "../types";

/**
 * The shared vault.
 *
 * Every hero on this device used to carry its own vault, which meant a player
 * with two characters had to move gear by hand through the backpack. Now the
 * vault belongs to the *player*: whichever hero is open, the same squares are
 * there, holding the same things.
 *
 * The save file still keeps one copy of the vault (on every hero, so a browser
 * that only has one hero behaves exactly as before). The game takes every copy
 * it finds across all heroes and hands the played hero a single vault built
 * from them, so no gear is ever lost by choosing the wrong character.
 */

/** How many squares one hero's save can use, from the tier it has bought. */
export function stashCapacityFor(tier: number): number {
  const index = Math.max(0, Math.min(STASH_CAPACITIES.length - 1, Math.floor(tier)));
  return STASH_CAPACITIES[index] ?? STASH_CAPACITIES[0];
}

/** A blank vault, all squares empty. */
export function emptyVault(): (ItemStack | null)[] {
  return Array.from({ length: STASH_SIZE }, () => null);
}

function stackOrder(stack: ItemStack): string {
  const def = ITEMS[stack.itemId];
  const typeOrder = def
    ? ["weapon", "armor", "helm", "boots", "trinket", "consumable", "material"].indexOf(def.type)
    : 99;
  // Gear with its own uid sorts last so plain materials fill the first squares.
  return `${stack.instance ? 1 : 0}:${typeOrder}:${stack.itemId}`;
}

/** How many squares of a vault a hero's tier actually uses. */
function usedSquares(save: CharacterSave): (ItemStack | null)[] {
  return (save.stash ?? []).slice(0, stashCapacityFor(save.stashTier));
}

/** A stable fingerprint of one hero's vault, so copies can be compared. */
function vaultKey(save: CharacterSave): string {
  return JSON.stringify(usedSquares(save));
}

/**
 * One vault built from every hero's copy.
 *
 * Every hero normally holds the very same vault (the game writes it to all of
 * them on save), and then the answer is simply that copy - adding them together
 * would duplicate every item. Copies only differ on the first launch after the
 * vault became shared, and then they are merged once so nothing is lost.
 */
export function mergeVaults(saves: readonly CharacterSave[]): { stash: (ItemStack | null)[]; stashTier: number } {
  const tier = saves.reduce((best, save) => Math.max(best, Math.floor(save.stashTier ?? 0)), 0);
  const stashTier = Math.max(0, Math.min(STASH_CAPACITIES.length - 1, tier));
  if (saves.length === 0) return { stash: emptyVault(), stashTier };

  const keys = new Set(saves.map(vaultKey));
  if (keys.size === 1) {
    // The copies already agree: hand back the newest one, untouched.
    const newest = saves.reduce((latest, save) => (save.updatedAt > latest.updatedAt ? save : latest), saves[0]!);
    const stash = emptyVault();
    usedSquares(newest).forEach((stack, index) => {
      stash[index] = stack ? { ...stack } : null;
    });
    return { stash, stashTier };
  }

  const collected: ItemStack[] = [];
  for (const save of saves) {
    for (const stack of usedSquares(save)) {
      if (!stack || stack.qty <= 0) continue;
      if (!stack.instance) {
        const match = collected.find((entry) => !entry.instance && entry.itemId === stack.itemId);
        if (match) {
          match.qty += stack.qty;
          continue;
        }
      }
      collected.push({
        itemId: stack.itemId,
        qty: stack.qty,
        instance: stack.instance ? { ...stack.instance, affixes: [...stack.instance.affixes], gems: stack.instance.gems ? [...stack.instance.gems] : undefined } : undefined,
      });
    }
  }

  collected.sort((a, b) => stackOrder(a).localeCompare(stackOrder(b)));

  const stash = emptyVault();
  let square = 0;
  for (const stack of collected) {
    if (square >= stash.length) break;
    if (stack.instance) {
      stash[square] = { itemId: stack.itemId, qty: 1, instance: stack.instance };
      square += 1;
      continue;
    }
    const limit = ITEMS[stack.itemId]?.stack ?? 1;
    let remaining = stack.qty;
    while (remaining > 0 && square < stash.length) {
      const add = Math.min(remaining, limit);
      stash[square] = { itemId: stack.itemId, qty: add };
      remaining -= add;
      square += 1;
    }
  }

  return { stash, stashTier: Math.max(0, Math.min(STASH_CAPACITIES.length - 1, stashTier)) };
}
